import type {
  ActividadReciente,
  DashboardAging,
  DashboardData,
  DashboardOrdenes,
  DashboardServicioSolicitado,
} from "@/lib/api/types";
import { COBROS_QUERY_VACIA, cobrosHref, cobrosVencidasHref } from "@/lib/cobros";
import { proformaEstadoMeta, ordenEstadoMeta, type EstadoTone } from "@/lib/estados";
import {
  existenciasHref,
  inventarioTabHref,
  movimientosDeProductoHref,
} from "@/lib/inventario";
import { buildQuery, formatMoney, formatNumber } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Utilidades numéricas tolerantes                                             */
/* -------------------------------------------------------------------------- */

function numero(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function entero(value: unknown): number | null {
  const parsed = numero(value);

  return parsed === null ? null : Math.trunc(parsed);
}

function noNegativo(value: unknown): number {
  return Math.max(entero(value) ?? 0, 0);
}

function monto(value: unknown): number | null {
  const parsed = numero(value);

  return parsed === null ? null : Math.max(parsed, 0);
}

function plural(count: number, singular: string, many: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : many}`;
}

/* -------------------------------------------------------------------------- */
/* KPIs                                                                        */
/* -------------------------------------------------------------------------- */

export type DashboardKpiKey =
  | "clientes"
  | "ordenes"
  | "saldo"
  | "stock"
  | "cobrado"
  | "cotizado";

export type DashboardKpiTone = EstadoTone;

export interface DashboardKpi {
  key: DashboardKpiKey;
  label: string;
  /** `null` = el backend todavía no expone ese dato; la UI muestra "—". */
  value: number | null;
  hint: string;
  href: string;
  tone: DashboardKpiTone;
  /** Indica si `value` es moneda o un conteo. */
  money: boolean;
}

export function dashboardSaldoPorCobrar(data: DashboardData): number | null {
  return monto(data.cobros?.saldo) ?? monto(data.saldo_por_cobrar);
}

export function dashboardCobradoMes(data: DashboardData): number | null {
  return monto(data.cobros?.cobrado_mes) ?? monto(data.ingresos_mes);
}

export function dashboardIngresosMes(data: DashboardData): number | null {
  return monto(data.ingresos_mes) ?? monto(data.cobros?.cobrado_mes);
}

export function dashboardCotizadoMes(data: DashboardData): number {
  return monto(data.monto_cotizado_mes) ?? monto(data.monto_proformas_mes) ?? 0;
}

export function dashboardAceptadoMes(data: DashboardData): number | null {
  return monto(data.monto_aceptado_mes);
}

export function dashboardVencidas(data: DashboardData): number | null {
  return entero(data.cobros?.vencidas);
}

export function dashboardVencido(data: DashboardData): number | null {
  const explicito = monto(data.cobros?.monto_vencido);

  if (explicito !== null) return explicito;

  const aging = data.cobros?.aging;

  if (!aging) return null;

  return (
    noNegativo(aging.d1_30) +
    noNegativo(aging.d31_60) +
    noNegativo(aging.d61_90) +
    noNegativo(aging.d90_plus)
  );
}

/** Órdenes en curso: pendientes + asignadas + en proceso, o el agregado del back. */
export function dashboardOrdenesActivas(data: DashboardData): number | null {
  const resumen = data.ordenes;

  if (resumen) {
    const activas = entero(resumen.activas);

    if (activas !== null) return Math.max(activas, 0);

    return (
      noNegativo(resumen.pendientes) +
      noNegativo(resumen.asignadas) +
      noNegativo(resumen.en_proceso)
    );
  }

  return entero(data.ordenes_pendientes);
}

function ordenesHint(resumen: DashboardOrdenes | undefined): string {
  if (!resumen) return "Sin datos de órdenes";

  const partes = [
    plural(noNegativo(resumen.pendientes), "pendiente", "pendientes"),
    plural(noNegativo(resumen.asignadas), "asignada", "asignadas"),
    plural(noNegativo(resumen.en_proceso), "en proceso", "en proceso"),
  ];

  return partes.join(" · ");
}

function saldoHint(data: DashboardData): string {
  const saldo = dashboardSaldoPorCobrar(data);

  if (saldo === null) return "Sin datos de cartera";

  const cobros = data.cobros;
  const vencidas = noNegativo(cobros?.vencidas);
  const pendientes = entero(cobros?.pendientes) ?? entero(cobros?.cuentas);

  if (vencidas > 0) {
    return `${plural(vencidas, "cuenta vencida", "cuentas vencidas")} de ${plural(
      Math.max(pendientes ?? vencidas, vencidas),
      "cuenta pendiente",
      "cuentas pendientes",
    )}`;
  }

  if (pendientes && pendientes > 0) {
    return `${plural(pendientes, "cuenta pendiente", "cuentas pendientes")} · sin mora`;
  }

  return "Sin saldo pendiente";
}

function stockHint(data: DashboardData): string {
  const inventario = data.inventario;

  if (!inventario) return "Sin datos de inventario";

  const stockBajo = noNegativo(inventario.stock_bajo);
  const productos = noNegativo(inventario.productos);

  if (stockBajo === 0) return "Sin reposiciones pendientes";

  return `de ${plural(productos, "producto", "productos")}`;
}

function cobradoHint(data: DashboardData): string {
  const cobrado = dashboardCobradoMes(data);
  const ingresos = dashboardIngresosMes(data);

  if (cobrado === null) return "Sin datos de cobros";

  if (ingresos !== null && ingresos !== cobrado) {
    return `Ingresos del mes: ${formatMoney(ingresos)}`;
  }

  return "Pagos vigentes del mes";
}

function cotizadoHint(data: DashboardData): string {
  const aceptado = dashboardAceptadoMes(data);

  if (aceptado === null) return "Borradores y enviadas del mes";

  return `Aceptado: ${formatMoney(aceptado)}`;
}

/**
 * Seis indicadores con jerarquía: finanzas (saldo, cobrado, cotizado) y
 * operación (clientes, órdenes, stock). La vista decide cuáles destacar.
 */
export function dashboardKpis(data: DashboardData): DashboardKpi[] {
  const vencidas = noNegativo(dashboardVencidas(data));
  const stockBajo = data.inventario
    ? noNegativo(data.inventario.stock_bajo)
    : null;

  return [
    {
      key: "clientes",
      label: "Clientes",
      value: entero(data.clientes) ?? 0,
      hint: "Registrados en el sistema",
      href: "/clientes",
      tone: "neutral",
      money: false,
    },
    {
      key: "ordenes",
      label: "Órdenes activas",
      value: dashboardOrdenesActivas(data),
      hint: ordenesHint(data.ordenes),
      href: "/ordenes",
      tone: "accent",
      money: false,
    },
    {
      key: "saldo",
      label: "Saldo por cobrar",
      value: dashboardSaldoPorCobrar(data),
      hint: saldoHint(data),
      href: cobrosHref({ ...COBROS_QUERY_VACIA }),
      tone: vencidas > 0 ? "warning" : "accent",
      money: true,
    },
    {
      key: "stock",
      label: "Stock bajo",
      value: stockBajo,
      hint: stockHint(data),
      href: existenciasHref({
        search: "",
        bajoStock: true,
        activo: "",
        page: 1,
      }),
      tone: stockBajo !== null && stockBajo > 0 ? "warning" : "neutral",
      money: false,
    },
    {
      key: "cobrado",
      label: "Cobrado del mes",
      value: dashboardCobradoMes(data),
      hint: cobradoHint(data),
      href: cobrosHref({ ...COBROS_QUERY_VACIA }),
      tone: "success",
      money: true,
    },
    {
      key: "cotizado",
      label: "Cotizado del mes",
      value: dashboardCotizadoMes(data),
      hint: cotizadoHint(data),
      href: "/proformas",
      tone: "accent",
      money: true,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Pipeline                                                                    */
/* -------------------------------------------------------------------------- */

export interface DashboardPipelineItem {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: EstadoTone;
}

const PROFORMA_PIPELINE: readonly string[] = [
  "BORRADOR",
  "ENVIADA",
  "ACEPTADA",
  "RECHAZADA",
];

const ORDEN_PIPELINE: readonly string[] = [
  "PENDIENTE",
  "ASIGNADA",
  "EN_PROCESO",
  "FINALIZADA",
  "CANCELADA",
];

function estadoKey(value: string): string {
  return value.trim().toUpperCase().replaceAll(/[\s-]+/g, "_");
}

function normalizarConteos(
  source: Record<string, number> | undefined,
): Map<string, number> {
  const conteos = new Map<string, number>();

  for (const [rawKey, rawValue] of Object.entries(source ?? {})) {
    const key = estadoKey(rawKey);

    if (!key) continue;

    conteos.set(key, (conteos.get(key) ?? 0) + noNegativo(rawValue));
  }

  return conteos;
}

export function dashboardProformasPipeline(
  data: DashboardData,
): DashboardPipelineItem[] {
  const source = data.proformas_por_estado;

  if (!source || typeof source !== "object") return [];

  const conteos = normalizarConteos(source);

  const items = PROFORMA_PIPELINE.map((key) => {
    const meta = proformaEstadoMeta(key);

    return {
      key,
      label: meta.label,
      count: conteos.get(key) ?? 0,
      href: `/proformas${buildQuery({ estado: key })}`,
      tone: meta.tone,
    };
  });

  for (const [key, count] of conteos) {
    if (PROFORMA_PIPELINE.includes(key)) continue;

    const meta = proformaEstadoMeta(key);

    items.push({
      key,
      label: meta.label,
      count,
      href: `/proformas${buildQuery({ estado: key })}`,
      tone: meta.tone,
    });
  }

  return items;
}

export function dashboardOrdenesPipeline(
  data: DashboardData,
): DashboardPipelineItem[] {
  const resumen = data.ordenes;

  if (!resumen) return [];

  const conteos =
    resumen.por_estado && typeof resumen.por_estado === "object"
      ? normalizarConteos(resumen.por_estado)
      : new Map<string, number>([
          ["PENDIENTE", noNegativo(resumen.pendientes)],
          ["ASIGNADA", noNegativo(resumen.asignadas)],
          ["EN_PROCESO", noNegativo(resumen.en_proceso)],
          ["FINALIZADA", noNegativo(resumen.finalizadas)],
          ["CANCELADA", noNegativo(resumen.canceladas)],
        ]);

  const items = ORDEN_PIPELINE.map((key) => {
    const meta = ordenEstadoMeta(key);

    return {
      key,
      label: meta.label,
      count: conteos.get(key) ?? 0,
      href: `/ordenes${buildQuery({ estado: key })}`,
      tone: meta.tone,
    };
  });

  for (const [key, count] of conteos) {
    if (ORDEN_PIPELINE.includes(key)) continue;

    const meta = ordenEstadoMeta(key);

    items.push({
      key,
      label: meta.label,
      count,
      href: `/ordenes${buildQuery({ estado: key })}`,
      tone: meta.tone,
    });
  }

  return items;
}

export function dashboardPipelineTotal(
  items: readonly DashboardPipelineItem[],
): number {
  return items.reduce((total, item) => total + item.count, 0);
}

/* -------------------------------------------------------------------------- */
/* Aging                                                                       */
/* -------------------------------------------------------------------------- */

export interface AgingBandMeta {
  key: keyof DashboardAging;
  label: string;
  tone: EstadoTone;
}

export const AGING_BANDS: readonly AgingBandMeta[] = [
  { key: "al_dia", label: "Al día", tone: "success" },
  { key: "d1_30", label: "1 a 30 días", tone: "warning" },
  { key: "d31_60", label: "31 a 60 días", tone: "warning" },
  { key: "d61_90", label: "61 a 90 días", tone: "danger" },
  { key: "d90_plus", label: "Más de 90 días", tone: "danger" },
];

export interface AgingSlice extends AgingBandMeta {
  amount: number;
  percent: number;
}

/**
 * Convierte las bandas del backend en slices con porcentaje. Si el total no
 * viene (o es cero) se usa la suma de las bandas como denominador.
 */
export function dashboardAgingSlices(
  aging: Partial<DashboardAging> | null | undefined,
  total: number | null = null,
): AgingSlice[] {
  const amounts = AGING_BANDS.map((band) =>
    monto(aging?.[band.key]) ?? 0,
  );
  const suma = amounts.reduce((acc, value) => acc + value, 0);
  const base =
    total !== null && Number.isFinite(total) && total > 0 ? total : suma;

  return AGING_BANDS.map((band, index) => ({
    ...band,
    amount: amounts[index],
    percent:
      base > 0
        ? Math.min(100, Math.max(0, Math.round((amounts[index] / base) * 100)))
        : 0,
  }));
}

/* -------------------------------------------------------------------------- */
/* Servicios más solicitados                                                   */
/* -------------------------------------------------------------------------- */

export interface ServicioSolicitadoItem {
  servicioId: number;
  nombre: string;
  cantidad: number;
  total: number;
}

export function dashboardServiciosTop(
  data: DashboardData,
  limit = 5,
): ServicioSolicitadoItem[] {
  const servicios = data.servicios_mas_solicitados ?? [];

  return servicios
    .map((servicio: DashboardServicioSolicitado, index) => ({
      servicioId: entero(servicio.servicio_id) ?? index + 1,
      nombre: servicio.nombre?.trim() || `Servicio #${servicio.servicio_id ?? index + 1}`,
      cantidad: noNegativo(servicio.cantidad),
      total: monto(servicio.total) ?? 0,
    }))
    .sort((a, b) => b.cantidad - a.cantidad || b.total - a.total)
    .slice(0, Math.max(limit, 0));
}

