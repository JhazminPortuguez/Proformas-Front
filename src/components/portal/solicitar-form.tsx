"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Alert, Button } from "@heroui/react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { TextAreaControl, TextFieldControl } from "@/components/ui/fields";
import { SolicitudEstadoChip } from "@/components/ui/status-chip";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { portal as portalApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  ErroresValidacion,
  PortalServicio,
  PortalSolicitud,
  PortalSolicitudInput,
} from "@/lib/api/types";
import { parseCantidad } from "@/lib/proformas";
import { firstError, formatDateTimeNumeric } from "@/lib/utils";

interface DraftItem {
  key: string;
  descripcion: string;
  cantidad: string;
  unidad_medida: string;
  observaciones: string;
}

let sequence = 0;

function newItem(descripcion = ""): DraftItem {
  sequence += 1;

  return {
    key: `portal-item-${sequence}`,
    descripcion,
    cantidad: "1",
    unidad_medida: "",
    observaciones: "",
  };
}

const LINK_SECUNDARIO =
  "inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Solicitud de cotización del cliente: descripción e ítems, igual que el
 * modelo real. Si llega desde el catálogo, el servicio entra como primer ítem
 * con su nombre.
 */
export function SolicitarForm({ servicio }: { servicio?: PortalServicio | null }) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [descripcion, setDescripcion] = useState("");
  const [items, setItems] = useState<DraftItem[]>(() => [
    newItem(servicio?.nombre ?? ""),
  ]);
  const [pending, setPending] = useState(false);
  const [enviada, setEnviada] = useState<PortalSolicitud | null>(null);
  const { formRef, fieldErrors, fieldErrorCount, message, applyFieldErrors, reset } =
    useFormErrors();

  function updateItem<K extends keyof DraftItem>(key: string, field: K, value: DraftItem[K]) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    );
  }

  function validate(): ErroresValidacion {
    const errors: ErroresValidacion = {};

    if (!descripcion.trim()) {
      errors.descripcion = ["Cuéntanos qué necesitas."];
    }

    if (items.length === 0) {
      errors.items = ["Agrega al menos un ítem."];
    }

    items.forEach((item, index) => {
      const cantidad = parseCantidad(item.cantidad);

      if (!item.descripcion.trim()) {
        errors[`items.${index}.descripcion`] = ["Describe el ítem."];
      }

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        errors[`items.${index}.cantidad`] = ["Ingresa una cantidad mayor a 0."];
      }
    });

    return errors;
  }

  function payload(): PortalSolicitudInput {
    return {
      descripcion: descripcion.trim(),
      items: items.map((item) => ({
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
      applyFieldErrors(localErrors, "Revisa los datos de tu solicitud.");
      announce("Revisa los campos marcados antes de enviar la solicitud.");

      return;
    }

    setPending(true);
    reset();

    try {
      const solicitud = await portalApi.crearSolicitud(payload());

      setEnviada(solicitud);
      announce("Recibimos tu solicitud. Estado: Pendiente.");
      router.refresh();
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      applyFieldErrors(
        isApiError(caught) ? (caught.errors ?? {}) : {},
        apiErrorMessage(caught, "No pudimos enviar tu solicitud. Intenta nuevamente."),
      );
    } finally {
      setPending(false);
    }
  }

  if (enviada) {
    return (
      <section
        aria-labelledby="solicitud-enviada"
        className="flex flex-col items-start gap-4 rounded-xl border border-border bg-surface p-6"
      >
        <span className="grid size-10 place-items-center rounded-full bg-success-soft text-success-soft-foreground">
          <CheckCircle2 aria-hidden className="size-5" />
        </span>
        <div className="space-y-1">
          <h2 id="solicitud-enviada" className="text-lg font-semibold text-foreground">
            Recibimos tu solicitud
          </h2>
          <p className="text-sm text-muted">
            Fecha de recepción:{" "}
            <span className="numeric text-foreground">
              {formatDateTimeNumeric(enviada.fecha)}
            </span>
          </p>
          <p className="flex items-center gap-2 text-sm text-muted">
            Estado: <SolicitudEstadoChip estado={enviada.estado} />
          </p>
          <p className="text-sm text-muted">
            Te avisaremos cuando la proforma esté lista.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/portal/solicitudes/${enviada.id}`} className={LINK_SECUNDARIO}>
            Ver la solicitud
          </Link>
          <Link href="/portal/solicitudes" className={LINK_SECUNDARIO}>
            Mis solicitudes
          </Link>
          <Button
            variant="ghost"
            onPress={() => {
              setEnviada(null);
              setDescripcion("");
              setItems([newItem()]);
            }}
          >
            Enviar otra solicitud
          </Button>
        </div>
      </section>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FormErrorSummary count={fieldErrorCount} message={message} />

      {message && fieldErrorCount === 0 ? (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <TextAreaControl
        name="descripcion"
        label="¿Qué necesitas?"
        value={descripcion}
        onChange={setDescripcion}
        error={firstError(fieldErrors, "descripcion")}
        rows={4}
        placeholder="Describe el trabajo, el lugar y para cuándo lo necesitas…"
        isRequired
      />

      <section aria-labelledby="items-titulo" className="space-y-3" data-field="items">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="items-titulo" className="text-sm font-semibold text-foreground">
              Ítems
            </h2>
            <p className="text-xs text-muted">
              Lo que necesitas cotizar. El precio lo define la empresa en la proforma.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onPress={() => setItems((current) => [...current, newItem()])}
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
          {items.map((item, index) => {
            const prefix = `items.${index}`;

            return (
              <li key={item.key} className="rounded-xl border border-border bg-surface p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted">Ítem {index + 1}</span>
                  {items.length > 1 ? (
                    <ActionTooltip label="Quitar ítem">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        className="size-8 text-danger"
                        aria-label={`Quitar ítem ${index + 1}`}
                        onPress={() =>
                          setItems((current) => current.filter((i) => i.key !== item.key))
                        }
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </Button>
                    </ActionTooltip>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-6">
                  <div className="sm:col-span-6">
                    <TextFieldControl
                      name={`${prefix}.descripcion`}
                      label="Descripción"
                      value={item.descripcion}
                      onChange={(value) => updateItem(item.key, "descripcion", value)}
                      error={firstError(fieldErrors, `${prefix}.descripcion`)}
                      placeholder="Qué se necesita…"
                      isRequired
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextFieldControl
                      name={`${prefix}.cantidad`}
                      label="Cantidad"
                      value={item.cantidad}
                      onChange={(value) => updateItem(item.key, "cantidad", value)}
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
                      onChange={(value) => updateItem(item.key, "unidad_medida", value)}
                      error={firstError(fieldErrors, `${prefix}.unidad_medida`)}
                      placeholder="Pza, metro, global…"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <TextFieldControl
                      name={`${prefix}.observaciones`}
                      label="Observaciones"
                      value={item.observaciones}
                      onChange={(value) => updateItem(item.key, "observaciones", value)}
                      error={firstError(fieldErrors, `${prefix}.observaciones`)}
                      placeholder="Opcional."
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Link href="/portal" className={LINK_SECUNDARIO}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" isDisabled={pending}>
          {pending ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </div>
    </form>
  );
}
