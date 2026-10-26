import { ApiError } from "./types";
import type { ErroresValidacion } from "./types";

export const DEFAULT_ERROR_MESSAGE =
  "No se pudo completar la operación. Intenta nuevamente.";

export const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Revisa tu conexión e intenta nuevamente.";

/**
 * Mensajes de respaldo por estado HTTP. La UI nunca muestra el mensaje crudo
 * de Laravel: si el back no entrega un mensaje de dominio en español, se usa
 * este catálogo para que la persona sepa qué hacer.
 */
const STATUS_FALLBACKS: Record<number, string> = {
  0: NETWORK_ERROR_MESSAGE,
  401: "Tu sesión expiró. Vuelve a ingresar.",
  403: "No tienes permisos para realizar esta acción.",
  404: "No encontramos la información solicitada.",
  409: "La operación entra en conflicto con los datos actuales.",
  419: "Tu sesión expiró. Intenta nuevamente.",
  422: "Revisa los datos ingresados.",
  429: "Demasiados intentos. Espera un momento e intenta nuevamente.",
  500: "Ocurrió un error en el servidor. Intenta nuevamente.",
};

/** En estos estados el mensaje del servidor no se usa aunque parezca seguro. */
const FIXED_STATUS_MESSAGES = new Set([0, 401, 403, 404, 419, 422, 429, 500]);

const TECHNICAL_MESSAGE_PATTERNS: RegExp[] = [
  /\bsqlstate\b/i,
  /\bstack\s*trace\b/i,
  /\bexception\b/i,
  /\bundefined\b/i,
  /\bcall to a member function\b/i,
  /\bvalidation failed\b/i,
  /\bthe given data was invalid\b/i,
  /\bthis action is unauthorized\b/i,
  /\bthese credentials do not match\b/i,
  /\bserver error\b/i,
  /\bunauthenticated\b/i,
  /\bcsrf token mismatch\b/i,
  /\btoo many requests\b/i,
  /\bforbidden\b/i,
  /\bnot found\b/i,
  /^error\s*\d+/i,
  /<[a-z][^>]*>/i,
  /\{\s*"[\w-]+"\s*:/,
];

export function statusFallback(status: number): string {
  if (STATUS_FALLBACKS[status]) return STATUS_FALLBACKS[status];
  if (status >= 500) return STATUS_FALLBACKS[500];

  return DEFAULT_ERROR_MESSAGE;
}

/**
 * Detecta mensajes que delatan implementación (SQL, stack traces, HTML,
 * mensajes en inglés del framework) y que no deben llegar a la interfaz.
 */
export function isTechnicalMessage(
  message: string | null | undefined,
): boolean {
  if (!message) return false;

  const clean = message.trim();

  if (!clean || clean.length > 300) return true;

  return TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(clean));
}

/** Usa el mensaje de dominio solo si es legible y no técnico. */
export function safeDomainMessage(
  message: string | null | undefined,
  fallback: string,
): string {
  if (!message) return fallback;

  const clean = message.trim();

  if (!clean || isTechnicalMessage(clean)) return fallback;

  return clean;
}

/**
 * Limpia los errores por campo de Laravel. Mantiene el mensaje de dominio
 * traducido por el backend y reemplaza mensajes técnicos o vacíos.
 */
export function normalizeFieldErrors(
  errors: ErroresValidacion | undefined,
): ErroresValidacion {
  if (!errors) return {};

  const normalized: ErroresValidacion = {};

  for (const [field, messages] of Object.entries(errors)) {
    if (!Array.isArray(messages)) continue;

    const clean = messages
      .filter((message): message is string => typeof message === "string")
      .map((message) => message.trim())
      .filter((message) => message.length > 0)
      .filter((message) => !isTechnicalMessage(message));

    if (clean.length > 0) {
      normalized[field] = [...new Set(clean)];
    } else if (messages.length > 0) {
      normalized[field] = ["Revisa este campo."];
    }
  }

  return normalized;
}

export interface ApiErrorBody {
  message?: string;
  errors?: ErroresValidacion;
}

/**
 * Construye el `ApiError` que consumen los componentes. Centraliza el mapeo de
 * 422 (errores por campo), 403/419/429 y caídas de conexión.
 */
export function apiErrorFromResponse(
  status: number,
  body: ApiErrorBody | null | undefined,
  fallback?: string,
): ApiError {
  const base = fallback ?? statusFallback(status);
  const fieldErrors = normalizeFieldErrors(body?.errors);
  const message = FIXED_STATUS_MESSAGES.has(status)
    ? base
    : safeDomainMessage(body?.message, base);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  return new ApiError(message, status, hasFieldErrors ? fieldErrors : undefined);
}

/**
 * Mensaje seguro para mostrar en pantalla. Los errores no-API (bugs, fallos de
 * parseo) se reemplazan por el fallback en español.
 */
export function apiErrorMessage(
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
): string {
  if (!(error instanceof ApiError)) return fallback;

  if (error.status === 0 || FIXED_STATUS_MESSAGES.has(error.status)) {
    return safeDomainMessage(error.message, statusFallback(error.status));
  }

  return safeDomainMessage(error.message, fallback);
}
