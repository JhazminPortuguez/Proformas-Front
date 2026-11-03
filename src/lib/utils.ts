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

/**
 * Las fechas date-only (`YYYY-MM-DD`) no representan un instante: si se pasan
 * a `new Date()` se interpretan como medianoche UTC y en America/La_Paz
 * (UTC-4) retroceden un día. Este formateador las trata como fecha calendario.
 */
const dateOnlyFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** Solo el día de un instante, en la misma zona que `dateFormatter`. */
const instantDayFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "America/La_Paz",
});

/** `dd/mm/aaaa` de un instante, en la misma zona que `dateFormatter`. */
const numericDayFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/La_Paz",
});

const DATE_ONLY_PATTERN =/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/;
const PURE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const otherMoneyFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Bs por defecto. Con otra moneda (USD, EUR) se muestra su símbolo real, sin
 * convertir el monto; un código inválido cae a Bs.
 */
export function formatMoney(
  value: number | null | undefined,
  moneda?: string | null,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  const code = moneda?.trim().toUpperCase();

  if (!code || code === "BOB") return moneyFormatter.format(value);

  let formatter = otherMoneyFormatters.get(code);

  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("es-BO", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      return moneyFormatter.format(value);
    }

    otherMoneyFormatters.set(code, formatter);
  }

  return formatter.format(value);
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

/**
 * Formatea una fecha date-only (`YYYY-MM-DD`) sin desplazarla de día.
 *
 * No usa `new Date("YYYY-MM-DD")`: ese constructor interpreta la cadena como
 * medianoche UTC y, al mostrarla en America/La_Paz, resta un día. Acá se
 * construye la fecha en UTC y se formatea explícitamente en UTC.
 *
 * Si recibe un instante con hora (por ejemplo `created_at` en ISO UTC), no
 * corta el texto: lo convierte a America/La_Paz igual que `formatDateTime` y
 * muestra solo el día.
 */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";

  const trimmed = value.trim();

  if (!PURE_DATE_PATTERN.test(trimmed)) {
    const instant = new Date(trimmed);

    if (DATE_ONLY_PATTERN.test(trimmed) && !Number.isNaN(instant.getTime())) {
      return instantDayFormatter.format(instant);
    }
  }

  const match = DATE_ONLY_PATTERN.exec(trimmed);

  if (!match) return trimmed;

  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );

  // Rechaza fechas inexistentes (por ejemplo 2026-02-30) sin reescribirlas.
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return trimmed;
  }

  return dateOnlyFormatter.format(date);
}

/**
 * Día de un instante ISO como `dd/mm/aaaa` en America/La_Paz. Una fecha
 * date-only (`YYYY-MM-DD`) se reordena sin pasar por `Date`.
 */
export function formatDateNumeric(value: string | null | undefined): string {
  if (!value) return "—";

  const trimmed = value.trim();

  if (PURE_DATE_PATTERN.test(trimmed)) {
    const [year, month, day] = trimmed.split("-");

    return `${day}/${month}/${year}`;
  }

  const instant = new Date(trimmed);

  if (Number.isNaN(instant.getTime())) return trimmed;

  return numericDayFormatter.format(instant);
}

/**
 * @deprecated Para fechas date-only usar `formatDateOnly`; para timestamps,
 * `formatDateTime`. Se mantiene como alias para no romper imports antiguos.
 */
export function formatDate(value: string | null | undefined): string {
  return formatDateOnly(value);
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
