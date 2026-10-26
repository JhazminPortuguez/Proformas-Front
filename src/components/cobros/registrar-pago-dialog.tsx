"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Modal } from "@heroui/react";
import { Plus } from "lucide-react";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { SelectControl, TextAreaControl, TextFieldControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { cuentas as cuentasApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { CuentaPorCobrar, ErroresValidacion, MetodoPago } from "@/lib/api/types";
import {
  METODO_PAGO_OPTIONS,
  cuentaSaldo,
  fechaHoyDateOnly,
} from "@/lib/cobros";
import { formatMoney, parseDecimal } from "@/lib/utils";

export type CuentaPagoResumen = Pick<
  CuentaPorCobrar,
  "id" | "numero" | "saldo" | "monto_total" | "total_pagado" | "moneda"
>;

interface RegistrarPagoDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  cuenta: CuentaPagoResumen | null;
  onSaved?: () => void;
}

/**
 * Registro de un pago (total o parcial) contra una cuenta por cobrar.
 *
 * El saldo se valida también en cliente para dar feedback inmediato; el
 * backend sigue siendo la autoridad y sus 422 se muestran junto al campo.
 */
export function RegistrarPagoDialog({
  isOpen,
  onOpenChange,
  cuenta,
  onSaved,
}: RegistrarPagoDialogProps) {
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

  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [fechaPago, setFechaPago] = useState(fechaHoyDateOnly());
  const [referencia, setReferencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [pending, setPending] = useState(false);

  const saldo = cuenta ? cuentaSaldo(cuenta) : 0;

  function clearFields() {
    setMonto("");
    setMetodo("EFECTIVO");
    setFechaPago(fechaHoyDateOnly());
    setReferencia("");
    setObservaciones("");
    reset();
  }

  function handleOpenChange(open: boolean) {
    if (!open && pending) return;

    if (!open) clearFields();

    onOpenChange(open);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cuenta) return;

    const montoNumero = parseDecimal(monto);
    const errors: ErroresValidacion = {};

    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      errors.monto = ["Indica un monto mayor a cero."];
    } else if (montoNumero > saldo + 0.005) {
      errors.monto = [
        `El monto no puede superar el saldo pendiente (${formatMoney(saldo)}).`,
      ];
    }

    if (!METODO_PAGO_OPTIONS.some((option) => option.value === metodo)) {
      errors.metodo = ["Selecciona el método con el que se recibió el pago."];
    }

    if (Object.keys(errors).length > 0) {
      applyFieldErrors(errors, "Revisa los datos del pago.");

      return;
    }

    setPending(true);
    reset();

    try {
      await cuentasApi.registrarPago(cuenta.id, {
        monto: montoNumero,
        metodo,
        ...(fechaPago.trim() ? { fecha_pago: fechaPago.trim() } : {}),
        ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
        ...(observaciones.trim()
          ? { observaciones: observaciones.trim() }
          : {}),
      });

      announce(
        `Pago de ${formatMoney(montoNumero)} registrado en la cuenta ${cuenta.numero}.`,
      );
      clearFields();
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
          primerMensaje ?? apiErrorMessage(caught, "Revisa los datos del pago."),
        );
      } else if (isApiError(caught) && caught.status === 403) {
        applyFieldErrors(
          {},
          "No tienes permisos para registrar pagos en esta cuenta.",
        );
      } else {
        applyFieldErrors(
          {},
          apiErrorMessage(caught, "No pudimos registrar el pago."),
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
                <Modal.Heading>Registrar pago</Modal.Heading>
                <p className="text-sm text-muted">
                  {cuenta
                    ? `Cuenta ${cuenta.numero} · saldo pendiente ${formatMoney(
                        saldo,
                      )}.`
                    : "Selecciona una cuenta por cobrar."}
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
                      <Alert.Title>No se pudo registrar el pago</Alert.Title>
                      <Alert.Description>{message}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextFieldControl
                    name="monto"
                    label="Monto"
                    value={monto}
                    onChange={setMonto}
                    inputMode="decimal"
                    placeholder="0,00"
                    description={`Saldo disponible: ${formatMoney(saldo)}`}
                    error={fieldErrors.monto?.[0]}
                    isRequired
                    isDisabled={pending}
                  />

                  <SelectControl
                    name="metodo"
                    label="Método de pago"
                    value={metodo}
                    onChange={(value) => setMetodo(value as MetodoPago)}
                    options={METODO_PAGO_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    error={fieldErrors.metodo?.[0]}
                    isRequired
                    isDisabled={pending}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextFieldControl
                    name="fecha_pago"
                    label="Fecha del pago"
                    type="date"
                    value={fechaPago}
                    onChange={setFechaPago}
                    error={fieldErrors.fecha_pago?.[0]}
                    isDisabled={pending}
                  />

                  <TextFieldControl
                    name="referencia"
                    label="Referencia (opcional)"
                    value={referencia}
                    onChange={setReferencia}
                    placeholder="N.º de transferencia o comprobante"
                    error={fieldErrors.referencia?.[0]}
                    isDisabled={pending}
                  />
                </div>

                <TextAreaControl
                  name="observaciones"
                  label="Observaciones (opcional)"
                  value={observaciones}
                  onChange={setObservaciones}
                  rows={2}
                  placeholder="Acuerdo de pago, retraso, detalle del depósito…"
                  error={fieldErrors.observaciones?.[0]}
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
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={pending || !cuenta}
                >
                  {pending ? "Registrando…" : "Registrar pago"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

interface RegistrarPagoActionProps {
  cuenta: CuentaPagoResumen;
}

/** Botón de cabecera del detalle: abre el diálogo y refresca al guardar. */
export function RegistrarPagoAction({ cuenta }: RegistrarPagoActionProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" size="md" onPress={() => setOpen(true)}>
        <Plus aria-hidden className="size-4" />
        Registrar pago
      </Button>

      <RegistrarPagoDialog
        isOpen={open}
        onOpenChange={setOpen}
        cuenta={cuenta}
      />
    </>
  );
}
