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

interface AjustarStockDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  productos: readonly ProductoCatalogOption[];
  productoId?: number | null;
  onSaved?: () => void;
}

export function AjustarStockDialog({
  isOpen,
  onOpenChange,
  productos,
  productoId = null,
  onSaved,
}: AjustarStockDialogProps) {
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
  const [stockNuevo, setStockNuevo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [pending, setPending] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open && pending) return;

    onOpenChange(open);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const stockNumero = parseDecimal(stockNuevo);
    const errors: ErroresValidacion = {};

    if (!producto) {
      errors.producto_id = ["Selecciona el producto a ajustar."];
    }

    if (!Number.isFinite(stockNumero) || stockNumero < 0) {
      errors.stock_nuevo = ["Indica un stock final igual o mayor a cero."];
    }

    if (motivo.trim().length < 3) {
      errors.motivo = ["Explica el motivo del ajuste (mínimo 3 caracteres)."];
    }

    if (Object.keys(errors).length > 0) {
      applyFieldErrors(errors, "Revisa los datos del ajuste.");

      return;
    }

    setPending(true);
    reset();

    try {
      await inventarioApi.ajuste({
        producto_id: Number(producto),
        stock_nuevo: stockNumero,
        motivo: motivo.trim(),
      });

      announce(
        `Stock ajustado a ${formatNumber(stockNumero)} unidades.`,
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
            apiErrorMessage(caught, "Revisa los datos del ajuste."),
        );
      } else if (isApiError(caught) && caught.status === 403) {
        applyFieldErrors(
          {},
          "Solo un administrador puede ajustar el stock.",
        );
      } else {
        applyFieldErrors(
          {},
          apiErrorMessage(caught, "No pudimos ajustar el stock."),
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
                <Modal.Heading>Ajustar stock</Modal.Heading>
                <p className="text-sm text-muted">
                  Fija el stock final tras un conteo físico. El motivo queda
                  registrado en el historial de movimientos.
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
                      <Alert.Title>No se pudo ajustar el stock</Alert.Title>
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

                <TextFieldControl
                  name="stock_nuevo"
                  label="Stock final"
                  value={stockNuevo}
                  onChange={setStockNuevo}
                  inputMode="decimal"
                  placeholder="0"
                  description="Cantidad real contada en el almacén."
                  error={fieldErrors.stock_nuevo?.[0]}
                  isRequired
                  isDisabled={pending}
                />

                <TextAreaControl
                  name="motivo"
                  label="Motivo del ajuste"
                  value={motivo}
                  onChange={setMotivo}
                  rows={3}
                  placeholder="Conteo físico, merma, daño, corrección de carga…"
                  error={fieldErrors.motivo?.[0]}
                  isRequired
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
                  {pending ? "Ajustando…" : "Ajustar stock"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
