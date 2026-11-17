import { todayDateOnly } from "@/lib/proformas";
import { buildQuery } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Pestañas                                                                    */
/* -------------------------------------------------------------------------- */

export type ReporteTab = "ordenes" | "servicios" | "inventario" | "cobros";

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
  servicios: {
    label: "Servicios y proformas",
    endpoint: "servicios",
    filtros: { cliente: true, operario: false },
  },
  inventario: {
    label: "Inventario",
    endpoint: "inventario",
    filtros: { cliente: true, operario: true },
  },
  cobros: {
    label: "Cuentas por cobrar",
    endpoint: "cobros",
    filtros: { cliente: true, operario: false },
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

/** Un rango escrito al revés en la dirección no se pide al back. */
export const MENSAJE_RANGO_AMPLIO =
  "El rango del reporte no puede superar 1 año. Elige un periodo de 12 meses o menos.";

/**
 * Más de 1 año entre las fechas (el 1/1/2026 al 31/12/2026 es el máximo). El
 * back rechaza lo mismo; acá se evita la consulta.
 */
export function rangoDemasiadoAmplio(
  query: Pick<ReportesQuery, "desde" | "hasta">,
): boolean {
  const [anio, mes, dia] = query.desde.split("-").map(Number);

  if (!anio || !mes || !dia) return false;

  const limite = new Date(Date.UTC(anio + 1, mes - 1, dia - 1))
    .toISOString()
    .slice(0, 10);

  return query.hasta > limite;
}

export function rangoInvertido(query: Pick<ReportesQuery, "desde" | "hasta">): boolean {
  return query.desde > query.hasta;
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
  return reporteExportHref(query, "csv");
}

export type FormatoExportacion = "csv" | "pdf" | "xlsx";

/** Archivo del reporte con los mismos filtros que la pantalla. */
export function reporteExportHref(
  query: ReportesQuery,
  formato: FormatoExportacion,
): string {
  return `/api/v1/reportes/${REPORTES[query.tab].endpoint}${buildQuery({
    ...reporteParams(query),
    formato,
  })}`;
}

/** Botones de descarga, en este orden, con su tooltip. */
export const EXPORTACIONES: readonly {
  formato: FormatoExportacion;
  label: string;
  tooltip: string;
}[] = [
  {
    formato: "csv",
    label: "CSV",
    tooltip: "Datos separados por comas, para importar en otros sistemas",
  },
  {
    formato: "pdf",
    label: "PDF",
    tooltip: "Documento carta con logo, filtros, tabla y totales, listo para imprimir",
  },
  {
    formato: "xlsx",
    label: "Excel",
    tooltip: "Libro .xlsx con montos y fechas con formato, filtros y fila de totales",
  },
];

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
