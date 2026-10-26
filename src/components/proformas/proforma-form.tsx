"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Package,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import { Alert, Button } from "@heroui/react";
import { CatalogSelect } from "@/components/ui/catalog-select";
import type { CatalogOption } from "@/components/ui/catalog-select";
import { TextAreaControl, TextFieldControl } from "@/components/ui/fields";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { PageHeader } from "@/components/ui/page-header";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { proformas as proformasApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  Cliente,
  ErroresValidacion,
  Proforma,
  ProformaInput,
  ProformaItem,
  ProformaItemInput,
  Producto,
  Servicio,
  TipoProformaItem,
} from "@/lib/api/types";
import {
  TIPO_ITEM_LABEL,
  compareDateOnly,
  computeProformaTotals,
  isValidDateOnly,
  parseCantidad,
} from "@/lib/proformas";
import { firstError, formatMoney, formatNumber, parseDecimal } from "@/lib/utils";
import { TotalsSummary } from "./totals-summary";

interface DraftItem {
  key: string;
  tipo: TipoProformaItem;
  catalogoId: string;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  unidad_medida: string;
}

interface FormState {
  clienteId: string;
  fecha_emision: string;
  fecha_validez: string;
  descuento: string;
  impuesto_tasa: string;
  observaciones: string;
  items: DraftItem[];
}

interface ProformaFormProps {
  proforma: Proforma | null;
  clientes: Cliente[];
  servicios: Servicio[];
  productos: Producto[];
  /** Fecha date-only calculada en el servidor (zona America/La_Paz). */
  today: string;
}

let itemSequence = 0;

function nextItemKey(): string {
  itemSequence += 1;

  return `item-${itemSequence}`;
}

function numberToInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }

  return String(value);
}

function emptyItem(tipo: TipoProformaItem): DraftItem {
  return {
    key: nextItemKey(),
    tipo,
    catalogoId: "",
    descripcion: "",
    cantidad: "1",
    precio_unitario: "",
    unidad_medida: "",
  };
}

function toDraftItem(item: ProformaItem): DraftItem {
  return {
    key: `existing-${item.id}`,
    tipo: item.tipo,
    catalogoId: String(
      item.servicio_id ??
        item.servicio?.id ??
        item.producto_id ??
        item.producto?.id ??
        "",
    ),
    descripcion: item.descripcion ?? "",
    cantidad: numberToInput(item.cantidad) || "0",
    precio_unitario: numberToInput(item.precio_unitario),
    unidad_medida: item.unidad_medida ?? item.producto?.unidad_medida ?? "",
  };
}

function toFormState(proforma: Proforma | null, today: string): FormState {
  if (!proforma) {
    return {
      clienteId: "",
      fecha_emision: today,
      fecha_validez: "",
      descuento: "0",
      impuesto_tasa: "13",
      observaciones: "",
      items: [],
    };
  }

  return {
    clienteId: String(proforma.cliente_id),
    fecha_emision: proforma.fecha_emision,
    fecha_validez: proforma.fecha_validez ?? "",
    descuento: numberToInput(proforma.descuento) || "0",
    impuesto_tasa: numberToInput(proforma.impuesto_tasa) || "0",
    observaciones: proforma.observaciones ?? "",
    items: (proforma.items ?? []).map(toDraftItem),
  };
}

