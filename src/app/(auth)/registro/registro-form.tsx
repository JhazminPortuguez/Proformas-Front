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
import { isApiError } from "@/lib/api/types";
import type { ErroresValidacion } from "@/lib/api/types";

export function RegistroForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [errors, setErrors] = useState<ErroresValidacion>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const localErrors: ErroresValidacion = {};

    if (password.length > 0 && password !== confirmacion) {
      localErrors.password_confirmation = ["Las contraseñas no coinciden."];
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setError("Revisa los datos ingresados.");

      return;
    }

    setErrors({});
    setPending(true);

    try {
      const user = await auth.register({
        name: nombre,
        email,
        password,
        password_confirmation: confirmacion,
        ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
      });

      router.replace(homePathFor(user.rol));
      router.refresh();
    } catch (caught) {
      if (isApiError(caught)) {
        const serverErrors = { ...(caught.errors ?? {}) };
        const passwordErrors = serverErrors.password;

        if (passwordErrors?.some((message) => /confirm/i.test(message))) {
          serverErrors.password_confirmation = passwordErrors;
          delete serverErrors.password;
        }

        setError(caught.message);
        setErrors(serverErrors);
      } else {
        setError("No pudimos crear la cuenta. Intenta nuevamente.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Crear cuenta"
      description="Registra tus datos para acceder al portal de clientes."
      footer={
        <p>
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Ingresar
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
              <Alert.Title>No pudimos crear la cuenta</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <TextFieldControl
          name="name"
          label="Nombre completo"
          autoComplete="name"
          value={nombre}
          onChange={setNombre}
          error={firstError(errors, "name")}
          isRequired
          autoFocus
        />

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
        />

        <TextFieldControl
          name="telefono"
          label="Teléfono"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={telefono}
          onChange={setTelefono}
          error={firstError(errors, "telefono")}
          description="Opcional. Nos sirve para contactarte."
        />

        <TextFieldControl
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={firstError(errors, "password")}
          description="Mínimo 8 caracteres."
          isRequired
        />

        <TextFieldControl
          name="password_confirmation"
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          value={confirmacion}
          onChange={setConfirmacion}
          error={firstError(errors, "password_confirmation")}
          isRequired
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isDisabled={pending}
          className="mt-1"
        >
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </Button>

        <p role="status" aria-live="polite" className="sr-only">
          {pending ? "Creando tu cuenta…" : ""}
        </p>
      </form>
    </AuthCard>
  );
}
