"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@heroui/react";
import { AuthCard } from "@/components/auth/auth-card";
import { TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { auth } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { firstError } from "@/lib/utils";
import { homePathFor } from "@/lib/roles";
import { isApiError } from "@/lib/api/types";

export function RegistroForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
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

    const localErrors: Record<string, string[]> = {};

    if (password.length > 0 && password !== confirmacion) {
      localErrors.password_confirmation = ["Las contraseñas no coinciden."];
    }

    if (Object.keys(localErrors).length > 0) {
      applyFieldErrors(localErrors, "Revisa los datos ingresados.");

      return;
    }

    reset();
    setPending(true);
    announce("Creando tu cuenta…");

    try {
      const user = await auth.register({
        name: nombre,
        email,
        password,
        password_confirmation: confirmacion,
        ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
      });

      announce("Cuenta creada. Bienvenido a tu portal.");
      router.replace(homePathFor(user.rol));
      router.refresh();
    } catch (caught) {
      const serverErrors = isApiError(caught)
        ? { ...(caught.errors ?? {}) }
        : {};
      const passwordErrors = serverErrors.password;

      if (passwordErrors?.some((fieldMessage) => /confirm/i.test(fieldMessage))) {
        serverErrors.password_confirmation = passwordErrors;
        delete serverErrors.password;
      }

      applyFieldErrors(
        serverErrors,
        apiErrorMessage(
          caught,
          "No pudimos crear la cuenta. Revisa tus datos e intenta nuevamente.",
        ),
      );
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
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        aria-busy={pending}
        className="flex flex-col gap-4"
      >
        {fieldErrorCount > 0 ? (
          <FormErrorSummary count={fieldErrorCount} message={message} />
        ) : message ? (
          <Alert status="danger" role="alert">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>No pudimos crear la cuenta</Alert.Title>
              <Alert.Description>{message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <TextFieldControl
          name="name"
          label="Nombre completo"
          autoComplete="name"
          value={nombre}
          onChange={setNombre}
          error={firstError(fieldErrors, "name")}
          isRequired
        />

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
          name="telefono"
          label="Teléfono"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={telefono}
          onChange={setTelefono}
          error={firstError(fieldErrors, "telefono")}
          description="Opcional. Nos sirve para contactarte."
        />

        <TextFieldControl
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={firstError(fieldErrors, "password")}
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
          error={firstError(fieldErrors, "password_confirmation")}
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

      </form>
    </AuthCard>
  );
}