/* -------------------------------------------------------------------------- */
/* Actividad reciente                                                          */
/* -------------------------------------------------------------------------- */

export type ActividadKind =
  | "proforma"
  | "orden"
  | "pago"
  | "movimiento"
  | "cliente"
  | "otro";

export interface ActividadTipoMeta {
  label: string;
  tone: EstadoTone;
}

export const ACTIVIDAD_TIPO_META: Record<ActividadKind, ActividadTipoMeta> = {
  proforma: { label: "Proforma", tone: "accent" },
  orden: { label: "Orden", tone: "warning" },
  pago: { label: "Pago", tone: "success" },
  movimiento: { label: "Movimiento", tone: "neutral" },
  cliente: { label: "Cliente", tone: "accent" },
  otro: { label: "Actividad", tone: "neutral" },
};

const ACTIVIDAD_ALIAS: Record<string, ActividadKind> = {
  proforma: "proforma",
  proformas: "proforma",
  cotizacion: "proforma",
  cotizaciones: "proforma",
  orden: "orden",
  ordenes: "orden",
  orden_servicio: "orden",
  ordenes_servicio: "orden",
  os: "orden",
  pago: "pago",
  pagos: "pago",
  cobro: "pago",
  cobros: "pago",
  movimiento: "movimiento",
  movimientos: "movimiento",
  inventario: "movimiento",
  cliente: "cliente",
  clientes: "cliente",
};

