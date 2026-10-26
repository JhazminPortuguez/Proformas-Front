"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@heroui/react";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { DrawerActions, FormDrawer } from "@/components/ui/form-drawer";
import { TextAreaControl, TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { solicitudes as solicitudesApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Cliente, ErroresValidacion, SolicitudInput } from "@/lib/api/types";
import { parseCantidad } from "@/lib/proformas";
import { firstError } from "@/lib/utils";

interface DraftItem {
  key: string;
  descripcion: string;
  cantidad: string;
  unidad_medida: string;
  observaciones: string;
}

interface FormState {
  clienteId: string;
  descripcion: string;
  items: DraftItem[];
}

interface SolicitudFormDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  clientes: Cliente[];
  onSaved: () => void;
}

let sequence = 0;

function nextKey(): string {
  sequence += 1;

  return `solicitud-item-${sequence}`;
}

function newItem(): DraftItem {
  return {
    key: nextKey(),
    descripcion: "",
    cantidad: "1",
    unidad_medida: "",
    observaciones: "",
  };
}

function initialState(): FormState {
  return { clienteId: "", descripcion: "", items: [newItem()] };
}

export function SolicitudFormDrawer({
  isOpen,
  onOpenChange,
  clientes,
  onSaved,
}: SolicitudFormDrawerProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [initial] = useState<FormState>(initialState);
  const [form, setForm] = useState<FormState>(initial);
  const [pending, setPending] = useState(false);
  const {
    formRef,
    fieldErrors,
    fieldErrorCount,
    message,
    applyFieldErrors,
    reset,
  } = useFormErrors();

  const clienteOptions = clientes.map((cliente) => ({
    id: cliente.id,
    label: cliente.nombre_razon,
    description: cliente.nit_ci ? `NIT/CI ${cliente.nit_ci}` : undefined,
  }));

  const isDirty = useMemo(
    () => JSON.stringify(initial) !== JSON.stringify(form),
    [form, initial],
  );

  function updateItem<K extends keyof DraftItem>(
    key: string,
    field: K,
    value: DraftItem[K],
  ) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, newItem()],
    }));
  }

  function removeItem(key: string) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => item.key !== key),
    }));
  }

  function validate(): ErroresValidacion {
    const errors: ErroresValidacion = {};

    if (!form.clienteId) {
      errors.cliente_id = ["Selecciona el cliente que solicita la cotización."];
    }

    if (!form.descripcion.trim()) {
      errors.descripcion = ["Describe brevemente la solicitud."];
    }

    if (form.items.length === 0) {
      errors.items = ["Agrega al menos un ítem a la solicitud."];
    }

    form.items.forEach((item, index) => {
      const prefix = `items.${index}`;
      const cantidad = parseCantidad(item.cantidad);

      if (!item.descripcion.trim()) {
        errors[`${prefix}.descripcion`] = ["Describe el ítem solicitado."];
      }

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        errors[`${prefix}.cantidad`] = ["Ingresa una cantidad mayor a 0."];
      }
    });

    return errors;
  }

  function buildPayload(): SolicitudInput {
    return {
      cliente_id: Number(form.clienteId),
      descripcion: form.descripcion.trim(),
      items: form.items.map((item) => ({
        descripcion: item.descripcion.trim(),
        cantidad: parseCantidad(item.cantidad),
        unidad_medida: item.unidad_medida.trim() || null,
        observaciones: item.observaciones.trim() || null,
      })),
    };
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const localErrors = validate();

    if (Object.keys(localErrors).length > 0) {
      applyFieldErrors(localErrors, "Revisa los datos de la solicitud.");
      announce("Revisa los campos marcados antes de guardar la solicitud.");

      return;
    }

    setPending(true);
    reset();

    try {
      const solicitud = await solicitudesApi.create(buildPayload());

      announce(
        solicitud.numero
          ? `Solicitud ${solicitud.numero} creada.`
          : "Solicitud creada.",
      );
      onSaved();
    } catch (caught) {
      if (
        isApiError(caught) &&
        (caught.status === 401 || caught.status === 419)
      ) {
        router.replace("/login");
        router.refresh();

        return;
      }

      applyFieldErrors(
        isApiError(caught) ? (caught.errors ?? {}) : {},
        apiErrorMessage(caught, "No pudimos crear la solicitud."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDrawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Nueva solicitud"
      description="Registra lo que pide el cliente. Luego se convierte en una proforma en borrador."
      onSubmit={onSubmit}
      isPending={pending}
      error={message}
      fieldErrorCount={fieldErrorCount}
      isDirty={isDirty}
      formRef={formRef}
      size="lg"
      footer={
        <DrawerActions
          isPending={pending}
          onCancel={() => onOpenChange(false)}
          submitLabel="Crear solicitud"
          pendingLabel="Creando…"
        />
      }
    >
      <CatalogSelect
        name="cliente_id"
        label="Cliente"
        value={form.clienteId}
        onChange={(value) =>
          setForm((current) => ({ ...current, clienteId: value }))
        }
        options={clienteOptions}
        error={firstError(fieldErrors, "cliente_id")}
        placeholder="Buscar por nombre o NIT…"
        isRequired
      />

      <TextAreaControl
        name="descripcion"
        label="Descripción de la solicitud"
        value={form.descripcion}
        onChange={(value) =>
          setForm((current) => ({ ...current, descripcion: value }))
        }
        error={firstError(fieldErrors, "descripcion")}
        rows={3}
        placeholder="Qué necesita el cliente y para cuándo…"
        isRequired
      />

      <div className="space-y-3" data-field="items">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Ítems</h2>
            <p className="text-xs text-muted">
              Detalle simple; el precio se define al convertir en proforma.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onPress={addItem}
          >
            <Plus aria-hidden className="size-4" />
            Agregar ítem
          </Button>
        </div>

        {firstError(fieldErrors, "items") ? (
          <p role="alert" className="text-sm text-danger">
            {firstError(fieldErrors, "items")}
          </p>
        ) : null}

        <ul className="space-y-3">
          {form.items.map((item, index) => {
            const prefix = `items.${index}`;

            return (
              <li
                key={item.key}
                className="rounded-xl border border-border bg-surface p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted">
                    Ítem {index + 1}
                  </span>

                  {form.items.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      className="size-8 text-danger"
                      aria-label={`Quitar ítem ${index + 1}`}
                      onPress={() => removeItem(item.key)}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-6">
                  <div className="sm:col-span-6">
                    <TextFieldControl
                      name={`${prefix}.descripcion`}
                      label="Descripción"
                      value={item.descripcion}
                      onChange={(value) =>
                        updateItem(item.key, "descripcion", value)
                      }
                      error={firstError(
                        fieldErrors,
                        `${prefix}.descripcion`,
                      )}
                      placeholder="Qué se necesita…"
                      isRequired
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <TextFieldControl
                      name={`${prefix}.cantidad`}
                      label="Cantidad"
                      value={item.cantidad}
                      onChange={(value) =>
                        updateItem(item.key, "cantidad", value)
                      }
                      error={firstError(fieldErrors, `${prefix}.cantidad`)}
                      inputMode="decimal"
                      isRequired
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <TextFieldControl
                      name={`${prefix}.unidad_medida`}
                      label="Unidad"
                      value={item.unidad_medida}
                      onChange={(value) =>
                        updateItem(item.key, "unidad_medida", value)
                      }
                      error={firstError(
                        fieldErrors,
                        `${prefix}.unidad_medida`,
                      )}
                      placeholder="unidad, hora, m²…"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <TextFieldControl
                      name={`${prefix}.observaciones`}
                      label="Observaciones"
                      value={item.observaciones}
                      onChange={(value) =>
                        updateItem(item.key, "observaciones", value)
                      }
                      error={firstError(
                        fieldErrors,
                        `${prefix}.observaciones`,
                      )}
                      placeholder="Opcional."
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </FormDrawer>
  );
}
