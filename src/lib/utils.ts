import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const moneyFormatter = new Intl.NumberFormat("es-BO", {
  style: "currency",
  currency: "BOB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("es-BO");

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "America/La_Paz",
});

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  return moneyFormatter.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  return numberFormatter.format(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return dateFormatter.format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return shortDateFormatter.format(date);
}

type QueryValue = string | number | boolean | null | undefined;

/** Arma un query string omitiendo valores vacíos. */
export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;

    search.set(key, String(value));
  }

  const query = search.toString();

  return query ? `?${query}` : "";
}

/** Primer mensaje de error de validación de un campo, si existe. */
export function firstError(
  errors: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  return errors?.[field]?.[0];
}

/**
 * Acepta montos escritos como "99.50", "99,50" o "1.234,56".
 * Si hay coma, los puntos se interpretan como separadores de miles.
 */
export function parseDecimal(value: string): number {
  const trimmed = value.trim();

  if (!trimmed) return Number.NaN;

  const normalized = trimmed.includes(",")
    ? trimmed.replaceAll(".", "").replace(",", ".")
    : trimmed;

  return Number(normalized);
}
