"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DrawerActions, FormDrawer } from "@/components/ui/form-drawer";
import { SelectControl, SwitchControl, TextFieldControl } from "@/components/ui/fields";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useAnnouncer } from "@/components/ui/announcer";
import {
  productos as productosApi,
  promociones as promocionesApi,
  servicios as serviciosApi,
} from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  AlcancePromocion,
  Producto,
  Promocion,
  PromocionInput,
  Servicio,
  TipoPromocion,
} from "@/lib/api/types";
import { opcionesVisibles, useCatalogoRemoto } from "@/lib/hooks/use-catalogo-remoto";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import {
  ALCANCE_PROMOCION_LABEL,
  TIPO_PROMOCION_LABEL,
  validarPromocion,
  type PromocionFormState,
} from "@/lib/promociones";
import { sumarDias } from "@/lib/proformas";
import { firstError, formatMoney, parseDecimal } from "@/lib/utils";

function toFormState(promocion: Promocion | null, hoy: string): PromocionFormState {
  if (!promocion) {
    return {
      nombre: "",
      tipo: "PORCENTAJE",
      valor: "",
      aplica_a: "CUALQUIERA",
      servicio_id: "",
      producto_id: "",
      vigente_desde: hoy,
      vigente_hasta: sumarDias(hoy, 30),
      activa: true,
    };
  }

  return {
    nombre: promocion.nombre,
    tipo: promocion.tipo,
    valor: promocion.valor === null ? "" : String(promocion.valor),
    aplica_a: promocion.aplica_a,
    servicio_id: promocion.servicio_id ? String(promocion.servicio_id) : "",
    producto_id: promocion.producto_id ? String(promocion.producto_id) : "",
    vigente_desde: promocion.vigente_desde,
    vigente_hasta: promocion.vigente_hasta,
    activa: promocion.activa,
  };
}

export function toPromocionInput(form: PromocionFormState): PromocionInput {
  return {
    nombre: form.nombre.trim(),
    tipo: form.tipo,
    valor: form.tipo === "DOS_POR_UNO" ? null : parseDecimal(form.valor),
    aplica_a: form.aplica_a,
    servicio_id: form.aplica_a === "SERVICIO" ? Number(form.servicio_id) : null,
    producto_id: form.aplica_a === "PRODUCTO" ? Number(form.producto_id) : null,
    vigente_desde: form.vigente_desde,
    vigente_hasta: form.vigente_hasta,
    activa: form.activa,
  };
}

const TIPOS = (Object.keys(TIPO_PROMOCION_LABEL) as TipoPromocion[]).map((value) => ({
  value,
  label: TIPO_PROMOCION_LABEL[value],
}));

const ALCANCES = (Object.keys(ALCANCE_PROMOCION_LABEL) as AlcancePromocion[]).map((value) => ({
  value,
  label: ALCANCE_PROMOCION_LABEL[value],
}));

type Opcion = { id: number; nombre: string };

function conGuardado(lista: readonly Opcion[], guardado: Opcion | null | undefined): Opcion[] {
  const opciones = lista.map(({ id, nombre }) => ({ id, nombre }));

  return guardado && !opciones.some((opcion) => opcion.id === guardado.id)
    ? [...opciones, guardado]
    : opciones;
}

interface PromocionFormDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  promocion: Promocion | null;
  servicios: Servicio[];
  productos: Producto[];
  /** Hoy en Bolivia (`YYYY-MM-DD`), calculado en el servidor. */
  hoy: string;
  onSaved: () => void;
}

