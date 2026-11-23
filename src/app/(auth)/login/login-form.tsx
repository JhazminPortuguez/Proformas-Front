"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@heroui/react";
import { AuthCard } from "@/components/auth/auth-card";
import { GoogleBoton } from "@/components/auth/google-boton";
import { TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { auth } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { firstError } from "@/lib/utils";
import { homePathFor } from "@/lib/roles";
import { isApiError } from "@/lib/api/types";
import { safeNextPath } from "@/lib/redirect";

/**
 * En el login, un 401 son credenciales equivocadas (no una sesión vencida) y
 * un 403 es una cuenta desactivada. El texto no dice cuál de los dos datos
 * falló (OWASP A07: no revela si el correo existe).
 */
export const MENSAJE_CREDENCIALES = "Correo o contraseña incorrectos.";
export const MENSAJE_CUENTA_DESACTIVADA = "Tu cuenta está desactivada. Comunícate con la empresa.";

export function mensajeLogin(error: unknown): string {
  if (isApiError(error) && error.status === 401) return MENSAJE_CREDENCIALES;
  if (isApiError(error) && error.status === 403) return MENSAJE_CUENTA_DESACTIVADA;

  return apiErrorMessage(error, "No pudimos iniciar sesión. Revisa tus datos e intenta nuevamente.");
}

export function LoginForm({
  google = false,
  errorGoogle = null,
}: {
  /** Ronda B: el back tiene las credenciales de Google. */
  google?: boolean;
  /** Por qué Google devolvió al login (superusuario, inactivo…). */
  errorGoogle?: string | null;
} = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const { announce } = useAnnouncer();
  const {
    formRef,
    fieldErrors,
    fieldErrorCount,
    message,
    applyFieldErrors,
    reset,
  } = useFormErrors();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    reset();
    setPending(true);
    announce("Verificando credenciales…");

    try {
      const user = await auth.login(email, password);
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext =
        safeNextPath(next, window.location.origin) ?? homePathFor(user.rol);

      announce("Sesión iniciada.");
      router.replace(safeNext);
      router.refresh();
    } catch (caught) {
      applyFieldErrors(
        isApiError(caught) ? (caught.errors ?? {}) : {},
        mensajeLogin(caught),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Ingresar"
      description="Accede con tu cuenta para gestionar clientes, servicios y proformas."
      footer={
        <p>
          ¿Todavía no tienes cuenta?{" "}
          <Link
            href="/registro"
            className="font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Crear una cuenta
          </Link>
        </p>
      }
    >
      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        aria-busy={pending}
        className="flex flex-col gap-4"
      >
        {errorGoogle && !message ? (
          <Alert status="danger" role="alert">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>No pudimos ingresar con Google</Alert.Title>
              <Alert.Description>{errorGoogle}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {fieldErrorCount > 0 ? (
          <FormErrorSummary count={fieldErrorCount} message={message} />
        ) : message ? (
          <Alert status="danger" role="alert">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>No pudimos ingresar</Alert.Title>
              <Alert.Description>{message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <TextFieldControl
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={setEmail}
          error={firstError(fieldErrors, "email")}
          isRequired
        />

        <TextFieldControl
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={firstError(fieldErrors, "password")}
          isRequired
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isDisabled={pending}
          className="mt-1"
        >
          {pending ? "Ingresando…" : "Ingresar"}
        </Button>

        {google ? <GoogleBoton /> : null}
      </form>
    </AuthCard>
  );
}
