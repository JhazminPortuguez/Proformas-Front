"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button } from "@heroui/react";
import { AuthCard } from "@/components/auth/auth-card";
import { TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { auth } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { firstError } from "@/lib/utils";

const ENLACE =
  "font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Ronda C, parte 2: "¿Olvidaste tu contraseña?". El mensaje es el mismo
 * exista o no el correo (no revela quién está registrado).
 */
export function OlvideContrasenaForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [enviado, setEnviado] = useState<string | null>(null);
  const { announce } = useAnnouncer();
  const { formRef, fieldErrors, message, applyFieldErrors, reset } = useFormErrors();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      applyFieldErrors({ email: ["Escribe un correo electrónico válido."] }, "Revisa el correo.");

      return;
    }

    reset();
    setPending(true);

    try {
      const respuesta = await auth.olvideContrasena(email.trim());

      setEnviado(respuesta.message);
      announce(respuesta.message);
    } catch (caught) {
      applyFieldErrors(
        isApiError(caught) ? (caught.errors ?? {}) : {},
        isApiError(caught) && caught.status === 429
          ? "Hiciste varios pedidos seguidos. Espera unos minutos y revisa tu bandeja (también la carpeta de spam) antes de pedir otro enlace."
          : apiErrorMessage(caught, "No pudimos procesar el pedido. Intenta nuevamente."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="¿Olvidaste tu contraseña?"
      description="Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva."
      footer={
        <p>
          ¿La recordaste?{" "}
          <Link href="/login" className={ENLACE}>
            Volver a iniciar sesión
          </Link>
        </p>
      }
    >
      {enviado ? (
        <div className="flex flex-col gap-4">
          <Alert status="success" role="status">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Revisa tu correo</Alert.Title>
              <Alert.Description>{enviado}</Alert.Description>
            </Alert.Content>
          </Alert>
          <p className="text-sm text-muted">
            Si tu cuenta se creó con Google, el correo te explica cómo entrar con
            &quot;Continuar con Google&quot;.
          </p>
          <Button variant="secondary" onPress={() => setEnviado(null)}>
            Usar otro correo
          </Button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={pending} className="flex flex-col gap-4">
          {message ? (
            <Alert status="danger" role="alert">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>No pudimos enviar el enlace</Alert.Title>
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

          <Button type="submit" variant="primary" fullWidth isDisabled={pending}>
            {pending ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