function safeNumber(value: string): number {
  const parsed = parseDecimal(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function ProformaForm({
  proforma,
  clientes,
  servicios,
  productos,
  today,
}: ProformaFormProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const {
    formRef,
    fieldErrors,
    fieldErrorCount,
    message,
    applyFieldErrors,
    reset,
  } = useFormErrors();
  const [initialForm] = useState<FormState>(() =>
    toFormState(proforma, today),
  );
  const [form, setForm] = useState<FormState>(initialForm);
  const [pending, setPending] = useState(false);
  const intentRef = useRef<"draft" | "send">("draft");

  const clienteOptions: CatalogOption[] = clientes.map((cliente) => ({
    id: cliente.id,
    label: cliente.nombre_razon,
    description: cliente.nit_ci ? `NIT/CI ${cliente.nit_ci}` : undefined,
  }));

  // Si un ítem guardado apunta a un catálogo ya desactivado, se agrega igual
  // para que el selector muestre la selección actual en vez de quedar vacío.
  const serviciosGuardados: CatalogOption[] = (proforma?.items ?? []).flatMap(
    (item) => {
      if (item.tipo !== "SERVICIO") return [];

      const id = item.servicio_id ?? item.servicio?.id;

      if (!id || servicios.some((servicio) => servicio.id === id)) return [];

      return [
        {
          id,
          label:
            item.servicio?.nombre ??
            item.descripcion ??
            `Servicio #${id}`,
          description: "Fuera del catálogo activo",
        },
      ];
    },
  );

  const productosGuardados: CatalogOption[] = (proforma?.items ?? []).flatMap(
    (item) => {
      if (item.tipo !== "MATERIAL") return [];

      const id = item.producto_id ?? item.producto?.id;

      if (!id || productos.some((producto) => producto.id === id)) return [];

      return [
        {
          id,
          label:
            item.producto?.nombre ??
            item.descripcion ??
            `Material #${id}`,
          description: "Fuera del catálogo activo",
        },
      ];
    },
  );

  const servicioOptions: CatalogOption[] = [
    ...servicios.map((servicio) => ({
      id: servicio.id,
      label: servicio.nombre,
      description: [formatMoney(servicio.precio_base), servicio.categoria]
        .filter(Boolean)
        .join(" · "),
    })),
    ...serviciosGuardados,
  ];

  const productoOptions: CatalogOption[] = [
    ...productos.map((producto) => ({
      id: producto.id,
      label: producto.nombre,
      description: `${formatMoney(producto.precio_unitario)} · ${
        producto.unidad_medida || "unidad"
      } · Stock ${formatNumber(producto.stock_actual)}`,
    })),
    ...productosGuardados,
  ];

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateItem<K extends keyof DraftItem>(
    key: string,
    field: K,
    value: DraftItem[K],
  ) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function addItem(tipo: TipoProformaItem) {
    setForm((current) => ({
      ...current,
      items: [...current.items, emptyItem(tipo)],
    }));
  }

  function removeItem(key: string) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => item.key !== key),
    }));
  }

  function duplicateItem(key: string) {
    setForm((current) => {
      const index = current.items.findIndex((item) => item.key === key);

      if (index < 0) return current;

      const items = [...current.items];
      items.splice(index + 1, 0, {
        ...current.items[index],
        key: nextItemKey(),
      });

      return { ...current, items };
    });
  }

  function changeCatalog(item: DraftItem, value: string) {
    if (value === "") {
      updateItem(item.key, "catalogoId", "");
      updateItem(item.key, "descripcion", "");
      updateItem(item.key, "precio_unitario", "");
      updateItem(item.key, "unidad_medida", "");

      return;
    }

    const id = Number(value);

    if (item.tipo === "SERVICIO") {
      const servicio = servicios.find((entry) => entry.id === id);

      updateItem(item.key, "catalogoId", value);

      // Un ítem guardado puede apuntar a un servicio ya desactivado: se
      // conserva su descripción y precio en vez de vaciarlos.
      if (servicio) {
        updateItem(item.key, "descripcion", servicio.nombre);
        updateItem(
          item.key,
          "precio_unitario",
          numberToInput(servicio.precio_base),
        );
        updateItem(item.key, "unidad_medida", "");
      }

      return;
    }

    if (item.tipo === "MATERIAL") {
      const producto = productos.find((entry) => entry.id === id);

      updateItem(item.key, "catalogoId", value);

      if (producto) {
        updateItem(item.key, "descripcion", producto.nombre);
        updateItem(
          item.key,
          "precio_unitario",
          numberToInput(producto.precio_unitario),
        );
        updateItem(item.key, "unidad_medida", producto.unidad_medida);
      }
    }
  }

  function catalogEntry(item: DraftItem): {
    precio: number;
    unidad: string;
  } | null {
    if (item.tipo === "SERVICIO" && item.catalogoId) {
      const servicio = servicios.find(
        (entry) => String(entry.id) === item.catalogoId,
      );

      if (servicio) return { precio: servicio.precio_base, unidad: "servicio" };
    }

    if (item.tipo === "MATERIAL" && item.catalogoId) {
      const producto = productos.find(
        (entry) => String(entry.id) === item.catalogoId,
      );

      if (producto) {
        return {
          precio: producto.precio_unitario,
          unidad: producto.unidad_medida,
        };
      }
    }

    return null;
  }

  function effectivePrice(item: DraftItem): number {
    if (item.tipo === "LIBRE") {
      return Math.max(safeNumber(item.precio_unitario), 0);
    }

    const catalog = catalogEntry(item);

    if (catalog) return catalog.precio;

    // Ítem guardado cuyo catálogo ya no está activo: conserva el precio previo.
    return Math.max(safeNumber(item.precio_unitario), 0);
  }

  const totals = computeProformaTotals({
    items: form.items.map((item) => ({
      cantidad: Math.max(parseCantidad(item.cantidad) || 0, 0),
      precio_unitario: effectivePrice(item),
    })),
    descuento: safeNumber(form.descuento),
    impuestoTasa: safeNumber(form.impuesto_tasa),
  });

  const isDirty = useMemo(
    () => JSON.stringify(initialForm) !== JSON.stringify(form),
    [form, initialForm],
  );

  useEffect(() => {
    if (!isDirty || pending) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, pending]);

  function validate(): ErroresValidacion {
    const errors: ErroresValidacion = {};

    if (!form.clienteId) {
      errors.cliente_id = ["Selecciona el cliente de la proforma."];
    }

    if (!isValidDateOnly(form.fecha_emision)) {
      errors.fecha_emision = ["Ingresa una fecha de emisión válida."];
    }

    if (form.fecha_validez) {
      if (!isValidDateOnly(form.fecha_validez)) {
        errors.fecha_validez = ["Ingresa una fecha de validez válida."];
      } else if (
        isValidDateOnly(form.fecha_emision) &&
        compareDateOnly(form.fecha_validez, form.fecha_emision) < 0
      ) {
        errors.fecha_validez = [
          "La validez no puede ser anterior a la emisión.",
        ];
      }
    }

    if (form.descuento.trim()) {
      const descuento = parseDecimal(form.descuento);

      if (!Number.isFinite(descuento) || descuento < 0) {
        errors.descuento = [
          "El descuento debe ser un monto en Bs mayor o igual a 0.",
        ];
      } else if (descuento > totals.subtotal) {
        errors.descuento = [
          "El descuento no puede superar el subtotal de la proforma.",
        ];
      }
    }

    if (form.impuesto_tasa.trim()) {
      const tasa = parseDecimal(form.impuesto_tasa);

      if (!Number.isFinite(tasa) || tasa < 0 || tasa > 100) {
        errors.impuesto_tasa = ["El impuesto debe estar entre 0 y 100 %."];
      }
    }

    if (form.items.length === 0) {
      errors.items = ["Agrega al menos un ítem a la proforma."];
    }

    form.items.forEach((item, index) => {
      const prefix = `items.${index}`;
      const cantidad = parseCantidad(item.cantidad);

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        errors[`${prefix}.cantidad`] = [
          "Ingresa una cantidad mayor a 0.",
        ];
      }

      if (item.tipo === "SERVICIO" && !item.catalogoId) {
        errors[`${prefix}.servicio_id`] = ["Selecciona un servicio."];
      }

      if (item.tipo === "MATERIAL" && !item.catalogoId) {
        errors[`${prefix}.producto_id`] = ["Selecciona un material."];
      }

      if (item.tipo === "LIBRE") {
        if (!item.descripcion.trim()) {
          errors[`${prefix}.descripcion`] = ["Describe el ítem libre."];
        }

        const precio = parseDecimal(item.precio_unitario);

        if (
          !item.precio_unitario.trim() ||
          !Number.isFinite(precio) ||
          precio < 0
        ) {
          errors[`${prefix}.precio_unitario`] = [
            "Ingresa un precio unitario válido.",
          ];
        }
      }
    });

    return errors;
  }

  function buildPayload(): ProformaInput {
    const items: ProformaItemInput[] = form.items.map((item) => {
      const cantidad = parseCantidad(item.cantidad);
      const descripcion = item.descripcion.trim() || null;

      if (item.tipo === "SERVICIO") {
        return {
          tipo: "SERVICIO",
          servicio_id: Number(item.catalogoId),
          cantidad,
          descripcion,
        };
      }

      if (item.tipo === "MATERIAL") {
        return {
          tipo: "MATERIAL",
          producto_id: Number(item.catalogoId),
          cantidad,
          descripcion,
        };
      }

      return {
        tipo: "LIBRE",
        descripcion: item.descripcion.trim(),
        cantidad,
        precio_unitario: safeNumber(item.precio_unitario),
        unidad_medida: item.unidad_medida.trim() || null,
      };
    });

    return {
      cliente_id: Number(form.clienteId),
      fecha_emision: form.fecha_emision,
      fecha_validez: form.fecha_validez || null,
      moneda: "BOB",
      impuesto_tasa: safeNumber(form.impuesto_tasa),
      descuento: safeNumber(form.descuento),
      observaciones: form.observaciones.trim() || null,
      items,
    };
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const intent = intentRef.current;
    const localErrors = validate();

    if (Object.keys(localErrors).length > 0) {
      intentRef.current = "draft";
      applyFieldErrors(localErrors, "Revisa los campos marcados.");
      announce("Revisa los campos marcados antes de guardar.");

      return;
    }

    setPending(true);
    reset();
    announce(intent === "send" ? "Guardando y enviando…" : "Guardando proforma…");

    try {
      const payload = buildPayload();
      const saved = proforma
        ? await proformasApi.update(proforma.id, payload)
        : await proformasApi.create(payload);
      const savedId = saved?.id ?? proforma?.id;

      if (!savedId) {
        applyFieldErrors(
          {},
          "No pudimos identificar la proforma guardada. Intenta nuevamente.",
        );

        return;
      }

      const savedNumero = saved?.numero ?? proforma?.numero ?? `#${savedId}`;

      if (intent === "send") {
        try {
          await proformasApi.enviar(savedId);
          announce(`Proforma ${savedNumero} guardada y enviada.`);
        } catch (sendError) {
          if (
            isApiError(sendError) &&
            (sendError.status === 401 || sendError.status === 419)
          ) {
            router.replace("/login");
            router.refresh();

            return;
          }

          router.push(`/proformas/${savedId}?aviso=envio-fallido`);
          router.refresh();

          return;
        }
      } else {
        announce(
          proforma
            ? `Proforma ${savedNumero} actualizada.`
            : `Proforma ${savedNumero} creada como borrador.`,
        );
      }

      router.push(`/proformas/${savedId}`);
      router.refresh();
    } catch (caught) {
      if (
        isApiError(caught) &&
        (caught.status === 401 || caught.status === 419)
      ) {
        router.replace("/login");
        router.refresh();

        return;
      }

      applyFieldErrors(
        isApiError(caught) ? (caught.errors ?? {}) : {},
        apiErrorMessage(
          caught,
          proforma
            ? "No pudimos actualizar la proforma."
            : "No pudimos crear la proforma.",
        ),
      );
    } finally {
      intentRef.current = "draft";
      setPending(false);
    }
  }

  function setIntent(intent: "draft" | "send") {
    intentRef.current = intent;
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title={
          proforma ? `Editar proforma ${proforma.numero}` : "Nueva proforma"
        }
        description={
          proforma
            ? "Solo los borradores se pueden editar. Al enviar, la proforma queda bloqueada."
            : "Arma la propuesta con servicios y materiales del catálogo, o agrega líneas libres."
        }
        back={
          <Link
            href={proforma ? `/proformas/${proforma.id}` : "/proformas"}
            className="inline-flex items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {proforma ? "Volver al detalle" : "Volver a proformas"}
          </Link>
        }
        actions={
          <>
            <Button
              type="submit"
              variant="secondary"
              size="md"
              isDisabled={pending}
              onPress={() => setIntent("draft")}
            >
              {pending ? "Guardando…" : "Guardar borrador"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isDisabled={pending}
              onPress={() => setIntent("send")}
            >
              {pending ? "Guardando…" : "Guardar y enviar"}
            </Button>
          </>
        }
      />

      {fieldErrorCount > 0 ? (
        <FormErrorSummary count={fieldErrorCount} message={message} />
      ) : message ? (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>No se pudo guardar</Alert.Title>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {clientes.length === 0 ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>No hay clientes registrados</Alert.Title>
            <Alert.Description>
              Necesitas un cliente para emitir una proforma.{" "}
              <Link
                href="/clientes"
                className="font-medium text-accent-soft-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Crear un cliente
              </Link>
              .
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <section aria-labelledby="datos-generales-title" className="space-y-3">
        <div>
          <h2
            id="datos-generales-title"
            className="text-sm font-semibold text-foreground"
          >
            Datos generales
          </h2>
          <p className="text-sm text-muted">
            Cliente, fechas comerciales y condiciones de la propuesta.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
            <div className="md:col-span-2 lg:col-span-6">
              <CatalogSelect
                name="cliente_id"
                label="Cliente"
                value={form.clienteId}
                onChange={(value) => update("clienteId", value)}
                options={clienteOptions}
                error={firstError(fieldErrors, "cliente_id")}
                placeholder="Buscar por nombre o NIT…"
                isRequired
              />
            </div>

            <div className="lg:col-span-3">
              <TextFieldControl
                name="fecha_emision"
                label="Emisión"
                type="date"
                value={form.fecha_emision}
                onChange={(value) => update("fecha_emision", value)}
                error={firstError(fieldErrors, "fecha_emision")}
                isRequired
              />
            </div>

            <div className="lg:col-span-3">
              <TextFieldControl
                name="fecha_validez"
                label="Validez"
                type="date"
                value={form.fecha_validez}
                onChange={(value) => update("fecha_validez", value)}
                error={firstError(fieldErrors, "fecha_validez")}
                description="Opcional."
              />
            </div>

            <div className="lg:col-span-3">
              <TextFieldControl
                name="descuento"
                label="Descuento (Bs)"
                value={form.descuento}
                onChange={(value) => update("descuento", value)}
                error={firstError(fieldErrors, "descuento")}
                inputMode="decimal"
                description="Monto, no porcentaje."
              />
            </div>

            <div className="lg:col-span-3">
              <TextFieldControl
                name="impuesto_tasa"
                label="Impuesto (%)"
                value={form.impuesto_tasa}
                onChange={(value) => update("impuesto_tasa", value)}
                error={firstError(fieldErrors, "impuesto_tasa")}
                inputMode="decimal"
                description="Sobre el subtotal con descuento."
              />
            </div>

            <div className="lg:col-span-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Moneda
                </span>
                <div className="flex h-10 items-center rounded-lg border border-border bg-surface-secondary px-3 text-sm text-muted">
                  BOB · Bolivianos
                </div>
                <span className="text-xs text-muted">
                  Fija en esta versión.
                </span>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-12">
              <TextAreaControl
                name="observaciones"
                label="Observaciones"
                value={form.observaciones}
                onChange={(value) => update("observaciones", value)}
                error={firstError(fieldErrors, "observaciones")}
                rows={3}
                placeholder="Condiciones, alcance o notas para el cliente…"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <section aria-labelledby="items-title" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="items-title"
                className="text-sm font-semibold text-foreground"
              >
                Ítems
              </h2>
              <p className="text-sm text-muted">
                Servicios y materiales toman el precio del catálogo. Las líneas
                libres permiten cotizar conceptos nuevos.
              </p>
            </div>

            <div
              data-field="items"
              className="flex flex-wrap items-center gap-2"
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onPress={() => addItem("SERVICIO")}
              >
                <Wrench aria-hidden className="size-4" />
                Servicio
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onPress={() => addItem("MATERIAL")}
              >
                <Package aria-hidden className="size-4" />
                Material
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onPress={() => addItem("LIBRE")}
              >
                <Plus aria-hidden className="size-4" />
                Línea libre
              </Button>
            </div>
          </div>

          {firstError(fieldErrors, "items") ? (
            <p role="alert" className="text-sm text-danger">
              {firstError(fieldErrors, "items")}
            </p>
          ) : null}

          {form.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                La proforma todavía no tiene ítems
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                Agrega un servicio o material del catálogo, o una línea libre
                con descripción y precio.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {form.items.map((item, index) => {
                const prefix = `items.${index}`;
                const catalog = catalogEntry(item);
                const price = effectivePrice(item);

                return (
                  <li
                    key={item.key}
                    className="rounded-xl border border-border bg-surface"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                          {TIPO_ITEM_LABEL[item.tipo]}
                        </span>
                        <span className="text-xs text-muted">
                          Ítem {index + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          isIconOnly
                          className="size-9 text-muted"
                          aria-label={`Duplicar ítem ${index + 1}`}
                          onPress={() => duplicateItem(item.key)}
                        >
                          <Copy aria-hidden className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          isIconOnly
                          className="size-9 text-danger"
                          aria-label={`Quitar ítem ${index + 1}`}
                          onPress={() => removeItem(item.key)}
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-12">
                      <div className="sm:col-span-2 lg:col-span-6">
                        {item.tipo === "SERVICIO" ? (
                          <CatalogSelect
                            name={`${prefix}.servicio_id`}
                            label="Servicio"
                            value={item.catalogoId}
                            onChange={(value) => changeCatalog(item, value)}
                            options={servicioOptions}
                            error={firstError(
                              fieldErrors,
                              `${prefix}.servicio_id`,
                            )}
                            placeholder="Buscar servicio…"
                            isRequired
                          />
                        ) : item.tipo === "MATERIAL" ? (
                          <CatalogSelect
                            name={`${prefix}.producto_id`}
                            label="Material"
                            value={item.catalogoId}
                            onChange={(value) => changeCatalog(item, value)}
                            options={productoOptions}
                            error={firstError(
                              fieldErrors,
                              `${prefix}.producto_id`,
                            )}
                            placeholder="Buscar material…"
                            isRequired
                          />
                        ) : (
                          <div className="flex h-full items-end">
                            <p className="text-xs text-muted">
                              Línea libre: define descripción, precio y unidad.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-2">
                        <TextFieldControl
                          name={`${prefix}.cantidad`}
                          label="Cantidad"
                          value={item.cantidad}
                          onChange={(value) =>
                            updateItem(item.key, "cantidad", value)
                          }
                          error={firstError(
                            fieldErrors,
                            `${prefix}.cantidad`,
                          )}
                          inputMode="decimal"
                          isRequired
                        />
                      </div>

                      <div className="lg:col-span-4">
                        {item.tipo === "LIBRE" ? (
                          <TextFieldControl
                            name={`${prefix}.precio_unitario`}
                            label="Precio unitario (Bs)"
                            value={item.precio_unitario}
                            onChange={(value) =>
                              updateItem(item.key, "precio_unitario", value)
                            }
                            error={firstError(
                              fieldErrors,
                              `${prefix}.precio_unitario`,
                            )}
                            inputMode="decimal"
                            isRequired
                          />
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-foreground">
                              Precio unitario
                            </span>
                            <div className="numeric flex h-10 items-center rounded-lg border border-border bg-surface-secondary px-3 text-sm text-muted">
                              {formatMoney(price)}
                            </div>
                            <span className="text-xs text-muted">
                              {catalog
                                ? `Desde catálogo · ${catalog.unidad || "unidad"}`
                                : "Selecciona un ítem del catálogo."}
                            </span>
                          </div>
                        )}
                      </div>

                      <div
                        className={
                          item.tipo === "LIBRE"
                            ? "lg:col-span-8"
                            : "lg:col-span-12"
                        }
                      >
                        <TextFieldControl
                          name={`${prefix}.descripcion`}
                          label={
                            item.tipo === "LIBRE"
                              ? "Descripción"
                              : "Detalle para el cliente"
                          }
                          value={item.descripcion}
                          onChange={(value) =>
                            updateItem(item.key, "descripcion", value)
                          }
                          error={firstError(
                            fieldErrors,
                            `${prefix}.descripcion`,
                          )}
                          placeholder={
                            item.tipo === "LIBRE"
                              ? "Concepto cotizado…"
                              : "Opcional; por defecto se usa el nombre del catálogo."
                          }
                          isRequired={item.tipo === "LIBRE"}
                        />
                      </div>

                      {item.tipo === "LIBRE" ? (
                        <div className="lg:col-span-4">
                          <TextFieldControl
                            name={`${prefix}.unidad_medida`}
                            label="Unidad"
                            value={item.unidad_medida}
                            onChange={(value) =>
                              updateItem(item.key, "unidad_medida", value)
                            }
                            error={firstError(
                              fieldErrors,
                              `${prefix}.unidad_medida`,
                            )}
                            placeholder="hora, m², unidad…"
                          />
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <TotalsSummary
          subtotal={totals.subtotal}
          descuento={totals.descuento}
          impuesto={totals.impuesto}
          total={totals.total}
          impuestoTasa={safeNumber(form.impuesto_tasa)}
          estimated
          className="xl:sticky xl:top-20"
        />
      </div>
    </form>
  );
}
