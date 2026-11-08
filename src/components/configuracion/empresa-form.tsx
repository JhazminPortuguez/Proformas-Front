"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { Alert, Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { TextAreaControl, TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { empresa as empresaApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Empresa, ErroresValidacion } from "@/lib/api/types";
import {
  empresaDraft,
  empresaPayload,
  validarLogo,
  type EmpresaDraft,
} from "@/lib/configuracion";
import { firstError } from "@/lib/utils";

/**
 * Datos de la empresa (tabla `empresas`) y su logo. Salen en el PDF de las
 * proformas y en el cuadro de contacto del portal del cliente.
 */
export function EmpresaForm({ empresa: inicial }: { empresa: Empresa }) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [empresa, setEmpresa] = useState(inicial);
  const [draft, setDraft] = useState<EmpresaDraft>(() => empresaDraft(inicial));
  const [guardado, setGuardado] = useState<EmpresaDraft>(() => empresaDraft(inicial));
  const [pending, setPending] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const { formRef, fieldErrors, fieldErrorCount, message, applyFieldErrors, reset } =
    useFormErrors();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoPending, setLogoPending] = useState(false);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(guardado), [draft, guardado]);

  // Libera la URL de la vista previa cuando cambia o al salir de la pantalla.
  useEffect(() => {
    if (!previa) return;

    return () => URL.revokeObjectURL(previa);
  }, [previa]);

  function elegir(nuevo: File | null) {
    setArchivo(nuevo);
    setPrevia(nuevo ? URL.createObjectURL(nuevo) : null);
  }

  function set<K extends keyof EmpresaDraft>(campo: K, valor: string) {
    setDraft((actual) => ({ ...actual, [campo]: valor }));
    setAviso(null);
  }

  function manejarNoAutorizado(error: unknown): boolean {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      router.replace("/login");
      router.refresh();

      return true;
    }

    return false;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const errores: ErroresValidacion = {};
    if (!draft.nombre.trim()) errores.nombre = ["Escribe el nombre de la empresa."];

    if (Object.keys(errores).length > 0) {
      applyFieldErrors(errores, "Revisa los datos de la empresa.");

      return;
    }

    setPending(true);
    reset();
    setAviso(null);

    try {
      const actualizada = await empresaApi.update(empresaPayload(draft));
      const nuevo = empresaDraft(actualizada);

      setEmpresa(actualizada);
      setDraft(nuevo);
      setGuardado(nuevo);
      setAviso("Datos guardados.");
      announce("Datos de la empresa guardados.");
      router.refresh();
    } catch (error) {
      if (manejarNoAutorizado(error)) return;

      applyFieldErrors(
        isApiError(error) ? (error.errors ?? {}) : {},
        apiErrorMessage(error, "No pudimos guardar los datos de la empresa."),
      );
    } finally {
      setPending(false);
    }
  }

  function elegirArchivo(event: React.ChangeEvent<HTMLInputElement>) {
    const elegido = event.target.files?.[0] ?? null;
    setLogoError(null);

    if (!elegido) {
      elegir(null);

      return;
    }

    const error = validarLogo(elegido);

    if (error) {
      elegir(null);
      setLogoError(error);
      event.target.value = "";

      return;
    }

    elegir(elegido);
  }

  async function subirLogo() {
    if (!archivo || logoPending) return;

    setLogoPending(true);
    setLogoError(null);

    try {
      const actualizada = await empresaApi.subirLogo(archivo);

      setEmpresa(actualizada);
      elegir(null);
      if (inputRef.current) inputRef.current.value = "";
      announce("Logo actualizado.");
    } catch (error) {
      if (manejarNoAutorizado(error)) return;

      const errores = isApiError(error) ? error.errors : undefined;
      setLogoError(firstError(errores ?? {}, "logo") ?? apiErrorMessage(error, "No pudimos subir el logo."));
    } finally {
      setLogoPending(false);
    }
  }

  async function quitarLogo() {
    setLogoPending(true);
    setLogoError(null);

    try {
      const actualizada = await empresaApi.eliminarLogo();

      setEmpresa(actualizada);
      setConfirmarQuitar(false);
      announce("Logo quitado.");
    } catch (error) {
      if (manejarNoAutorizado(error)) return;

      setLogoError(apiErrorMessage(error, "No pudimos quitar el logo."));
    } finally {
      setLogoPending(false);
    }
  }

  const imagen = previa ?? empresa.logo_url;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        aria-label="Datos de la empresa"
        className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5"
      >
        <div>
          <h2 className="text-base font-semibold text-foreground">Datos de la empresa</h2>
          <p className="text-sm text-muted">
            Salen en el PDF de las proformas. El teléfono y el correo también se muestran
            a los clientes en el portal.
          </p>
        </div>

        <FormErrorSummary count={fieldErrorCount} message={message} />
        {message && fieldErrorCount === 0 ? (
          <Alert status="danger" role="alert">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <TextFieldControl
          name="nombre"
          label="Nombre"
          value={draft.nombre}
          onChange={(v) => set("nombre", v)}
          error={firstError(fieldErrors, "nombre")}
          isRequired
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextFieldControl
            name="nit"
            label="NIT"
            value={draft.nit}
            onChange={(v) => set("nit", v)}
            error={firstError(fieldErrors, "nit")}
          />
          <TextFieldControl
            name="telefono"
            label="Teléfono"
            type="tel"
            value={draft.telefono}
            onChange={(v) => set("telefono", v)}
            error={firstError(fieldErrors, "telefono")}
          />
        </div>
        <TextFieldControl
          name="email"
          label="Correo"
          type="email"
          value={draft.email}
          onChange={(v) => set("email", v)}
          error={firstError(fieldErrors, "email")}
        />
        <TextFieldControl
          name="direccion"
          label="Dirección"
          value={draft.direccion}
          onChange={(v) => set("direccion", v)}
          error={firstError(fieldErrors, "direccion")}
        />
        <TextAreaControl
          name="condiciones"
          label="Condiciones"
          value={draft.condiciones}
          onChange={(v) => set("condiciones", v)}
          error={firstError(fieldErrors, "condiciones")}
          rows={4}
          description="Texto que va al pie del PDF de cada proforma."
        />

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {aviso ? (
            <p role="status" className="text-sm text-success-soft-foreground">
              {aviso}
            </p>
          ) : null}
          <Button type="submit" variant="primary" isDisabled={pending || !isDirty}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>

      <section
        aria-labelledby="logo-titulo"
        className="flex flex-col gap-4 self-start rounded-xl border border-border bg-surface p-5"
      >
        <div>
          <h2 id="logo-titulo" className="text-base font-semibold text-foreground">
            Logo
          </h2>
          <p className="text-sm text-muted">PNG o JPG, hasta 1 MB. Sale arriba en el PDF.</p>
        </div>

        <div className="grid h-32 place-items-center rounded-lg border border-dashed border-border bg-surface-secondary/50 p-3">
          {imagen ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa local o del back
            <img
              src={imagen}
              alt={previa ? "Vista previa del logo nuevo" : "Logo actual de la empresa"}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm text-muted">
              <ImageIcon aria-hidden className="size-6" />
              Sin logo
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="logo-archivo" className="text-sm font-medium text-foreground">
            Elegir imagen
          </label>
          <input
            ref={inputRef}
            id="logo-archivo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg"
            onChange={elegirArchivo}
            aria-invalid={logoError ? true : undefined}
            aria-describedby={logoError ? "logo-error" : undefined}
            className="text-sm text-foreground file:me-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
          />
          {logoError ? (
            <p id="logo-error" role="alert" className="text-xs text-danger">
              {logoError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" isDisabled={!archivo || logoPending} onPress={subirLogo}>
            <Upload aria-hidden className="size-4" />
            {logoPending && archivo ? "Subiendo…" : "Subir logo"}
          </Button>
          {empresa.logo_url ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              isDisabled={logoPending}
              onPress={() => setConfirmarQuitar(true)}
            >
              <Trash2 aria-hidden className="size-4" />
              Quitar logo
            </Button>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmarQuitar}
        onOpenChange={setConfirmarQuitar}
        title="¿Quitar el logo?"
        description="El PDF de las proformas dejará de mostrar el logo hasta que subas otro."
        confirmLabel="Quitar logo"
        tone="danger"
        isPending={logoPending}
        onConfirm={quitarLogo}
      />
    </div>
  );
}