export function PromocionFormDrawer({
  isOpen,
  onOpenChange,
  promocion,
  servicios,
  productos,
  hoy,
  onSaved,
}: PromocionFormDrawerProps) {
  const [initial] = useState<PromocionFormState>(() => toFormState(promocion, hoy));
  const [form, setForm] = useState<PromocionFormState>(initial);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { announce } = useAnnouncer();
  const { formRef, fieldErrors, fieldErrorCount, message, applyFieldErrors, reset } = useFormErrors();

  // La promoción guardada puede apuntar a un servicio o producto que ya no
  // está entre los activos: se agrega para que el selector lo muestre.
  const catalogoServicios = useCatalogoRemoto<Opcion>(
    conGuardado(servicios, promocion?.servicio),
    serviciosApi.buscar,
  );
  const catalogoProductos = useCatalogoRemoto<Opcion>(
    conGuardado(productos, promocion?.producto),
    productosApi.buscar,
  );

  const isDirty = JSON.stringify(initial) !== JSON.stringify(form);

  function update<K extends keyof PromocionFormState>(key: K, value: PromocionFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const errores = validarPromocion(form);

    if (Object.keys(errores).length > 0) {
      applyFieldErrors(errores, "Corrige los campos marcados en rojo y vuelve a guardar.");

      return;
    }

    setPending(true);
    reset();

    try {
      const payload = toPromocionInput(form);

      if (promocion) {
        await promocionesApi.update(promocion.id, payload);
      } else {
        await promocionesApi.create(payload);
      }

      announce(promocion ? "Promoción actualizada." : "Promoción creada.");
      onSaved();
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      applyFieldErrors(
        isApiError(caught) ? (caught.errors ?? {}) : {},
        apiErrorMessage(caught, promocion ? "No pudimos actualizar la promoción." : "No pudimos crear la promoción."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDrawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={promocion ? "Editar promoción" : "Nueva promoción"}
      description={
        promocion
          ? "Los cambios valen para las proformas nuevas. Las ya guardadas conservan la promoción con que se armaron."
          : "Se podrá elegir en las líneas de las proformas mientras esté activa y vigente."
      }
      onSubmit={onSubmit}
      isPending={pending}
      error={message}
      fieldErrorCount={fieldErrorCount}
      isDirty={isDirty}
      formRef={formRef}
      size="lg"
      footer={
        <DrawerActions
          isPending={pending}
          onCancel={() => onOpenChange(false)}
          submitLabel={promocion ? "Guardar cambios" : "Crear promoción"}
        />
      }
    >
      <TextFieldControl
        name="nombre"
        label="Nombre"
        value={form.nombre}
        onChange={(value) => update("nombre", value)}
        error={firstError(fieldErrors, "nombre")}
        placeholder="Ej.: Mantenimiento de verano"
        isRequired
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectControl<TipoPromocion>
          name="tipo"
          label="Tipo"
          value={form.tipo}
          onChange={(value) => update("tipo", value)}
          options={TIPOS}
          error={firstError(fieldErrors, "tipo")}
          isRequired
        />

        {form.tipo === "DOS_POR_UNO" ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Valor</span>
            <p className="rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-muted">
              De cada 2 unidades se paga 1. Con 1 unidad no descuenta; con 3 se cobran 2.
            </p>
          </div>
        ) : (
          <TextFieldControl
            name="valor"
            label={form.tipo === "PORCENTAJE" ? "Porcentaje (%)" : "Monto (Bs)"}
            value={form.valor}
            onChange={(value) => update("valor", value)}
            error={firstError(fieldErrors, "valor")}
            inputMode="decimal"
            description={
              form.tipo === "PORCENTAJE"
                ? "De 1 a 100."
                : `Se resta una vez por línea, sin dejarla en negativo. Ej.: ${formatMoney(50)}.`
            }
            isRequired
          />
        )}
      </div>

      <SelectControl<AlcancePromocion>
        name="aplica_a"
        label="Se aplica a"
        value={form.aplica_a}
        onChange={(value) => update("aplica_a", value)}
        options={ALCANCES}
        error={firstError(fieldErrors, "aplica_a")}
        isRequired
      />

      {form.aplica_a === "SERVICIO" ? (
        <CatalogSelect
          name="servicio_id"
          label="Servicio"
          value={form.servicio_id}
          onChange={(value) => update("servicio_id", value)}
          options={opcionesVisibles(catalogoServicios.conocidos, catalogoServicios.resultado, form.servicio_id).map(
            (servicio) => ({ id: servicio.id, label: servicio.nombre }),
          )}
          onSearch={catalogoServicios.buscar}
          isLoading={catalogoServicios.cargando}
          error={firstError(fieldErrors, "servicio_id")}
          placeholder="Buscar servicio…"
          isRequired
        />
      ) : null}

      {form.aplica_a === "PRODUCTO" ? (
        <CatalogSelect
          name="producto_id"
          label="Producto"
          value={form.producto_id}
          onChange={(value) => update("producto_id", value)}
          options={opcionesVisibles(catalogoProductos.conocidos, catalogoProductos.resultado, form.producto_id).map(
            (producto) => ({ id: producto.id, label: producto.nombre }),
          )}
          onSearch={catalogoProductos.buscar}
          isLoading={catalogoProductos.cargando}
          error={firstError(fieldErrors, "producto_id")}
          placeholder="Buscar producto…"
          isRequired
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextFieldControl
          name="vigente_desde"
          label="Vigente desde"
          type="date"
          value={form.vigente_desde}
          onChange={(value) => update("vigente_desde", value)}
          error={firstError(fieldErrors, "vigente_desde")}
          isRequired
        />
        <TextFieldControl
          name="vigente_hasta"
          label="Vigente hasta"
          type="date"
          value={form.vigente_hasta}
          onChange={(value) => update("vigente_hasta", value)}
          error={firstError(fieldErrors, "vigente_hasta")}
          description="Incluye ese día."
          isRequired
        />
      </div>

      <div className="rounded-lg border border-border p-3">
        <SwitchControl
          name="activa"
          label="Promoción activa"
          isSelected={form.activa}
          onChange={(value) => update("activa", value)}
          description="Una promoción inactiva no se puede elegir en las proformas."
        />
      </div>
    </FormDrawer>
  );
}
