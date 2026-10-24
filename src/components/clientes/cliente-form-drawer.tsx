"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@heroui/react";
import { DrawerActions, FormDrawer } from "@/components/ui/form-drawer";
import { SelectControl, TextAreaControl, TextFieldControl } from "@/components/ui/fields";
import { clientes } from "@/lib/api/client";
import { errorMessage, isApiError } from "@/lib/api/types";
import type {
  Cliente,
  ClienteEstado,
  ErroresValidacion,
} from "@/lib/api/types";
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
  const [form, setForm] = useState<FormState>(() =>
    cliente
      ? {
          nombre_razon: cliente.nombre_razon,
          nit_ci: cliente.nit_ci ?? "",
          telefono: cliente.telefono ?? "",
          email: cliente.email ?? "",
          direccion: cliente.direccion ?? "",
          estado: cliente.estado,
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<ErroresValidacion>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.nombre_razon.trim()) {
      setErrors({
        nombre_razon: ["El nombre o razón social es obligatorio."],
      });
      setError("Revisa los datos ingresados.");

      return;
    }

    setPending(true);
    setErrors({});
    setError(null);

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

      onSaved();
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      if (isApiError(caught)) {
        setError(caught.message);
        setErrors(caught.errors ?? {});
      } else {
        setError(errorMessage(caught));
      }
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
      error={error}
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
        error={firstError(errors, "nombre_razon")}
        isRequired
        autoFocus
        autoComplete="organization"
      />

      <div className="grid gap-4">
        <TextFieldControl
          name="nit_ci"
          label="NIT / CI"
          value={form.nit_ci}
          onChange={(value) => update("nit_ci", value)}
          error={firstError(errors, "nit_ci")}
        />

        <TextFieldControl
          name="telefono"
          label="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.telefono}
          onChange={(value) => update("telefono", value)}
          error={firstError(errors, "telefono")}
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
        error={firstError(errors, "email")}
      />

      <TextAreaControl
        name="direccion"
        label="Dirección"
        value={form.direccion}
        onChange={(value) => update("direccion", value)}
        error={firstError(errors, "direccion")}
        rows={2}
      />

      <SelectControl
        name="estado"
        label="Estado"
        value={form.estado}
        onChange={(value) => update("estado", value)}
        options={ESTADOS}
        error={firstError(errors, "estado")}
        isRequired
        description="Prospecto: aún no compra. Activo: cliente vigente."
      />

      {errors.cliente ? (
        <Alert status="warning" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{errors.cliente.join(" ")}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">
        {pending ? "Guardando cliente…" : ""}
      </p>
    </FormDrawer>
  );
}
