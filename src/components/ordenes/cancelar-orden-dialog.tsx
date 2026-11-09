"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Label,
  Modal,
  TextArea,
  TextField,
  Tooltip,
} from "@heroui/react";
import { TextFieldControl } from "@/components/ui/fields";
import { ordenes as ordenesApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError, type OrdenItem } from "@/lib/api/types";
import {
  MOTIVO_NADA_QUE_COBRAR,
  cantidadDevuelta,
  cobroCancelacion,
  errorDevolucion,
  materialesConsumidos,
  type MaterialConsumido,
} from "@/lib/ordenes";
import { formatMoney, formatNumber } from "@/lib/utils";

interface CancelarOrdenDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  ordenId: number;
  numero: string;
  /**
   * Ítems de la orden si ya están cargados (detalle). Sin ellos (tablero y
   * tabla) el diálogo los pide al abrirse.
   */
  items?: readonly OrdenItem[];
  /** Moneda de la proforma, para mostrar el cobro. */
  moneda?: string | null;
  onCancelled: (mensaje: string) => void;
  onUnauthorized: () => void;
}

/**
 * Cancelar una orden. Si el operario ya consumió materiales, el admin indica
 * cuánto de cada uno vuelve al stock (por defecto nada) y puede cobrarle al
 * cliente lo que no se devolvió, a precio de la línea de la orden y sin el
 * descuento ni el impuesto de la proforma.
 */
