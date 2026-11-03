import { todayDateOnly } from "@/lib/proformas";
import { buildQuery } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Pestañas                                                                    */
/* -------------------------------------------------------------------------- */

export type ReporteTab = "ordenes";

export interface ReporteMeta {
  label: string;
  /** Ruta bajo /api/v1/reportes. */
  endpoint: string;
  /** Qué filtros, además del rango de fechas, tienen sentido en el reporte. */
  filtros: { cliente: boolean; operario: boolean };
}

export const REPORTES: Record<ReporteTab, ReporteMeta> = {
  ordenes: {
    label: "Órdenes de servicio",
    endpoint: "ordenes",
    filtros: { cliente: true, operario: true },
  },
};

export const REPORTE_TABS = Object.keys(REPORTES) as ReporteTab[];

export function parseReporteTab(value: string): ReporteTab {
  return (REPORTE_TABS as string[]).includes(value)
    ? (value as ReporteTab)
    : REPORTE_TABS[0];
}

/* -------------------------------------------------------------------------- */
/* Periodo                                                                     */
/* -------------------------------------------------------------------------- */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Primer y último día del mes actual en Bolivia (`YYYY-MM-DD`). */
export function mesActualBolivia(now: Date = new Date()): {
  desde: string;
  hasta: string;
} {
  const hoy = todayDateOnly("America/La_Paz", now);
  const [year, month] = hoy.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mes = String(month).padStart(2, "0");

  return {
    desde: `${year}-${mes}-01`,
    hasta: `${year}-${mes}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

/* -------------------------------------------------------------------------- */
/* Estado de la URL                                                            */
/* -------------------------------------------------------------------------- */

export interface ReportesQuery {
  tab: ReporteTab;
  desde: string;
  hasta: string;
  clienteId: number | "";
  operarioId: number | "";
}

function positiveInt(value: string): number | "" {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : "";
}

/** Sin fechas válidas, el periodo es el mes actual en Bolivia. */
export function parseReportesQuery(
  params: Record<string, string>,
  now: Date = new Date(),
): ReportesQuery {
  const mes = mesActualBolivia(now);
  const desde = DATE_PATTERN.test(params.desde ?? "") ? params.desde : mes.desde;
  const hasta = DATE_PATTERN.test(params.hasta ?? "") ? params.hasta : mes.hasta;

  return {
    tab: parseReporteTab(params.tab ?? ""),
    desde,
    hasta,
    clienteId: positiveInt(params.cliente_id ?? ""),
    operarioId: positiveInt(params.operario_id ?? ""),
  };
}

/** Filtros que se envían al back según el reporte. */
export function reporteParams(
  query: ReportesQuery,
): Record<string, string | number> {
  const { filtros } = REPORTES[query.tab];

  return {
    desde: query.desde,
    hasta: query.hasta,
    cliente_id: filtros.cliente ? query.clienteId : "",
    operario_id: filtros.operario ? query.operarioId : "",
  };
}

export function reportesHref(query: ReportesQuery): string {
  return `/reportes${buildQuery({
    tab: query.tab === REPORTE_TABS[0] ? "" : query.tab,
    desde: query.desde,
    hasta: query.hasta,
    cliente_id: query.clienteId,
    operario_id: query.operarioId,
  })}`;
}

/**
 * Descarga directa: `/api` se reenvía al back desde el mismo origen, así que
 * el navegador manda la cookie de sesión.
 */
export function reporteCsvHref(query: ReportesQuery): string {
  return `/api/v1/reportes/${REPORTES[query.tab].endpoint}${buildQuery({
    ...reporteParams(query),
    formato: "csv",
  })}`;
}

export function reportesPestanas(
  query: ReportesQuery,
): { key: string; label: string; href: string }[] {
  return REPORTE_TABS.map((tab) => ({
    key: tab,
    label: REPORTES[tab].label,
    href: reportesHref({ ...query, tab }),
  }));
}

/** Porcentaje con un decimal y coma decimal: "66,7 %". */
export function formatPorcentaje(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)} %`;
}
