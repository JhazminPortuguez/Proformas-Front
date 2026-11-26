"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button } from "@heroui/react";
import { AuthCard } from "@/components/auth/auth-card";
import { TextFieldControl } from "@/components/ui/fields";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { useAnnouncer } from "@/components/ui/announcer";
import { auth } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import { AYUDA_CONTRASENA, erroresContrasenaNueva } from "@/lib/contrasena";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { firstError } from "@/lib/utils";

const ENLACE =
  "font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Ronda C, parte 2: a esta pantalla lleva el enlace del correo. El enlace
 * vence en 60 minutos y sirve una sola vez; al cambiar la contraseña se
 * cierran las sesiones abiertas de la cuenta.
 */
export function RestablecerContrasenaForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [pending, setPending] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  const [enlaceInvalido, setEnlaceInvalido] = useState<string | null>(
    token && email ? null : 'El enlace está incompleto. Pide uno nuevo en "¿Olvidaste tu contraseña?".',
  );
  const { announce } = useAnnouncer();
  const { formRef, fieldErrors, fieldErrorCount, message, applyFieldErrors, reset } = useFormErrors();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const errores = erroresContrasenaNueva(password, confirmacion, "La contraseña nueva");

    if (Object.keys(errores).length > 0) {
      applyFieldErrors(errores, "Revisa la contraseña nueva.");

      return;
    }

    reset();
    setPending(true);

    try {
      const respuesta = await auth.restablecerContrasena({
        token,
        email,
        password,
        password_confirmation: confirmacion,
      });

      setHecho(respuesta.message);
      announce(respuesta.message);
    } catch (caught) {
      const errores = isApiError(caught) ? (caught.errors ?? {}) : {};

      if (errores.token?.[0]) {
        setEnlaceInvalido(errores.token[0]);

        return;
      }

      applyFieldErrors(errores, apiErrorMessage(caught, "No pudimos cambiar tu contraseña."));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Elige una contraseña nueva"
      description={email ? `Para la cuenta ${email}.` : "Para tu cuenta."}
      footer={
        <p>
          <Link href="/login" className={ENLACE}>
            Volver a iniciar sesión
          </Link>
        </p>
      }
    >
      {hecho ? (
        <div className="flex flex-col gap-4">
          <Alert status="success" role="status">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Contraseña cambiada</Alert.Title>
              <Alert.Description>{hecho}</Alert.Description>
            </Alert.Content>
          </Alert>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Iniciar sesión
          </Link>
        </div>
      ) : enlaceInvalido ? (
        <div className="flex flex-col gap-4">
          <Alert status="danger" role="alert">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>El enlace no sirve</Alert.Title>
              <Alert.Description>{enlaceInvalido}</Alert.Description>
            </Alert.Content>
          </Alert>
          <Link href="/olvide-contrasena" className={ENLACE}>
            Pedir un enlace nuevo
          </Link>
        </div>
      ) : (
        <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={pending} className="flex flex-col gap-4">
          {fieldErrorCount > 0 ? (
            <FormErrorSummary count={fieldErrorCount} message={message} />
          ) : message ? (
            <Alert status="danger" role="alert">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>No pudimos cambiar la contraseña</Alert.Title>
                <Alert.Description>{message}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <TextFieldControl
            name="password"
            label="Contraseña nueva"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={firstError(fieldErrors, "password")}
            description={AYUDA_CONTRASENA}
            isRequired
          />
          <TextFieldControl
            name="password_confirmation"
            label="Repite la contraseña nueva"
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={setConfirmacion}
            error={firstError(fieldErrors, "password_confirmation")}
            isRequired
          />

          <Button type="submit" variant="primary" fullWidth isDisabled={pending}>
            {pending ? "Guardando…" : "Guardar contraseña nueva"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