export function normalizarActividadTipo(value: string | undefined): ActividadKind {
  const key = (value ?? "").trim().toLowerCase().replaceAll(/[\s-]+/g, "_");

  return ACTIVIDAD_ALIAS[key] ?? "otro";
}

export function actividadTipoMeta(value: string | undefined): ActividadTipoMeta {
  return ACTIVIDAD_TIPO_META[normalizarActividadTipo(value)];
}

export interface DashboardActividadItem {
  key: string;
  kind: ActividadKind;
  tipoLabel: string;
  descripcion: string;
  estado: string | null;
  monto: number | null;
  usuario: string | null;
  fecha: string | null;
  href: string | null;
  tone: EstadoTone;
}

function idNumerico(value: number | string | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return null;
}

function actividadHref(
  kind: ActividadKind,
  item: ActividadReciente,
  descripcion: string,
): string | null {
  const id = idNumerico(item.id);

  switch (kind) {
    case "proforma":
      return id !== null ? `/proformas/${id}` : null;
    case "orden":
      return id !== null ? `/ordenes/${id}` : null;
    case "pago": {
      const cuentaId = idNumerico(item.cuenta_id ?? undefined);

      return cuentaId !== null ? `/cobros/${cuentaId}` : null;
    }
    case "movimiento": {
      const productoId = idNumerico(item.producto_id ?? undefined);

      return productoId !== null
        ? movimientosDeProductoHref(productoId)
        : inventarioTabHref("movimientos");
    }
    case "cliente":
      return id !== null
        ? `/clientes/${id}`
        : `/clientes${buildQuery({ search: descripcion })}`;
    default:
      return null;
  }
}

