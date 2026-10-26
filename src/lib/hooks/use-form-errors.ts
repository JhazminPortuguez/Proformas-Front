"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { ErroresValidacion } from "@/lib/api/types";
import { normalizeFieldErrors } from "@/lib/api/errors";

const FOCUSABLE_FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([disabled])',
  "textarea:not([disabled])",
  "select:not([disabled])",
  'button:not([disabled])',
  '[role="combobox"]:not([aria-disabled="true"])',
  '[role="switch"]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function countFieldErrors(errors: ErroresValidacion): number {
  return Object.values(errors).filter((messages) => messages.length > 0).length;
}

/**
 * Enfoca el primer campo inválido respetando el orden del DOM (no el orden en
 * que Laravel devolvió las claves). Asume que cada campo tiene `data-field`.
 */
export function focusFirstInvalidField(
  form: HTMLFormElement | null,
  errors: ErroresValidacion,
): boolean {
  if (!form) return false;

  const invalid = new Set(
    Object.entries(errors)
      .filter(([, messages]) => messages.length > 0)
      .map(([field]) => field),
  );

  if (invalid.size === 0) return false;

  const fields = Array.from(
    form.querySelectorAll<HTMLElement>("[data-field]"),
  );

  const target = fields.find((field) => {
    const name = field.dataset.field;

    return name ? invalid.has(name) : false;
  });

  const control = target?.querySelector<HTMLElement>(FOCUSABLE_FIELD_SELECTOR);

  if (!control) return false;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  control.focus({ preventScroll: false });
  control.scrollIntoView?.({
    block: "center",
    behavior: reduceMotion ? "auto" : "smooth",
  });

  return true;
}

interface UseFormErrorsResult {
  formRef: RefObject<HTMLFormElement | null>;
  fieldErrors: ErroresValidacion;
  fieldErrorCount: number;
  message: string | null;
  applyFieldErrors: (
    errors: ErroresValidacion,
    message?: string | null,
  ) => void;
  setMessage: (message: string | null) => void;
  reset: () => void;
}

/**
 * Estado de errores de un formulario: normaliza los 422 por campo, calcula el
 * resumen y mueve el foco al primer campo inválido sin perder lo escrito.
 */
export function useFormErrors(): UseFormErrorsResult {
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<ErroresValidacion>({});
  const [message, setMessage] = useState<string | null>(null);

  const applyFieldErrors = useCallback(
    (errors: ErroresValidacion, nextMessage: string | null = null) => {
      const normalized = normalizeFieldErrors(errors);
      const count = countFieldErrors(normalized);

      setFieldErrors(normalized);
      setMessage(nextMessage);

      if (count > 0) {
        focusFirstInvalidField(formRef.current, normalized);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setFieldErrors({});
    setMessage(null);
  }, []);

  const fieldErrorCount = useMemo(
    () => countFieldErrors(fieldErrors),
    [fieldErrors],
  );

  return {
    formRef,
    fieldErrors,
    fieldErrorCount,
    message,
    applyFieldErrors,
    setMessage,
    reset,
  };
}
