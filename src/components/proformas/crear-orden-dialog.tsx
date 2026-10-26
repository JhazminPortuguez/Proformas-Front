"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Alert, Button, Modal } from "@heroui/react";
import { FormErrorSummary } from "@/components/ui/form-errors";
import {
  SelectControl,
  TextAreaControl,
  TextFieldControl,
} from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { useFormErrors } from "@/lib/hooks/use-form-errors";
import { ordenes as ordenesApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { OrdenInput, User } from "@/lib/api/types";
import { isValidDateOnly } from "@/lib/proformas";

interface CrearOrdenDialogProps {
  proformaId: number;
  proformaNumero: string;
  /** Solo admin recibe la lista; sin ella el formulario no muestra operario. */
  operarios?: readonly User[];
  /** Abre el formulario al entrar (por ejemplo desde el listado de proformas). */
  autoOpen?: boolean;
}

export function CrearOrdenDialog({
  proformaId,
  proformaNumero,
  operarios = [],
  autoOpen = false,
}: CrearOrdenDialogProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [, startTransition] = useTransition();
  const { formRef, fieldErrors, fieldErrorCount, message, applyFieldErrors, reset } =
    useFormErrors();

  const [isOpen, setIsOpen] = useState(autoOpen);
  const [pending, setPending] = useState(false);
  const [fecha, setFecha] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [operarioId, setOperarioId] = useState("");

  const operarioOptions = [
    { value: "", label: "Sin asignar" },
    ...operarios.map((operario) => ({
      value: String(operario.id),
      label: operario.name,
    })),
  ];

  function handleOpenChange(open: boolean) {
    if (!open && pending) return;

    setIsOpen(open);

    if (!open) {
      reset();
      setFecha("");
      setObservaciones("");
      setOperarioId("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (fecha.trim() && !isValidDateOnly(fecha.trim())) {
      applyFieldErrors({
        fecha_programada: ["Usa una fecha válida (AAAA-MM-DD)."],
      });

      return;
    }

    setPending(true);
    reset();

    const payload: OrdenInput = { proforma_id: proformaId };

    if (fecha.trim()) payload.fecha_programada = fecha.trim();
    if (observaciones.trim()) payload.observaciones = observaciones.trim();
    if (operarioId) payload.operario_id = Number(operarioId);

    try {
      const orden = await ordenesApi.create(payload);

      announce(`Orden ${orden.numero} creada.`);
      setIsOpen(false);
      setFecha("");
      setObservaciones("");
      setOperarioId("");
      router.push(`/ordenes/${orden.id}`);
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
        const errors = caught.errors ?? {};
        const primerMensaje = Object.values(errors).flat()[0];

        applyFieldErrors(
          errors,
          primerMensaje ?? apiErrorMessage(caught, "Revisa los datos de la orden."),
        );
      } else if (isApiError(caught) && caught.status === 403) {
        setPending(false);
        applyFieldErrors({}, "No tienes permisos para crear órdenes.");
      } else {
        setPending(false);
        applyFieldErrors({}, apiErrorMessage(caught, "No pudimos crear la orden."));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="primary" size="sm" onPress={() => setIsOpen(true)}>
        <Plus aria-hidden className="size-4" />
        Crear orden
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleOpenChange(false);
          }
        }}
      >
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
                  <Modal.Heading>Crear orden de servicio</Modal.Heading>
                  <p className="text-sm text-muted">
                    Se generará una orden con los ítems de la proforma{" "}
                    {proformaNumero}. La proforma ya está aceptada.
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
                        <Alert.Title>No se pudo crear la orden</Alert.Title>
                        <Alert.Description>{message}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  ) : null}

                  <TextFieldControl
                    name="fecha_programada"
                    label="Fecha programada"
                    type="date"
                    value={fecha}
                    onChange={setFecha}
                    description="Opcional. Sirve para agendar la visita o el trabajo."
                    error={fieldErrors.fecha_programada?.[0]}
                    isDisabled={pending}
                  />

                  {operarios.length > 0 ? (
                    <SelectControl
                      name="operario_id"
                      label="Operario"
                      value={operarioId}
                      onChange={setOperarioId}
                      options={operarioOptions}
                      description="Opcional. Si lo asignas ahora, la orden nace como Asignada."
                      error={fieldErrors.operario_id?.[0]}
                      isDisabled={pending}
                    />
                  ) : null}

                  <TextAreaControl
                    name="observaciones"
                    label="Observaciones"
                    value={observaciones}
                    onChange={setObservaciones}
                    rows={3}
                    placeholder="Indicaciones para el operario, acceso al lugar, horarios…"
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
                  <Button type="submit" variant="primary" isDisabled={pending}>
                    {pending ? "Creando…" : "Crear orden"}
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
