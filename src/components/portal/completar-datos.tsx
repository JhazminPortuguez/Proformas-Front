"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@heroui/react";
import { TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { portal } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { ErroresValidacion } from "@/lib/api/types";
import { firstError } from "@/lib/utils";

export const MENSAJE_SOLICITAR_SIN_DATOS =
  "Completa tu teléfono y tu NIT o CI (arriba) para enviar solicitudes.";

export function validarDatos(telefono: string, nitCi: string): ErroresValidacion {
  const errores: ErroresValidacion = {};

  if (!telefono.trim()) {
    errores.telefono = ["Escribe tu teléfono."];
  } else if (!/^[0-9+\-\s()]{6,30}$/.test(telefono.trim())) {
    errores.telefono = ["Escribe un teléfono válido (solo números, espacios, + y guiones)."];
  }

  if (!nitCi.trim()) {
    errores.nit_ci = ["Escribe tu NIT o CI."];
  } else if (!/^[0-9A-Za-z\-\s]{4,30}$/.test(nitCi.trim())) {
    errores.nit_ci = ["Escribe un NIT o CI válido (números y letras, sin otros símbolos)."];
  }

  return errores;
}

/**
 * Ronda B, parte 2: la cuenta creada con Google completa su teléfono y su
 * NIT/CI antes de enviar solicitudes. Es una sola vez; después los cambia la
 * empresa.
 */
export function CompletarDatos() {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [telefono, setTelefono] = useState("");
  const [nitCi, setNitCi] = useState("");
  const [pending, setPending] = useState(false);
  const { formRef, fieldErrors, message, applyFieldErrors, reset } = useFormErrors();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const errores = validarDatos(telefono, nitCi);

    if (Object.keys(errores).length > 0) {
      applyFieldErrors(errores, "Revisa tus datos.");

      return;
    }

    setPending(true);
    reset();

    try {
      await portal.completarDatos({ telefono: telefono.trim(), nit_ci: nitCi.trim() });
      announce("Datos guardados. Ya puedes enviar solicitudes.");
      router.refresh();
    } catch (error) {
      if (isApiError(error) && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      applyFieldErrors(
        isApiError(error) ? (error.errors ?? {}) : {},
        apiErrorMessage(error, "No pudimos guardar tus datos."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Alert status="warning" className="mb-6">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>Completa tus datos</Alert.Title>
        <Alert.Description>
          Entraste con Google. Para enviar solicitudes necesitamos tu teléfono y tu NIT o CI
          (van en tus proformas).
        </Alert.Description>
        <form
          ref={formRef}
          onSubmit={onSubmit}
          noValidate
          aria-label="Completa tus datos"
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
        >
          <TextFieldControl
            name="telefono"
            label="Teléfono"
            type="tel"
            autoComplete="tel"
            value={telefono}
            onChange={setTelefono}
            error={firstError(fieldErrors, "telefono")}
            isRequired
          />
          <TextFieldControl
            name="nit_ci"
            label="NIT o CI"
            value={nitCi}
            onChange={setNitCi}
            error={firstError(fieldErrors, "nit_ci")}
            isRequired
          />
          <Button type="submit" variant="primary" isDisabled={pending} className="sm:mt-6">
            {pending ? "Guardando…" : "Guardar"}
          </Button>
          {message && !fieldErrors.telefono && !fieldErrors.nit_ci ? (
            <p role="alert" className="text-sm text-danger sm:col-span-3">
              {message}
            </p>
          ) : null}
        </form>
      </Alert.Content>
    </Alert>
  );
}
