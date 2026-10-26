"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Modal } from "@heroui/react";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { TextAreaControl, TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { inventario as inventarioApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { ErroresValidacion } from "@/lib/api/types";
import type { ProductoCatalogOption } from "@/lib/inventario";
import { formatNumber, parseDecimal } from "@/lib/utils";

interface RegistrarEntradaDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  productos: readonly ProductoCatalogOption[];
  /** Producto de la fila desde la que se abrió el diálogo. */
  productoId?: number | null;
  onSaved?: () => void;
}

export function RegistrarEntradaDialog({
  isOpen,
  onOpenChange,
  productos,
  productoId = null,
  onSaved,
}: RegistrarEntradaDialogProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [, startTransition] = useTransition();
  const {
    formRef,
    fieldErrors,
    fieldErrorCount,
    message,
    applyFieldErrors,
    reset,
  } = useFormErrors();

  const [producto, setProducto] = useState(
    productoId ? String(productoId) : "",
  );
  const [cantidad, setCantidad] = useState("");
  const [costo, setCosto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [pending, setPending] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open && pending) return;

    onOpenChange(open);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cantidadNumero = parseDecimal(cantidad);
    const costoNumero = costo.trim() ? parseDecimal(costo) : undefined;
    const errors: ErroresValidacion = {};

    if (!producto) {
      errors.producto_id = ["Selecciona el producto que ingresa."];
    }

    if (!Number.isFinite(cantidadNumero) || cantidadNumero <= 0) {
      errors.cantidad = ["Indica una cantidad mayor a cero."];
    }

    if (
      costoNumero !== undefined &&
      (!Number.isFinite(costoNumero) || costoNumero < 0)
    ) {
      errors.costo_unitario = ["El costo no puede ser negativo."];
    }

    if (Object.keys(errors).length > 0) {
      applyFieldErrors(errors, "Revisa los datos de la entrada.");

      return;
    }

    setPending(true);
    reset();

    try {
      await inventarioApi.entrada({
        producto_id: Number(producto),
        cantidad: cantidadNumero,
        ...(costoNumero !== undefined
          ? { costo_unitario: costoNumero }
          : {}),
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
      });

      announce(
        `Entrada de ${formatNumber(cantidadNumero)} registrada en inventario.`,
      );
      onSaved?.();
      startTransition(() => router.refresh());
      onOpenChange(false);
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
        const primerMensaje = Object.values(caught.errors ?? {}).flat()[0];

        applyFieldErrors(
          caught.errors ?? {},
          primerMensaje ??
            apiErrorMessage(caught, "Revisa los datos de la entrada."),
        );
      } else if (isApiError(caught) && caught.status === 403) {
        applyFieldErrors(
          {},
          "Solo un administrador puede registrar entradas de inventario.",
        );
      } else {
        applyFieldErrors(
          {},
          apiErrorMessage(caught, "No pudimos registrar la entrada."),
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Trigger className="hidden" tabIndex={0}>
        Abrir diálogo
      </Modal.Trigger>
      <Modal.Backdrop isDismissable={!pending}>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog aria-busy={pending}>
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col"
            >
              <Modal.Header>
                <Modal.Heading>Registrar entrada de stock</Modal.Heading>
                <p className="text-sm text-muted">
                  Suma unidades al producto y deja el movimiento en el
                  historial de inventario.
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
                      <Alert.Title>No se pudo registrar la entrada</Alert.Title>
                      <Alert.Description>{message}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}

                <CatalogSelect
                  name="producto_id"
                  label="Producto"
                  value={producto}
                  onChange={setProducto}
                  options={productos}
                  error={fieldErrors.producto_id?.[0]}
                  placeholder="Buscar producto…"
                  isRequired
                  isDisabled={pending}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextFieldControl
                    name="cantidad"
                    label="Cantidad"
                    value={cantidad}
                    onChange={setCantidad}
                    inputMode="decimal"
                    placeholder="0"
                    error={fieldErrors.cantidad?.[0]}
                    isRequired
                    isDisabled={pending}
                  />

                  <TextFieldControl
                    name="costo_unitario"
                    label="Costo unitario (opcional)"
                    value={costo}
                    onChange={setCosto}
                    inputMode="decimal"
                    placeholder="0,00"
                    description="Si se omite, se conserva el costo promedio."
                    error={fieldErrors.costo_unitario?.[0]}
                    isDisabled={pending}
                  />
                </div>

                <TextAreaControl
                  name="motivo"
                  label="Motivo (opcional)"
                  value={motivo}
                  onChange={setMotivo}
                  rows={2}
                  placeholder="Compra a proveedor, reposición, devolución…"
                  error={fieldErrors.motivo?.[0]}
                  isDisabled={pending}
                />
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
                  {pending ? "Registrando…" : "Registrar entrada"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
