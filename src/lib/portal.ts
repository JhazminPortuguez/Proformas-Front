import type { PortalProformaEstado } from "@/lib/api/types";
import { buildQuery, formatNumber } from "@/lib/utils";

/** Enlaces del menú del portal. */
export const PORTAL_NAV = [
  { href: "/portal", label: "Inicio", exact: true },
  { href: "/portal/servicios", label: "Servicios", exact: false },
  { href: "/portal/proformas", label: "Mis proformas", exact: false },
  { href: "/portal/solicitudes", label: "Mis solicitudes", exact: false },
] as const;

export function portalNavActivo(
  pathname: string,
  item: { href: string; exact: boolean },
): boolean {
  if (item.exact) return pathname === item.href;

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export interface FiltroPortal<E extends string> {
  key: string;
  label: string;
  estado: E | "";
}

/** "Por revisar" son las proformas Enviadas. El cliente nunca ve borradores. */
export const PROFORMA_FILTROS: readonly FiltroPortal<PortalProformaEstado>[] = [
  { key: "todas", label: "Todas", estado: "" },
  { key: "por-revisar", label: "Por revisar", estado: "ENVIADA" },
  { key: "aceptadas", label: "Aceptadas", estado: "ACEPTADA" },
  { key: "rechazadas", label: "Rechazadas", estado: "RECHAZADA" },
];

/** Una solicitud Rechazada aparece en "Todas" con su estado real. */
export const SOLICITUD_FILTROS: readonly FiltroPortal<"PENDIENTE" | "ATENDIDA">[] = [
  { key: "todas", label: "Todas", estado: "" },
  { key: "pendiente", label: "Pendiente", estado: "PENDIENTE" },
  { key: "atendida", label: "Atendida", estado: "ATENDIDA" },
];

export function parseFiltro<E extends string>(
  filtros: readonly FiltroPortal<E>[],
  value: string,
): FiltroPortal<E> {
  return filtros.find((filtro) => filtro.key === value) ?? filtros[0];
}

/** Href de un listado del portal conservando solo los parámetros con valor. */
export function portalListHref(
  base: string,
  params: { filtro?: string; page?: number; perPage?: number | "" },
): string {
  return `${base}${buildQuery({
    filtro: params.filtro && params.filtro !== "todas" ? params.filtro : undefined,
    page: params.page && params.page > 1 ? params.page : undefined,
    per_page: params.perPage || undefined,
  })}`;
}

/**
 * La proforma no tiene una descripción única: se resume con su primer ítem y
 * "+N más" si hay varios.
 */
export function resumenItems(
  primerItem: string | null,
  cantidad: number | null,
): string {
  if (!primerItem) return "—";

  const resto = (cantidad ?? 1) - 1;

  return resto > 0 ? `${primerItem} +${formatNumber(resto)} más` : primerItem;
}

/** Duración estimada en minutos como "45 min", "2 h" o "1 h 30 min". */
export function formatDuracion(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined || minutos <= 0) return "—";

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  if (horas === 0) return `${formatNumber(resto)} min`;
  if (resto === 0) return `${formatNumber(horas)} h`;

  return `${formatNumber(horas)} h ${formatNumber(resto)} min`;
}

/** Enlace `tel:` con solo dígitos y el signo +. */
export function telHref(telefono: string): string {
  return `tel:${telefono.replace(/[^\d+]/g, "")}`;
}

/** Ruta del formulario de solicitud con un servicio del catálogo precargado. */
export function solicitarHref(servicioId?: number): string {
  return servicioId ? `/portal/solicitar?servicio=${servicioId}` : "/portal/solicitar";
}
