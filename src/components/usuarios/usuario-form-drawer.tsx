"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { DrawerActions, FormDrawer } from "@/components/ui/form-drawer";
import { SelectControl, TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { usuarios as usuariosApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { ErroresValidacion, ReporteClienteOpcion, Rol, UsuarioInput } from "@/lib/api/types";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import { firstError } from "@/lib/utils";

interface FormState {
  name: string;
  email: string;
  password: string;
  rol: Rol;
  clienteId: string;
}

const INICIAL: FormState = { name: "", email: "", password: "", rol: "operario", clienteId: "" };

const ROLES: Rol[] = ["operario", "admin", "cliente"];

interface UsuarioFormDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Clientes existentes, para dar acceso al portal a uno de ellos. */
  clientes: ReporteClienteOpcion[];
  onSaved: () => void;
}

/**
 * Alta de usuario por el administrador. Con rol Cliente hay que elegir el
 * cliente existente al que se vincula: así se da acceso al portal a un
 * cliente cuyo correo ya está registrado.
 */
export function UsuarioFormDrawer({ isOpen, onOpenChange, clientes, onSaved }: UsuarioFormDrawerProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [form, setForm] = useState<FormState>(INICIAL);
  const [pending, setPending] = useState(false);
  const { formRef, fieldErrors, fieldErrorCount, message, applyFieldErrors, reset } =
    useFormErrors();

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(INICIAL), [form]);

  const clienteOptions = clientes.map((cliente) => ({
    id: cliente.id,
    label: cliente.nombre_razon,
    description: cliente.nit_ci ? `NIT/CI ${cliente.nit_ci}` : undefined,
  }));

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate(): ErroresValidacion {
    const errors: ErroresValidacion = {};

    if (!form.name.trim()) errors.name = ["Escribe el nombre."];
    if (!form.email.trim()) errors.email = ["Escribe el correo."];
    if (form.password.length < 8) errors.password = ["La contraseña debe tener al menos 8 caracteres."];
    if (form.rol === "cliente" && !form.clienteId) {
      errors.cliente_id = ["Elige el cliente al que pertenece este acceso."];
    }

    return errors;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const localErrors = validate();

    if (Object.keys(localErrors).length > 0) {
      applyFieldErrors(localErrors, "Revisa los datos del usuario.");

      return;
    }

    setPending(true);
    reset();

    const payload: UsuarioInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      rol: form.rol,
      cliente_id: form.rol === "cliente" ? Number(form.clienteId) : null,
    };

    try {
      await usuariosApi.create(payload);
      announce(`Usuario ${payload.name} creado.`);
      setForm(INICIAL);
      onSaved();
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      applyFieldErrors(
        isApiError(caught) ? (caught.errors ?? {}) : {},
        apiErrorMessage(caught, "No pudimos crear el usuario."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDrawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Nuevo usuario"
      description="Crea una cuenta interna o el acceso al portal de un cliente existente."
      onSubmit={onSubmit}
      isPending={pending}
      error={message}
      fieldErrorCount={fieldErrorCount}
      isDirty={isDirty}
      formRef={formRef}
      footer={
        <DrawerActions
          isPending={pending}
          onCancel={() => onOpenChange(false)}
          submitLabel="Crear usuario"
          pendingLabel="Creando…"
        />
      }
    >
      <TextFieldControl
        name="name"
        label="Nombre"
        value={form.name}
        onChange={(value) => set("name", value)}
        error={firstError(fieldErrors, "name")}
        autoComplete="off"
        isRequired
      />
      <TextFieldControl
        name="email"
        label="Correo"
        type="email"
        value={form.email}
        onChange={(value) => set("email", value)}
        error={firstError(fieldErrors, "email")}
        autoComplete="off"
        isRequired
      />
      <TextFieldControl
        name="password"
        label="Contraseña inicial"
        type="password"
        value={form.password}
        onChange={(value) => set("password", value)}
        error={firstError(fieldErrors, "password")}
        description="Mínimo 8 caracteres. Compártela con la persona por un medio seguro."
        autoComplete="new-password"
        isRequired
      />
      <SelectControl<Rol>
        name="rol"
        label="Rol"
        value={form.rol}
        onChange={(value) => set("rol", value)}
        options={ROLES.map((rol) => ({ value: rol, label: ROLE_LABELS[rol] }))}
        description={ROLE_DESCRIPTIONS[form.rol]}
        error={firstError(fieldErrors, "rol")}
        isRequired
      />
      {form.rol === "cliente" ? (
        <CatalogSelect
          name="cliente_id"
          label="Cliente"
          value={form.clienteId}
          onChange={(value) => set("clienteId", value)}
          options={clienteOptions}
          error={firstError(fieldErrors, "cliente_id")}
          description="El usuario verá en el portal las solicitudes y proformas de este cliente."
          placeholder="Buscar por nombre o NIT…"
          isRequired
        />
      ) : null}
    </FormDrawer>
  );
}
