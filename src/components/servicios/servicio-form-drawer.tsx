"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DrawerActions, FormDrawer } from "@/components/ui/form-drawer";
import {
  SwitchControl,
  TextAreaControl,
  TextFieldControl,
} from "@/components/ui/fields";
import { servicios as serviciosApi } from "@/lib/api/client";
import { errorMessage, isApiError } from "@/lib/api/types";
import type { ErroresValidacion, Servicio } from "@/lib/api/types";
import { firstError, parseDecimal } from "@/lib/utils";

interface FormState {
  nombre: string;
  descripcion: string;
  precio_base: string;
  duracion_estimada_min: string;
  categoria: string;
  activo: boolean;
  visible_catalogo: boolean;
}

const EMPTY: FormState = {
  nombre: "",
  descripcion: "",
  precio_base: "",
  duracion_estimada_min: "",
  categoria: "",
  activo: true,
  visible_catalogo: true,
};

interface ServicioFormDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  servicio: Servicio | null;
  onSaved: () => void;
}

export function ServicioFormDrawer({
  isOpen,
  onOpenChange,
  servicio,
  onSaved,
}: ServicioFormDrawerProps) {
  const [form, setForm] = useState<FormState>(() =>
    servicio
      ? {
          nombre: servicio.nombre,
          descripcion: servicio.descripcion ?? "",
          precio_base: String(servicio.precio_base),
          duracion_estimada_min:
            servicio.duracion_estimada_min !== null
              ? String(servicio.duracion_estimada_min)
              : "",
          categoria: servicio.categoria ?? "",
          activo: servicio.activo,
          visible_catalogo: servicio.visible_catalogo,
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

    const localErrors: ErroresValidacion = {};
    const precio = parseDecimal(form.precio_base);

    if (!form.nombre.trim()) {
      localErrors.nombre = ["El nombre del servicio es obligatorio."];
    }

    if (!form.precio_base.trim() || Number.isNaN(precio) || precio < 0) {
      localErrors.precio_base = ["Ingresa un precio válido (0 o mayor)."];
    }

    const duracion = form.duracion_estimada_min.trim()
      ? Number(form.duracion_estimada_min)
      : null;

    if (
      duracion !== null &&
      (Number.isNaN(duracion) || duracion < 1 || !Number.isInteger(duracion))
    ) {
      localErrors.duracion_estimada_min = [
        "La duración debe ser un número entero de al menos 1 minuto.",
      ];
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setError("Revisa los datos ingresados.");

      return;
    }

    setPending(true);
    setErrors({});
    setError(null);

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      precio_base: precio,
      duracion_estimada_min: duracion,
      categoria: form.categoria.trim() || null,
      activo: form.activo,
      visible_catalogo: form.visible_catalogo,
    };

    try {
      if (servicio) {
        await serviciosApi.update(servicio.id, payload);
      } else {
        await serviciosApi.create(payload);
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
      title={servicio ? "Editar servicio" : "Nuevo servicio"}
      description={
        servicio
          ? "Actualiza precio, duración y visibilidad del servicio."
          : "Agrega un servicio al catálogo interno."
      }
      onSubmit={onSubmit}
      isPending={pending}
      error={error}
      footer={
        <DrawerActions
          isPending={pending}
          onCancel={() => onOpenChange(false)}
          submitLabel={servicio ? "Guardar cambios" : "Crear servicio"}
        />
      }
    >
      <TextFieldControl
        name="nombre"
        label="Nombre del servicio"
        value={form.nombre}
        onChange={(value) => update("nombre", value)}
        error={firstError(errors, "nombre")}
        isRequired
        autoFocus
      />

      <TextAreaControl
        name="descripcion"
        label="Descripción"
        value={form.descripcion}
        onChange={(value) => update("descripcion", value)}
        error={firstError(errors, "descripcion")}
        rows={3}
        description="Se muestra en el catálogo del cliente."
      />

      <div className="grid gap-4">
        <TextFieldControl
          name="precio_base"
          label="Precio base (Bs)"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          value={form.precio_base}
          onChange={(value) => update("precio_base", value)}
          error={firstError(errors, "precio_base")}
          isRequired
        />

        <TextFieldControl
          name="duracion_estimada_min"
          label="Duración estimada (min)"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={form.duracion_estimada_min}
          onChange={(value) => update("duracion_estimada_min", value)}
          error={firstError(errors, "duracion_estimada_min")}
        />
      </div>

      <TextFieldControl
        name="categoria"
        label="Categoría"
        value={form.categoria}
        onChange={(value) => update("categoria", value)}
        error={firstError(errors, "categoria")}
        description="Ej.: Mantenimiento, Instalación, Consultoría."
      />

      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <SwitchControl
          name="activo"
          label="Servicio activo"
          isSelected={form.activo}
          onChange={(value) => update("activo", value)}
          description="Los servicios inactivos no se pueden usar en nuevas proformas."
        />

        <SwitchControl
          name="visible_catalogo"
          label="Visible en el catálogo del cliente"
          isSelected={form.visible_catalogo}
          onChange={(value) => update("visible_catalogo", value)}
          description="Controla si aparece en el portal del cliente."
        />
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {pending ? "Guardando servicio…" : ""}
      </p>
    </FormDrawer>
  );
}
