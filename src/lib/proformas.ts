import type { EstadoProforma, Proforma, ProformaItem } from "@/lib/api/types";
import { parseDecimal } from "@/lib/utils";

/**
 * Normaliza texto para búsquedas locales: minúsculas, sin acentos y sin
 * espacios sobrantes. "Ñandú" y "nandu" deben encontrar lo mismo.
 */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Acciones que expone el backend (`acciones_disponibles`)                     */
/* -------------------------------------------------------------------------- */

export type AccionProforma =
  | "ver"
  | "editar"
  | "enviar"
  | "aceptar"
  | "rechazar"
  | "crear_orden"
  | "eliminar"
  | "pdf";

export const ACCIONES_PROFORMA: readonly AccionProforma[] = [
  "ver",
  "editar",
  "enviar",
  "aceptar",
  "rechazar",
  "crear_orden",
  "eliminar",
  "pdf",
];

/**
 * El contrato documenta las acciones en español, pero toleramos variantes en
 * inglés o snake_case por si el backend cambia los nombres sin avisar.
 */
const ALIAS_ACCIONES: Record<string, AccionProforma> = {
  ver: "ver",
  ver_detalle: "ver",
  view: "ver",
  show: "ver",
  detalle: "ver",
  editar: "editar",
  actualizar: "editar",
  edit: "editar",
  update: "editar",
  enviar: "enviar",
  send: "enviar",
  aceptar: "aceptar",
  accept: "aceptar",
  rechazar: "rechazar",
  reject: "rechazar",
  crear_orden: "crear_orden",
  crearorden: "crear_orden",
  crear_orden_servicio: "crear_orden",
  create_order: "crear_orden",
  create_service_order: "crear_orden",
  eliminar: "eliminar",
  borrar: "eliminar",
  delete: "eliminar",
  destroy: "eliminar",
  pdf: "pdf",
  descargar: "pdf",
  descargar_pdf: "pdf",
  download: "pdf",
  download_pdf: "pdf",
};

export function normalizarAccionProforma(
  value: string,
): AccionProforma | null {
  const key = value.trim().toLowerCase().replaceAll(/[\s-]+/g, "_");

  return ALIAS_ACCIONES[key] ?? null;
}

interface AccionesOptions {
  /** Solo admin puede eliminar; si no, se oculta aunque el backend la liste. */
  canDelete?: boolean;
  /** Solo con permiso de creación de órdenes se ofrece `crear_orden`. */
  canCreate?: boolean;
}

/**
 * Convierte `acciones_disponibles` en un set utilizable por la UI.
 *
 * Si el backend no envía el campo (o responde `null`), se usa un fallback
 * conservador derivado del estado. Si envía una lista vacía se respeta: la
 * proforma no tiene acciones disponibles.
 */
export function accionesProforma(
  proforma: Pick<Proforma, "estado" | "acciones_disponibles"> & {
    orden_id?: number | null;
  },
  { canDelete = true, canCreate = true }: AccionesOptions = {},
): Set<AccionProforma> {
  if (Array.isArray(proforma.acciones_disponibles)) {
    const acciones = new Set<AccionProforma>();

    for (const action of proforma.acciones_disponibles) {
      const normalized = normalizarAccionProforma(action);

      if (!normalized) continue;
      if (normalized === "eliminar" && !canDelete) continue;
      if (normalized === "crear_orden" && !canCreate) continue;

      acciones.add(normalized);
    }

    return acciones;
  }

  const acciones = new Set<AccionProforma>(["ver", "pdf"]);

  switch (proforma.estado) {
    case "BORRADOR":
      acciones.add("editar");
      acciones.add("enviar");
      if (canDelete) acciones.add("eliminar");
      break;
    case "ENVIADA":
      acciones.add("aceptar");
      acciones.add("rechazar");
      break;
    case "ACEPTADA":
      if (canCreate && !proforma.orden_id) acciones.add("crear_orden");
      break;
    default:
      break;
  }

  return acciones;
}

export function puedeAccionProforma(
  proforma: Pick<Proforma, "estado" | "acciones_disponibles"> & {
    orden_id?: number | null;
  },
  accion: AccionProforma,
  options: AccionesOptions = {},
): boolean {
  return accionesProforma(proforma, options).has(accion);
}

/* -------------------------------------------------------------------------- */
/* Cálculos de la proforma (estimación local; el servidor manda)               */
/* -------------------------------------------------------------------------- */

export interface ProformaTotalsLine {
  cantidad: number;
  precio_unitario: number;
}