function descripcionActividad(
  item: ActividadReciente,
  meta: ActividadTipoMeta,
): string {
  return (
    item.descripcion?.trim() ||
    item.titulo?.trim() ||
    item.mensaje?.trim() ||
    meta.label
  );
}

export function dashboardActividad(
  data: DashboardData,
  limit = 6,
): DashboardActividadItem[] {
  const items = data.actividad_reciente ?? [];

  return items.slice(0, Math.max(limit, 0)).map((item, index) => {
    const kind = normalizarActividadTipo(item.tipo);
    const meta = ACTIVIDAD_TIPO_META[kind];
    const descripcion = descripcionActividad(item, meta);

    return {
      key: `${kind}-${idNumerico(item.id) ?? "s"}-${index}`,
      kind,
      tipoLabel: meta.label,
      descripcion,
      estado: item.estado?.trim() || null,
      monto: monto(item.monto),
      usuario: item.usuario?.trim() || null,
      fecha: item.fecha ?? item.created_at ?? null,
      href: actividadHref(kind, item, descripcion),
      tone: meta.tone,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Presentación                                                                */
/* -------------------------------------------------------------------------- */

/** Primer nombre para el saludo; tolera nombres vacíos o con espacios extra. */
export function primerNombre(name: string | null | undefined): string {
  const [first] = (name ?? "").trim().split(/\s+/);

  return first ?? "";
}

export const DASHBOARD_COBROS_HREF = cobrosHref({ ...COBROS_QUERY_VACIA });
export const DASHBOARD_VENCIDAS_HREF = cobrosVencidasHref();
export const DASHBOARD_BAJO_STOCK_HREF = existenciasHref({
  search: "",
  bajoStock: true,
  activo: "",
  page: 1,
});
export const DASHBOARD_MOVIMIENTOS_HREF = inventarioTabHref("movimientos");
