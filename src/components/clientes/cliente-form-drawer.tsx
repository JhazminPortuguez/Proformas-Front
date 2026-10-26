"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DrawerActions, FormDrawer } from "@/components/ui/form-drawer";
import { TextAreaControl, TextFieldControl, SelectControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { clientes } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  Cliente,
  ClienteEstado,
  ErroresValidacion,
} from "@/lib/api/types";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { firstError } from "@/lib/utils";

interface FormState {
  nombre_razon: string;
  nit_ci: string;
  telefono: string;
  email: string;
  direccion: string;
  estado: ClienteEstado;
}

const EMPTY: FormState = {
  nombre_razon: "",
  nit_ci: "",
  telefono: "",
  email: "",
  direccion: "",
  estado: "prospecto",
};

const ESTADOS: { value: ClienteEstado; label: string }[] = [
  { value: "prospecto", label: "Prospecto" },
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

function toFormState(cliente: Cliente | null): FormState {
  if (!cliente) return EMPTY;

  return {
    nombre_razon: cliente.nombre_razon,
    nit_ci: cliente.nit_ci ?? "",
    telefono: cliente.telefono ?? "",
    email: cliente.email ?? "",
    direccion: cliente.direccion ?? "",
    estado: cliente.estado,
  };
}

function isDirty(initial: FormState, current: FormState): boolean {
  return (Object.keys(initial) as (keyof FormState)[]).some(
    (key) => initial[key] !== current[key],
  );
}

interface ClienteFormDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  cliente: Cliente | null;
  onSaved: () => void;
}

export function ClienteFormDrawer({
  isOpen,
  onOpenChange,
  cliente,
  onSaved,
}: ClienteFormDrawerProps) {
  const [initial] = useState<FormState>(() => toFormState(cliente));
  const [form, setForm] = useState<FormState>(initial);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { announce } = useAnnouncer();
  const {
    formRef,
    fieldErrors,
    fieldErrorCount,
    message,
    applyFieldErrors,
    reset,
  } = useFormErrors();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const localErrors: ErroresValidacion = form.nombre_razon.trim()
      ? {}
      : { nombre_razon: ["El nombre o razón social es obligatorio."] };

    if (Object.keys(localErrors).length > 0) {
      applyFieldErrors(localErrors, "Revisa los datos ingresados.");

      return;
    }

    setPending(true);
    reset();

    const payload = {
      nombre_razon: form.nombre_razon.trim(),
      nit_ci: form.nit_ci.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      direccion: form.direccion.trim() || null,
      estado: form.estado,
    };

    try {
      if (cliente) {
        await clientes.update(cliente.id, payload);
      } else {
        await clientes.create(payload);
      }

      announce(cliente ? "Cliente actualizado." : "Cliente creado.");
      onSaved();
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      const fallback = cliente
        ? "No pudimos actualizar el cliente."
        : "No pudimos crear el cliente.";
      const error = apiErrorMessage(caught, fallback);

      applyFieldErrors(
        isApiError(caught) ? (caught.errors ?? {}) : {},
        error,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDrawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={cliente ? "Editar cliente" : "Nuevo cliente"}
      description={
        cliente
          ? "Actualiza los datos comerciales del cliente."
          : "Registra un prospecto o cliente para empezar a cotizar."
      }
      onSubmit={onSubmit}
      isPending={pending}
      error={message}
      fieldErrorCount={fieldErrorCount}
      isDirty={isDirty(initial, form)}
      formRef={formRef}
      size="md"
      footer={
        <DrawerActions
          isPending={pending}
          onCancel={() => onOpenChange(false)}
          submitLabel={cliente ? "Guardar cambios" : "Crear cliente"}
        />
      }
    >
      <TextFieldControl
        name="nombre_razon"
        label="Nombre o razón social"
        value={form.nombre_razon}
        onChange={(value) => update("nombre_razon", value)}
        error={firstError(fieldErrors, "nombre_razon")}
        isRequired
        autoComplete="organization"
      />

      <div className="grid gap-4">
        <TextFieldControl
          name="nit_ci"
          label="NIT / CI"
          value={form.nit_ci}
          onChange={(value) => update("nit_ci", value)}
          error={firstError(fieldErrors, "nit_ci")}
        />

        <TextFieldControl
          name="telefono"
          label="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.telefono}
          onChange={(value) => update("telefono", value)}
          error={firstError(fieldErrors, "telefono")}
        />
      </div>

      <TextFieldControl
        name="email"
        label="Correo electrónico"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={form.email}
        onChange={(value) => update("email", value)}
        error={firstError(fieldErrors, "email")}
      />

      <TextAreaControl
        name="direccion"
        label="Dirección"
        value={form.direccion}
        onChange={(value) => update("direccion", value)}
        error={firstError(fieldErrors, "direccion")}
        rows={2}
      />

      <SelectControl
        name="estado"
        label="Estado"
        value={form.estado}
        onChange={(value) => update("estado", value)}
        options={ESTADOS}
        error={firstError(fieldErrors, "estado")}
        isRequired
        description="Prospecto: aún no compra. Activo: cliente vigente."
      />

    </FormDrawer>
  );
}