export interface ProformaTotals {
  subtotal: number;
  descuento: number;
  base: number;
  impuesto: number;
  total: number;
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Reproduce el cálculo esperado del backend para mostrar un estimado en vivo.
 *
 * subtotal = suma(cantidad × precio)
 * base = subtotal − descuento (el descuento nunca supera el subtotal)
 * impuesto = base × tasa / 100
 * total = base + impuesto
 */
export function computeProformaTotals({
  items,
  descuento,
  impuestoTasa,
}: {
  items: readonly ProformaTotalsLine[];
  descuento: number;
  impuestoTasa: number;
}): ProformaTotals {
  const subtotal = roundMoney(
    items.reduce((sum, item) => {
      const cantidad = Number.isFinite(item.cantidad) ? item.cantidad : 0;
      const precio = Number.isFinite(item.precio_unitario)
        ? item.precio_unitario
        : 0;

      return sum + Math.max(cantidad, 0) * Math.max(precio, 0);
    }, 0),
  );

  const safeDiscount = Number.isFinite(descuento) ? Math.max(descuento, 0) : 0;
  const appliedDiscount = roundMoney(Math.min(safeDiscount, subtotal));
  const base = roundMoney(subtotal - appliedDiscount);
  const tasa = Number.isFinite(impuestoTasa)
    ? Math.max(impuestoTasa, 0)
    : 0;
  const impuesto = roundMoney((base * tasa) / 100);
  const total = roundMoney(base + impuesto);

  return { subtotal, descuento: appliedDiscount, base, impuesto, total };
}

/* -------------------------------------------------------------------------- */
/* Fechas date-only y cantidades                                               */
/* -------------------------------------------------------------------------- */

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Valida `YYYY-MM-DD` y descarta fechas de calendario inexistentes. */
export function isValidDateOnly(value: string): boolean {
  const match = DATE_ONLY_PATTERN.exec(value.trim());

  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

/** Compara dos fechas date-only sin construir instantes locales. */
export function compareDateOnly(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Hoy como fecha date-only en la zona de la operación. Se calcula en el
 * servidor y se pasa al formulario para evitar diferencias de hidratación.
 */
export function todayDateOnly(
  timeZone = "America/La_Paz",
  now: Date = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * Una proforma enviada cuya validez ya pasó. No es un estado del backend:
 * sigue siendo ENVIADA y la UI solo muestra un aviso.
 */
export function proformaExpirada(
  proforma: Pick<Proforma, "estado" | "fecha_validez">,
  hoy: string,
): boolean {
  const validez = proforma.fecha_validez ?? "";

  return (
    proforma.estado === "ENVIADA" &&
    isValidDateOnly(validez) &&
    compareDateOnly(validez, hoy) < 0
  );
}

/** `YYYY-MM-DD` → `dd/mm`. */
export function formatDiaMes(value: string): string {
  const [, month, day] = value.split("-");

  return `${day}/${month}`;
}

/** Cantidad decimal con coma o punto (`1,5` / `1.5`). */
export function parseCantidad(value: string): number {
  return parseDecimal(value);
}

/* -------------------------------------------------------------------------- */
/* Presentación de ítems                                                      */
/* -------------------------------------------------------------------------- */

export const TIPO_ITEM_LABEL: Record<ProformaItem["tipo"], string> = {
  SERVICIO: "Servicio",
  MATERIAL: "Material",
  LIBRE: "Libre",
};

export function proformaItemsCount(
  proforma: Pick<Proforma, "items_count" | "items">,
): number {
  return proforma.items_count ?? proforma.items?.length ?? 0;
}

export function proformaItemTitle(item: ProformaItem): string {
  const catalogo =
    item.tipo === "SERVICIO"
      ? item.servicio?.nombre
      : item.tipo === "MATERIAL"
        ? item.producto?.nombre
        : null;

  return item.descripcion?.trim() || catalogo || "Ítem sin descripción";
}

export function proformaItemSubtotal(item: ProformaItem): number {
  if (typeof item.total_linea === "number" && Number.isFinite(item.total_linea)) {
    return item.total_linea;
  }

  if (typeof item.subtotal === "number" && Number.isFinite(item.subtotal)) {
    return item.subtotal;
  }

  return roundMoney(item.cantidad * item.precio_unitario);
}

export function proformaItemUnidad(item: ProformaItem): string {
  return (
    item.unidad_medida ??
    item.producto?.unidad_medida ??
    (item.tipo === "SERVICIO" ? "servicio" : "unidad")
  );
}

export function estadoProformaEsEditable(estado: EstadoProforma | string): boolean {
  return estado === "BORRADOR";
}
