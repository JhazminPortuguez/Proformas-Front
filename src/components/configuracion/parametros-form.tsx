"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@heroui/react";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { parametros as parametrosApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { ErroresValidacion, Parametros, ParametrosInput } from "@/lib/api/types";
import { firstError, parseDecimal } from "@/lib/utils";
import { decimalesDe } from "@/lib/validacion";

interface Draft {
  impuesto: string;
  dias: string;
}

/** "13.00" → "13"; "15.50" → "15.5" (lo que escribiría una persona). */
function sinCerosDeMas(valor: string): string {
  const numero = parseDecimal(valor);

  return Number.isFinite(numero) ? String(numero).replace(".", ",") : valor;
}

export function parametrosDraft(parametros: Parametros): Draft {
  return {
    impuesto: sinCerosDeMas(parametros.impuesto_por_defecto),
    dias: parametros.dias_validez_por_defecto === null ? "" : String(parametros.dias_validez_por_defecto),
  };
}

export function validarParametros(draft: Draft): ErroresValidacion {
  const errores: ErroresValidacion = {};
  const impuesto = parseDecimal(draft.impuesto);

  if (!draft.impuesto.trim()) {
    errores.impuesto_por_defecto = ["Escribe el impuesto por defecto."];
  } else if (!Number.isFinite(impuesto) || impuesto < 0 || impuesto > 100) {
    errores.impuesto_por_defecto = ["El impuesto debe estar entre 0 y 100 %."];
  } else if (decimalesDe(draft.impuesto) > 2) {
    errores.impuesto_por_defecto = ["El impuesto admite como máximo 2 decimales."];
  }

  if (draft.dias.trim()) {
    const dias = Number(draft.dias.trim());

    if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
      errores.dias_validez_por_defecto = ["Los días de validez deben ser un número entero entre 1 y 365."];
    }
  }

  return errores;
}

/**
 * Ronda B, parte 1: parámetros del sistema que edita el superusuario. Son los
 * valores iniciales del formulario de nueva proforma.
 */
export function ParametrosForm({ parametros }: { parametros: Parametros }) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [draft, setDraft] = useState<Draft>(() => parametrosDraft(parametros));
  const [guardado, setGuardado] = useState<Draft>(() => parametrosDraft(parametros));
  const [pending, setPending] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const { formRef, fieldErrors, fieldErrorCount, message, applyFieldErrors, reset } =
    useFormErrors();

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(guardado), [draft, guardado]);

  function set(campo: keyof Draft, valor: string) {
    setAviso(null);
    setDraft((actual) => ({ ...actual, [campo]: valor }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const errores = validarParametros(draft);

    if (Object.keys(errores).length > 0) {
      applyFieldErrors(errores, "Revisa los parámetros.");

      return;
    }

    const payload: ParametrosInput = {
      impuesto_por_defecto: parseDecimal(draft.impuesto),
      dias_validez_por_defecto: draft.dias.trim() ? Number(draft.dias.trim()) : null,
    };

    setPending(true);
    reset();

    try {
      const nuevos = parametrosDraft(await parametrosApi.update(payload));

      setDraft(nuevos);
      setGuardado(nuevos);
      setAviso("Parámetros guardados. Se usan desde la próxima proforma nueva.");
      announce("Parámetros guardados.");
      router.refresh();
    } catch (error) {
      if (isApiError(error) && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      applyFieldErrors(
        isApiError(error) ? (error.errors ?? {}) : {},
        apiErrorMessage(error, "No pudimos guardar los parámetros."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-label="Parámetros del sistema"
      className="mt-6 flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-foreground">Parámetros del sistema</h2>
        <p className="text-sm text-muted">
          Valores con los que empieza cada proforma nueva. Quien la prepara los puede cambiar en
          esa proforma; las proformas ya creadas no cambian.
        </p>
      </div>

      <FormErrorSummary count={fieldErrorCount} message={message} />
      {message && fieldErrorCount === 0 ? (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextFieldControl
          name="impuesto_por_defecto"
          label="Impuesto por defecto (%)"
          value={draft.impuesto}
          onChange={(v) => set("impuesto", v)}
          error={firstError(fieldErrors, "impuesto_por_defecto")}
          inputMode="decimal"
          description="Entre 0 y 100, con hasta 2 decimales. Por ejemplo, 13."
          isRequired
        />
        <TextFieldControl
          name="dias_validez_por_defecto"
          label="Días de validez por defecto"
          value={draft.dias}
          onChange={(v) => set("dias", v)}
          error={firstError(fieldErrors, "dias_validez_por_defecto")}
          inputMode="numeric"
          description="La validez será la emisión más estos días. Vacío: la validez queda en blanco."
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        {aviso ? (
          <p role="status" className="text-sm text-success-soft-foreground">
            {aviso}
          </p>
        ) : !isDirty ? (
          <p className="text-sm text-muted">Sin cambios por guardar.</p>
        ) : null}
        <Button type="submit" variant="primary" isDisabled={pending || !isDirty}>
          {pending ? "Guardando…" : "Guardar parámetros"}
        </Button>
      </div>
    </form>
  );
}
