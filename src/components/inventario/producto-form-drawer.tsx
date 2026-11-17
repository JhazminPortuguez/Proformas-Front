"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DrawerActions, FormDrawer } from "@/components/ui/form-drawer";
import { SwitchControl, TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { productos as productosApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Producto } from "@/lib/api/types";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import {
  productoPayload,
  validarProducto,
  type ProductoBorrador,
} from "@/lib/inventario";
import { firstError, formatMoney, formatNumber, parseDecimal } from "@/lib/utils";

const VACIO: ProductoBorrador = {
  nombre: "",
  unidad_medida: "",
  precio_unitario: "",
  costo: "",
  stock_minimo: "",
  stock_inicial: "",
  activo: true,
};

function aBorrador(producto: Producto | null): ProductoBorrador {
  if (!producto) return VACIO;

  return {
    nombre: producto.nombre,
    unidad_medida: producto.unidad_medida ?? "",
    precio_unitario: String(producto.precio_unitario),
    costo: String(producto.costo_promedio),
    stock_minimo: String(producto.stock_minimo),
    stock_inicial: "",
    activo: producto.activo,
  };
}

function cambio(inicial: ProductoBorrador, actual: ProductoBorrador): boolean {
  return (Object.keys(inicial) as (keyof ProductoBorrador)[]).some(
    (clave) => inicial[clave] !== actual[clave],
  );
}

interface ProductoFormDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** `null` para un producto nuevo. */
  producto: Producto | null;
  onSaved?: () => void;
}

/**
 * Alta y edición de productos (solo admin). El stock no se escribe a mano:
 * al crear, el stock inicial se registra como una ENTRADA de inventario; al
 * editar, stock y costo cambian solo con entradas y ajustes.
 */
export function ProductoFormDrawer({
  isOpen,
  onOpenChange,
  producto,
  onSaved,
}: ProductoFormDrawerProps) {
  const esNuevo = producto === null;
  const [inicial] = useState<ProductoBorrador>(() => aBorrador(producto));
  const [form, setForm] = useState<ProductoBorrador>(inicial);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { announce } = useAnnouncer();
  const { formRef, fieldErrors, fieldErrorCount, message, applyFieldErrors, reset } =
    useFormErrors();

  function update<K extends keyof ProductoBorrador>(
    clave: K,
    valor: ProductoBorrador[K],
  ) {
    setForm((actual) => ({ ...actual, [clave]: valor }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errores = validarProducto(form, { esNuevo });

    if (Object.keys(errores).length > 0) {
      applyFieldErrors(errores, "Revisa los datos del producto.");

      return;
    }

    setPending(true);
    reset();

    try {
      if (producto) {
        await productosApi.update(producto.id, {
          nombre: form.nombre.trim(),
          unidad_medida: form.unidad_medida.trim() || null,
          precio_unitario: parseDecimal(form.precio_unitario),
          stock_minimo: form.stock_minimo.trim() ? parseDecimal(form.stock_minimo) : 0,
          activo: form.activo,
        });
        announce(`Producto ${form.nombre.trim()} actualizado.`);
      } else {
        await productosApi.create(productoPayload(form));
        announce(`Producto ${form.nombre.trim()} creado.`);
      }

      onSaved?.();
      onOpenChange(false);
      router.refresh();
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      applyFieldErrors(
        isApiError(caught) ? (caught.errors ?? {}) : {},
        apiErrorMessage(
          caught,
          producto ? "No pudimos actualizar el producto." : "No pudimos crear el producto.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  const unidad = form.unidad_medida.trim() || "unidades";

  return (
    <FormDrawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={producto ? "Editar producto" : "Nuevo producto"}
      description={
        producto
          ? "Actualiza nombre, unidad, precio de venta y stock mínimo. El stock y el costo cambian con entradas y ajustes."
          : "Agrega un material al inventario. Si indicas stock inicial, queda registrado como una entrada."
      }
      onSubmit={onSubmit}
      isPending={pending}
      error={message}
      fieldErrorCount={fieldErrorCount}
      isDirty={cambio(inicial, form)}
      formRef={formRef}
      size="md"
      footer={
        <DrawerActions
          isPending={pending}
          onCancel={() => onOpenChange(false)}
          submitLabel={producto ? "Guardar cambios" : "Crear producto"}
        />
      }
    >
      <TextFieldControl
        name="nombre"
        label="Nombre"
        value={form.nombre}
        onChange={(valor) => update("nombre", valor)}
        error={firstError(fieldErrors, "nombre")}
        isRequired
      />

      <TextFieldControl
        name="unidad_medida"
        label="Unidad de medida"
        value={form.unidad_medida}
        onChange={(valor) => update("unidad_medida", valor)}
        error={firstError(fieldErrors, "unidad_medida")}
        placeholder="metro, pza, rollo…"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextFieldControl
          name="precio_unitario"
          label="Precio de venta (Bs)"
          inputMode="decimal"
          value={form.precio_unitario}
          onChange={(valor) => update("precio_unitario", valor)}
          error={firstError(fieldErrors, "precio_unitario")}
          isRequired
        />

        {esNuevo ? (
          <TextFieldControl
            name="costo_promedio"
            label="Costo (Bs)"
            inputMode="decimal"
            value={form.costo}
            onChange={(valor) => update("costo", valor)}
            error={firstError(fieldErrors, "costo_promedio")}
            description="Costo unitario de compra; se usa para el stock inicial."
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Costo promedio</span>
            <div className="flex h-10 items-center rounded-lg border border-border bg-surface-secondary px-3 text-sm text-muted">
              {formatMoney(producto.costo_promedio)}
            </div>
            <span className="text-xs text-muted">Cambia con las entradas de inventario.</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextFieldControl
          name="stock_minimo"
          label="Stock mínimo"
          inputMode="decimal"
          value={form.stock_minimo}
          onChange={(valor) => update("stock_minimo", valor)}
          error={firstError(fieldErrors, "stock_minimo")}
          description="Con 0 no hay alerta de bajo stock."
        />

        {esNuevo ? (
          <TextFieldControl
            name="stock_actual"
            label="Stock inicial"
            inputMode="decimal"
            value={form.stock_inicial}
            onChange={(valor) => update("stock_inicial", valor)}
            error={firstError(fieldErrors, "stock_actual")}
            description={`Opcional. Se registra como entrada de ${unidad}.`}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Stock actual</span>
            <div className="flex h-10 items-center rounded-lg border border-border bg-surface-secondary px-3 text-sm text-muted">
              {formatNumber(producto.stock_actual)} {producto.unidad_medida}
            </div>
            <span className="text-xs text-muted">
              Usa “Registrar entrada” o “Ajustar stock”.
            </span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border p-3">
        <SwitchControl
          name="activo"
          label="Producto activo"
          isSelected={form.activo}
          onChange={(valor) => update("activo", valor)}
          description="Los productos inactivos no se ofrecen en proformas nuevas; su stock y su historial se conservan."
        />
      </div>
    </FormDrawer>
  );
}
