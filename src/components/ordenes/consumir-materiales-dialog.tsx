"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Modal } from "@heroui/react";
import { PackageMinus } from "lucide-react";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { ordenes as ordenesApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  ConsumoOrdenItemInput,
  ErroresValidacion,
  OrdenItem,
} from "@/lib/api/types";
import {
  materialPendienteCantidad,
  materialesPendientes,
} from "@/lib/inventario";
import { ordenItemTitle, ordenItemUnidad } from "@/lib/ordenes";
import { formatNumber, parseDecimal } from "@/lib/utils";

interface ConsumirMaterialesDialogProps {
  ordenId: number;
  numero: string;
  items: readonly OrdenItem[];
}

function cantidadesIniciales(
  items: readonly OrdenItem[],
): Record<number, string> {
  const initial: Record<number, string> = {};

  for (const item of materialesPendientes(items)) {
    initial[item.id] = String(materialPendienteCantidad(item));
  }

  return initial;
}

/**
 * Traduce los 422 de Laravel (`items.0.cantidad`) a los `data-field` del
 * formulario para que `useFormErrors` pueda enfocar la fila correcta.
 */
export function erroresConsumo(
  errors: ErroresValidacion,
  items: readonly OrdenItem[],
): ErroresValidacion {
  const pendientes = materialesPendientes(items);
  const mapped: ErroresValidacion = {};

  for (const [key, messages] of Object.entries(errors)) {
    const match = /^items[.\[](\d+)[.\]]?/.exec(key);
    const item = match ? pendientes[Number(match[1])] : undefined;

    if (item) {
      mapped[`cantidad_${item.id}`] = messages;
      continue;
    }

    mapped[key] = messages;
  }

  return mapped;
}

export function ConsumirMaterialesDialog({
  ordenId,
  numero,
  items,
}: ConsumirMaterialesDialogProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [, startTransition] = useTransition();
  const {
    formRef,
    fieldErrors,
    fieldErrorCount,
    message,
    applyFieldErrors,
    setMessage,
    reset,
  } = useFormErrors();

  const pendientes = materialesPendientes(items);
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [cantidades, setCantidades] = useState<Record<number, string>>(() =>
    cantidadesIniciales(items),
  );

  function handleOpenChange(open: boolean) {
    if (!open && pending) return;

    if (open) {
      setCantidades(cantidadesIniciales(items));
      reset();
    }

    setIsOpen(open);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: ErroresValidacion = {};
    const payload: ConsumoOrdenItemInput[] = [];

    for (const item of pendientes) {
      const raw = cantidades[item.id] ?? "";
      const valor = parseDecimal(raw);
      const pendiente = materialPendienteCantidad(item);
      const key = `cantidad_${item.id}`;

      if (!raw.trim()) {
        errors[key] = ["Indica la cantidad o escribe 0 para omitir."];
        continue;
      }

      if (!Number.isFinite(valor) || valor < 0) {
        errors[key] = ["Usa una cantidad válida."];
        continue;
      }

      if (valor > pendiente) {
        errors[key] = [
          `No superes lo pendiente (${formatNumber(pendiente)}).`,
        ];
        continue;
      }

      if (item.producto && valor > item.producto.stock_actual) {
        errors[key] = [
          `Stock insuficiente: hay ${formatNumber(
            item.producto.stock_actual,
          )} ${item.producto.unidad_medida}.`,
        ];
        continue;
      }

      if (valor > 0) {
        payload.push({ orden_item_id: item.id, cantidad: valor });
      }
    }

    if (Object.keys(errors).length > 0) {
      applyFieldErrors(errors, "Revisa las cantidades a consumir.");

      return;
    }

    if (payload.length === 0) {
      applyFieldErrors(
        {},
        "Indica al menos una cantidad mayor a cero para consumir.",
      );

      return;
    }

    setPending(true);
    reset();

    try {
      await ordenesApi.consumir(ordenId, payload);

      announce(`Materiales consumidos en la orden ${numero}.`);
      setIsOpen(false);
      startTransition(() => router.refresh());
    } catch (caught) {
      if (
        isApiError(caught) &&
        (caught.status === 401 || caught.status === 419)
      ) {
        router.replace("/login");
        router.refresh();

        return;
      }

      if (isApiError(caught) && caught.status === 422) {
        const mapped = erroresConsumo(caught.errors ?? {}, items);
        const primerMensaje = Object.values(caught.errors ?? {}).flat()[0];

        applyFieldErrors(
          mapped,
          primerMensaje ??
            apiErrorMessage(caught, "Revisa las cantidades a consumir."),
        );
      } else if (isApiError(caught) && caught.status === 403) {
        setMessage(
          "No tienes permiso para consumir materiales en esta orden.",
        );
      } else {
        setMessage(
          apiErrorMessage(caught, "No pudimos consumir los materiales."),
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="primary" size="md" onPress={() => handleOpenChange(true)}>
        <PackageMinus aria-hidden className="size-4" />
        Consumir materiales
      </Button>

      <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
        <Modal.Trigger className="hidden" tabIndex={0}>
          Abrir diálogo
        </Modal.Trigger>
        <Modal.Backdrop isDismissable={!pending}>
          <Modal.Container placement="center" size="lg">
            <Modal.Dialog aria-busy={pending}>
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col"
              >
                <Modal.Header>
                  <Modal.Heading>Consumir materiales</Modal.Heading>
                  <p className="text-sm text-muted">
                    Se descuentan las cantidades indicadas del inventario y
                    quedan registradas en el historial de la orden {numero}.
                  </p>
                </Modal.Header>

                <Modal.Body className="mt-4 flex flex-col gap-4">
                  {fieldErrorCount > 0 ? (
                    <FormErrorSummary
                      count={fieldErrorCount}
                      message={message}
                    />
                  ) : message ? (
                    <Alert status="danger" role="alert">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>
                          No se pudieron consumir los materiales
                        </Alert.Title>
                        <Alert.Description>{message}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  ) : null}

                  <div className="flex flex-col gap-3">
                    {pendientes.map((item) => {
                      const pendiente = materialPendienteCantidad(item);
                      const stock = item.producto?.stock_actual ?? 0;
                      const unidad = ordenItemUnidad(item);

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-border bg-surface-secondary/40 p-3"
                        >
                          <TextFieldControl
                            name={`cantidad_${item.id}`}
                            label={`Cantidad de ${ordenItemTitle(item)}`}
                            value={cantidades[item.id] ?? ""}
                            onChange={(value) =>
                              setCantidades((current) => ({
                                ...current,
                                [item.id]: value,
                              }))
                            }
                            inputMode="decimal"
                            description={`Pendiente: ${formatNumber(
                              pendiente,
                            )} ${unidad} · Stock actual: ${formatNumber(
                              stock,
                            )} ${unidad}`}
                            error={fieldErrors[`cantidad_${item.id}`]?.[0]}
                            isDisabled={pending}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-muted">
                    Deja una cantidad en 0 para no consumir esa línea. Las
                    líneas sin pendiente no se muestran.
                  </p>
                </Modal.Body>

                <Modal.Footer className="mt-5 justify-end gap-2">
                  <Button
                    type="button"
                    variant="tertiary"
                    onPress={() => handleOpenChange(false)}
                    isDisabled={pending}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={pending}>
                    {pending ? "Consumiendo…" : "Consumir materiales"}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