export function CancelarOrdenDialog({
  isOpen,
  onOpenChange,
  ordenId,
  numero,
  items,
  moneda = null,
  onCancelled,
  onUnauthorized,
}: CancelarOrdenDialogProps) {
  const [materiales, setMateriales] = useState<MaterialConsumido[] | null>(
    items ? materialesConsumidos(items) : null,
  );
  const [cargaError, setCargaError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);
  const [devoluciones, setDevoluciones] = useState<Record<number, string>>({});
  const [cobrar, setCobrar] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({});
  const ayudaCobroId = useId();

  // Sin ítems cargados, se piden al abrir.
  useEffect(() => {
    if (!isOpen || items) return;

    let vigente = true;

    ordenesApi
      .get(ordenId)
      .then((orden) => {
        if (vigente) setMateriales(materialesConsumidos(orden.items));
      })
      .catch((caught: unknown) => {
        if (!vigente) return;

        if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
          onUnauthorized();

          return;
        }

        setCargaError(
          apiErrorMessage(caught, "No pudimos cargar los materiales de la orden."),
        );
      });

    return () => {
      vigente = false;
    };
  }, [isOpen, items, ordenId, onUnauthorized]);

  const lista = materiales ?? [];
  const cobro = cobroCancelacion(lista, devoluciones);
  const nadaQueCobrar = lista.length > 0 && cobro.total <= 0;
  const cobrarActivo = cobrar && !nadaQueCobrar;

  function reset() {
    setMotivo("");
    setMotivoError(null);
    setDevoluciones({});
    setCobrar(false);
    setError(null);
    setFieldErrors({});
    setCargaError(null);
    if (!items) setMateriales(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open && pending) return;
    if (!open) reset();

    onOpenChange(open);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errores: Record<number, string> = {};

    for (const material of lista) {
      const mensaje = errorDevolucion(
        devoluciones[material.ordenItemId] ?? "",
        material.consumida,
      );

      if (mensaje) errores[material.ordenItemId] = mensaje;
    }

    const motivoLimpio = motivo.trim();

    setFieldErrors(errores);
    setMotivoError(motivoLimpio.length < 3 ? "Explica por qué se cancela (al menos 3 caracteres)." : null);

    if (Object.keys(errores).length > 0 || motivoLimpio.length < 3) return;

    setPending(true);
    setError(null);

    try {
      await ordenesApi.cancelar(ordenId, motivoLimpio, {
        ...(lista.length > 0
          ? {
              devoluciones: lista.map((material) => ({
                orden_item_id: material.ordenItemId,
                cantidad: cantidadDevuelta(
                  devoluciones[material.ordenItemId] ?? "",
                  material.consumida,
                ),
              })),
              cobrar_materiales: cobrarActivo,
            }
          : {}),
      });

      const mensaje = cobrarActivo
        ? `Orden ${numero} cancelada. Se generó un cobro por cancelación de ${formatMoney(cobro.total, moneda)}.`
        : `Orden ${numero} cancelada.`;

      reset();
      onCancelled(mensaje);
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        onUnauthorized();

        return;
      }

      if (isApiError(caught) && caught.status === 403) {
        setError("No tienes permisos para cancelar órdenes.");
      } else {
        const primero = isApiError(caught)
          ? Object.values(caught.errors ?? {}).flat()[0]
          : undefined;

        setError(primero ?? apiErrorMessage(caught, "No pudimos cancelar la orden."));
      }
    } finally {
      setPending(false);
    }
  }

  const checkbox = (
    <Checkbox
      isSelected={cobrarActivo}
      onChange={setCobrar}
      isDisabled={pending || nadaQueCobrar}
      aria-describedby={ayudaCobroId}
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Label>Cobrar al cliente los materiales utilizados</Label>
      </Checkbox.Content>
    </Checkbox>
  );

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Trigger className="hidden" tabIndex={0}>
        Abrir diálogo
      </Modal.Trigger>
      <Modal.Backdrop isDismissable={!pending}>
        {/* Con varios materiales el diálogo no entra en pantallas bajas: el
            cuerpo se desplaza y el pie con "Cancelar orden" queda siempre visible. */}
        <Modal.Container
          placement="center"
          scroll="inside"
          size={lista.length > 0 ? "lg" : "sm"}
        >
          <Modal.Dialog aria-busy={pending}>
            <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
              <Modal.Header>
                <Modal.Heading>Cancelar orden</Modal.Heading>
                <p className="text-sm text-muted">
                  La orden {numero} quedará cancelada y no deberá ejecutarse. Todo
                  queda en el historial de la orden.
                </p>
              </Modal.Header>

              <Modal.Body className="mt-4 flex min-h-0 flex-col gap-4">
                {error ? (
                  <Alert status="danger" role="alert">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}

                <TextField
                  name="motivo"
                  data-field="motivo"
                  value={motivo}
                  onChange={(value) => {
                    setMotivo(value);
                    setMotivoError(null);
                  }}
                  isRequired
                  isDisabled={pending}
                  isInvalid={Boolean(motivoError)}
                  fullWidth
                  className="flex flex-col gap-1.5"
                >
                  <Label>Motivo de la cancelación</Label>
                  <TextArea
                    aria-label="Motivo de la cancelación"
                    fullWidth
                    rows={2}
                    placeholder="Explica por qué se cancela la orden…"
                  />
                  {motivoError ? (
                    <p className="text-xs text-danger">{motivoError}</p>
                  ) : null}
                </TextField>

                {materiales === null && !items ? (
                  cargaError ? (
                    <Alert status="danger">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{cargaError}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  ) : (
                    <p className="text-sm text-muted" role="status">
                      Revisando los materiales consumidos…
                    </p>
                  )
                ) : null}

                {lista.length > 0 ? (
                  <section aria-labelledby={`${ayudaCobroId}-titulo`} className="flex flex-col gap-3">
                    <div>
                      <h3 id={`${ayudaCobroId}-titulo`} className="text-sm font-semibold text-foreground">
                        Materiales consumidos
                      </h3>
                      <p className="text-xs text-muted">
                        Indica cuánto vuelve al stock. Lo que no se devuelva queda
                        como consumido.
                      </p>
                    </div>

                    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                      {cobro.lineas.map(({ material, noDevuelta, subtotal }) => (
                        <li
                          key={material.ordenItemId}
                          className="grid gap-2 p-3 sm:grid-cols-[1fr_9rem] sm:items-start"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{material.nombre}</p>
                            <p className="numeric text-xs text-muted">
                              Consumido: {formatNumber(material.consumida)} {material.unidad} ·{" "}
                              {formatMoney(material.precioUnitario, moneda)} c/u
                            </p>
                            {cobrarActivo && noDevuelta > 0 ? (
                              <p className="numeric text-xs text-foreground">
                                Se cobra {formatNumber(noDevuelta)} × {formatMoney(material.precioUnitario, moneda)} ={" "}
                                {formatMoney(subtotal, moneda)}
                              </p>
                            ) : null}
                          </div>
                          <TextFieldControl
                            name={`devolucion_${material.ordenItemId}`}
                            label={`Devolver al stock: ${material.nombre}`}
                            value={devoluciones[material.ordenItemId] ?? "0"}
                            onChange={(value) => {
                              setDevoluciones((actual) => ({
                                ...actual,
                                [material.ordenItemId]: value,
                              }));
                              setFieldErrors((actual) => {
                                const siguiente = { ...actual };

                                delete siguiente[material.ordenItemId];

                                return siguiente;
                              });
                            }}
                            inputMode="decimal"
                            description={`De 0 a ${formatNumber(material.consumida)}`}
                            error={fieldErrors[material.ordenItemId]}
                            isDisabled={pending}
                          />
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-col gap-1 rounded-lg bg-surface-secondary p-3">
                      {nadaQueCobrar ? (
                        <Tooltip delay={400} closeDelay={0}>
                          <Tooltip.Trigger className="inline-flex w-fit">{checkbox}</Tooltip.Trigger>
                          <Tooltip.Content className="break-normal!">{MOTIVO_NADA_QUE_COBRAR}</Tooltip.Content>
                        </Tooltip>
                      ) : (
                        checkbox
                      )}
                      <p id={ayudaCobroId} className="text-xs text-muted">
                        {nadaQueCobrar
                          ? MOTIVO_NADA_QUE_COBRAR
                          : cobrarActivo
                            ? `Se generará una cuenta por cobrar por cancelación de ${formatMoney(cobro.total, moneda)}, con vencimiento a 30 días. Precio de la orden, sin el descuento ni el impuesto de la proforma.`
                            : `Si lo marcas, se cobra lo que no se devuelve: ${formatMoney(cobro.total, moneda)} (precio de la orden, sin descuento ni impuesto).`}
                      </p>
                    </div>
                  </section>
                ) : null}
              </Modal.Body>

              <Modal.Footer className="mt-5 justify-end gap-2">
                <Button
                  type="button"
                  variant="tertiary"
                  onPress={() => handleOpenChange(false)}
                  isDisabled={pending}
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  // Sin la lista de materiales no se cancela: el admin debe ver qué se consumió.
                  isDisabled={pending || (materiales === null && !items)}
                >
                  {pending ? "Cancelando…" : "Cancelar orden"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
