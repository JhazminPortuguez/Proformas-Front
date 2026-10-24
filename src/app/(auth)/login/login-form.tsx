"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@heroui/react";
import { AuthCard } from "@/components/auth/auth-card";
import { TextFieldControl } from "@/components/ui/fields";
import { auth } from "@/lib/api/client";
import { firstError } from "@/lib/utils";
import { homePathFor } from "@/lib/roles";
import type { ErroresValidacion } from "@/lib/api/types";
import { isApiError } from "@/lib/api/types";

function safeNextPath(next: string | null): string | null {
  if (!next || next.includes("\\")) return null;

  try {
    const url = new URL(next, window.location.origin);

    if (url.origin !== window.location.origin) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<ErroresValidacion>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setErrors({});
    setPending(true);

    try {
      const user = await auth.login(email, password);
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext = safeNextPath(next) ?? homePathFor(user.rol);

      router.replace(safeNext);
      router.refresh();
    } catch (caught) {
      if (isApiError(caught)) {
        setError(caught.message);
        setErrors(caught.errors ?? {});
      } else {
        setError("No pudimos iniciar sesión. Intenta nuevamente.");
      }
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
        onSubmit={onSubmit}
        noValidate
        aria-busy={pending}
        className="flex flex-col gap-4"
      >
        {error ? (
          <Alert status="danger" role="alert">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>No pudimos ingresar</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
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
          error={firstError(errors, "email")}
          isRequired
          autoFocus
        />

        <TextFieldControl
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={firstError(errors, "password")}
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

        <p role="status" aria-live="polite" className="sr-only">
          {pending ? "Verificando credenciales…" : ""}
        </p>
      </form>
    </AuthCard>
  );
}
