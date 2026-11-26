"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DrawerActions, FormDrawer } from "@/components/ui/form-drawer";
import { TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { auth } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { ErroresValidacion } from "@/lib/api/types";
import { firstError } from "@/lib/utils";

interface Datos {
  actual: string;
  nueva: string;
  confirmacion: string;
}

const VACIO: Datos = { actual: "", nueva: "", confirmacion: "" };

/** Las mismas reglas que el back: 8 caracteres, letras y números, distinta. */
export function validarCambioContrasena({ actual, nueva, confirmacion }: Datos): ErroresValidacion {
  const errores: ErroresValidacion = {};

  if (!actual) errores.password_actual = ["Escribe tu contraseña actual."];

  if (!nueva) {
    errores.password = ["Escribe la contraseña nueva."];
  } else if (nueva.length < 8) {
    errores.password = ["La contraseña nueva debe tener al menos 8 caracteres."];
  } else if (!/\p{L}/u.test(nueva)) {
    errores.password = ["La contraseña nueva debe tener al menos una letra."];
  } else if (!/\d/.test(nueva)) {
    errores.password = ["La contraseña nueva debe tener al menos un número."];
  } else if (actual && nueva === actual) {
    errores.password = ["La contraseña nueva debe ser distinta de la actual."];
  }

  if (nueva && confirmacion !== nueva) {
    errores.password_confirmation = ["La confirmación no coincide con la contraseña nueva."];
  }

  return errores;
}

/**
 * Ronda B, parte 3 (OWASP A07): cambiar la propia contraseña. El back cierra
 * las otras sesiones de la cuenta.
 */
export function CambiarContrasena({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [pending, setPending] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  const { formRef, fieldErrors, fieldErrorCount, message, applyFieldErrors, reset } = useFormErrors();

  const isDirty = useMemo(() => JSON.stringify(datos) !== JSON.stringify(VACIO), [datos]);

  function set(campo: keyof Datos, valor: string) {
    setHecho(null);
    setDatos((actual) => ({ ...actual, [campo]: valor }));
  }

  function cerrar(abierto: boolean) {
    if (!abierto) {
      setDatos(VACIO);
      setHecho(null);
      reset();
    }

    onOpenChange(abierto);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const errores = validarCambioContrasena(datos);

    if (Object.keys(errores).length > 0) {
      applyFieldErrors(errores, "Revisa los datos de la contraseña.");

      return;
    }

    setPending(true);
    reset();

    try {
      const respuesta = await auth.cambiarContrasena({
        password_actual: datos.actual,
        password: datos.nueva,
        password_confirmation: datos.confirmacion,
      });

      setDatos(VACIO);
      setHecho(respuesta.message);
      announce(respuesta.message);
    } catch (error) {
      if (isApiError(error) && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      applyFieldErrors(
        isApiError(error) ? (error.errors ?? {}) : {},
        isApiError(error) && error.status === 429
          ? "Hiciste varios intentos seguidos. Espera un minuto e inténtalo de nuevo."
          : apiErrorMessage(error, "No pudimos cambiar tu contraseña."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDrawer
      isOpen={isOpen}
      onOpenChange={cerrar}
      title="Cambiar contraseña"
      description="Al cambiarla se cierran las otras sesiones abiertas con tu cuenta."
      onSubmit={onSubmit}
      isPending={pending}
      error={message}
      fieldErrorCount={fieldErrorCount}
      isDirty={isDirty}
      formRef={formRef}
      footer={
        <DrawerActions
          isPending={pending}
          onCancel={() => cerrar(false)}
          submitLabel="Cambiar contraseña"
          pendingLabel="Cambiando…"
        />
      }
    >
      {hecho ? (
        <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success-soft-foreground">
          {hecho}
        </p>
      ) : null}
      <TextFieldControl
        name="password_actual"
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        value={datos.actual}
        onChange={(v) => set("actual", v)}
        error={firstError(fieldErrors, "password_actual")}
        isRequired
      />
      <TextFieldControl
        name="password"
        label="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        value={datos.nueva}
        onChange={(v) => set("nueva", v)}
        error={firstError(fieldErrors, "password")}
        description="Al menos 8 caracteres, con letras y números."
        isRequired
      />
      <TextFieldControl
        name="password_confirmation"
        label="Repite la contraseña nueva"
        type="password"
        autoComplete="new-password"
        value={datos.confirmacion}
        onChange={(v) => set("confirmacion", v)}
        error={firstError(fieldErrors, "password_confirmation")}
        isRequired
      />
    </FormDrawer>
  );
}
