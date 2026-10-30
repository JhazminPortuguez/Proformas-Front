"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
  Lock,
  Play,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { Alert, Button, Modal } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SelectControl } from "@/components/ui/fields";
import { useAnnouncer } from "@/components/ui/announcer";
import { ordenes as ordenesApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { OrdenAccion, User } from "@/lib/api/types";
import { cn, firstError, formatMoney } from "@/lib/utils";

type DialogAction = Extract<
  OrdenAccion,
  "iniciar" | "finalizar" | "cancelar" | "cerrar"
>;

interface OrdenActionsProps {
  ordenId: number;
  numero: string;
  acciones: readonly OrdenAccion[];
  /** Operarios disponibles para asignar. Sin lista, no se ofrece asignar. */
  operarios?: readonly User[];
  /** "icons" en tablas, "labels" en cards y "detail" en la cabecera. */
  display?: "icons" | "labels" | "detail";
  /** Oculta el enlace "Ver" cuando ya estamos en el detalle. */
  hideVer?: boolean;
  /**
   * Total y moneda de la proforma: es el monto de la cuenta por cobrar que
   * genera el cierre. Sin dato, la confirmación no muestra monto.
   */
  montoCierre?: { total: number; moneda?: string | null } | null;
}

const ICON_LINK = cn(
  "grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-200",
  "hover:bg-surface-secondary hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
);

const LABEL_LINK = cn(
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-foreground transition-colors duration-200",
  "hover:bg-surface-secondary",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
);

interface DialogConfig {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  tone: "danger" | "accent";
}

const DIALOGS: Record<
  DialogAction,
  (numero: string, montoCierre?: OrdenActionsProps["montoCierre"]) => DialogConfig
> = {
  iniciar: (numero) => ({
    title: "Iniciar orden",
    description: `La orden ${numero} pasará a "En proceso" y quedará registrada la fecha de inicio del trabajo.`,
    confirmLabel: "Iniciar",
    pendingLabel: "Iniciando…",
    tone: "accent",
  }),
  finalizar: (numero) => ({
    title: "Finalizar orden",
    description: `La orden ${numero} quedará como "Finalizada". Todavía podrá cerrarse administrativamente después.`,
    confirmLabel: "Finalizar",
    pendingLabel: "Finalizando…",
    tone: "accent",
  }),
  cancelar: (numero) => ({
    title: "Cancelar orden",
    description: `La orden ${numero} quedará cancelada y no deberá ejecutarse. El motivo se guarda en el historial.`,
    confirmLabel: "Cancelar orden",
    pendingLabel: "Cancelando…",
    tone: "danger",
  }),
  cerrar: (numero, montoCierre) => ({
    title: "Cerrar orden",
    description: `${
      montoCierre
        ? `¿Cerrar la orden y generar la cuenta por cobrar por ${formatMoney(
            montoCierre.total,
            montoCierre.moneda,
          )}?`
        : "¿Cerrar la orden y generar la cuenta por cobrar?"
    } Después ya no admitirá más acciones.`,
    confirmLabel: "Cerrar orden",
    pendingLabel: "Cerrando…",
    tone: "accent",
  }),
};

export function OrdenActions({
  ordenId,
  numero,
  acciones,
  operarios = [],
  display = "icons",
  hideVer = false,
  montoCierre = null,
}: OrdenActionsProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogAction | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPending, setAssignPending] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignFieldError, setAssignFieldError] = useState<string | null>(null);
  const [operarioId, setOperarioId] = useState("");

  const icon = display === "icons";
  const available = new Set(acciones);
  const puedeAsignar = available.has("asignar") && operarios.length > 0;

  const operarioOptions = [
    { value: "", label: "Selecciona un operario" },
    ...operarios.map((operario) => ({
      value: String(operario.id),
      label: operario.name,
    })),
  ];

  function handleUnauthorized(caught: unknown): boolean {
    if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
      router.replace("/login");
      router.refresh();

      return true;
    }

    return false;
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  function request(action: DialogAction) {
    setError(null);
    setDialog(action);
  }

  function openAssign() {
    setAssignError(null);
    setAssignFieldError(null);
    setOperarioId("");
    setAssignOpen(true);
  }

  async function confirm(reason?: string) {
    if (!dialog) return;

    const action = dialog;

    setPending(true);
    setError(null);

    try {
      switch (action) {
        case "iniciar":
          await ordenesApi.iniciar(ordenId);
          announce(`Orden ${numero} iniciada.`);
          break;
        case "finalizar":
          await ordenesApi.finalizar(ordenId);
          announce(`Orden ${numero} finalizada.`);
          break;
        case "cancelar":
          await ordenesApi.cancelar(ordenId, reason ?? "");
          announce(`Orden ${numero} cancelada.`);
          break;
        case "cerrar":
          await ordenesApi.cerrar(ordenId);
          announce(`Orden ${numero} cerrada.`);
          break;
      }

      setDialog(null);
      refresh();
    } catch (caught) {
      if (handleUnauthorized(caught)) return;

      if (isApiError(caught) && caught.status === 403) {
        setError("No tienes permisos para realizar esta acción.");
      } else {
        setError(apiErrorMessage(caught, "No pudimos completar la acción."));
      }
    } finally {
      setPending(false);
    }
  }

  async function submitAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!operarioId) {
      setAssignFieldError("Selecciona el operario que se hará cargo.");

      return;
    }

    setAssignPending(true);
    setAssignError(null);
    setAssignFieldError(null);

    try {
      await ordenesApi.asignar(ordenId, Number(operarioId));
      announce(`Orden ${numero} asignada.`);
      setAssignOpen(false);
      refresh();
    } catch (caught) {
      if (handleUnauthorized(caught)) return;

      if (isApiError(caught) && caught.errors) {
        setAssignFieldError(
          firstError(caught.errors, "operario_id") ?? null,
        );
      }

      if (isApiError(caught) && caught.status === 403) {
        setAssignError("No tienes permisos para asignar operarios.");
      } else {
        setAssignError(
          apiErrorMessage(caught, "No pudimos asignar la orden."),
        );
      }
    } finally {
      setAssignPending(false);
    }
  }

  function actionButton(
    action: DialogAction,
    label: string,
    Icon: LucideIcon,
    danger = false,
  ) {
    return (
      <Button
        key={action}
        type="button"
        variant="ghost"
        size="sm"
        isIconOnly={icon}
        className={cn(
          icon ? "size-9 text-muted" : "h-9 text-foreground",
          danger && "text-danger",
        )}
        aria-label={`${label} ${numero}`}
        onPress={() => request(action)}
      >
        <Icon aria-hidden className="size-4" />
        {icon ? <span className="sr-only">{label}</span> : label}
      </Button>
    );
  }

  const config = dialog ? DIALOGS[dialog](numero, montoCierre) : null;

  return (
    <>
      <div
        className={cn(
          "flex items-center",
          icon ? "justify-end gap-0.5" : "flex-wrap gap-1",
        )}
      >
        {!hideVer && available.has("ver") ? (
          <Link
            href={`/ordenes/${ordenId}`}
            className={icon ? ICON_LINK : LABEL_LINK}
            aria-label={`Ver orden ${numero}`}
          >
            <Eye aria-hidden className="size-4" />
            {icon ? <span className="sr-only">Ver</span> : "Ver"}
          </Link>
        ) : null}

        {puedeAsignar ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            isIconOnly={icon}
            className={cn(icon ? "size-9 text-muted" : "h-9 text-foreground")}
            aria-label={`Asignar ${numero}`}
            onPress={openAssign}
          >
            <UserPlus aria-hidden className="size-4" />
            {icon ? <span className="sr-only">Asignar</span> : "Asignar"}
          </Button>
        ) : null}

        {available.has("iniciar")
          ? actionButton("iniciar", "Iniciar", Play)
          : null}

        {available.has("finalizar")
          ? actionButton("finalizar", "Finalizar", Check)
          : null}

        {available.has("cancelar")
          ? actionButton("cancelar", "Cancelar", X, true)
          : null}

        {available.has("cerrar")
          ? actionButton(
              "cerrar",
              display === "detail"
                ? "Cerrar orden (genera la cuenta por cobrar)"
                : "Cerrar",
              Lock,
            )
          : null}
      </div>

      <ConfirmDialog
        isOpen={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setError(null);
          }
        }}
        title={config?.title ?? ""}
        description={config?.description ?? ""}
        confirmLabel={config?.confirmLabel}
        pendingLabel={config?.pendingLabel}
        tone={config?.tone}
        requireReason={dialog === "cancelar"}
        reasonLabel="Motivo de la cancelación"
        reasonPlaceholder="Explica por qué se cancela la orden…"
        onConfirm={confirm}
        isPending={pending}
        error={error}
      />

      <Modal
        isOpen={assignOpen}
        onOpenChange={(open) => {
          if (!open && !assignPending) {
            setAssignOpen(false);
            setAssignError(null);
            setAssignFieldError(null);
          }
        }}
      >
        <Modal.Trigger className="hidden" tabIndex={0}>
          Abrir diálogo
        </Modal.Trigger>
        <Modal.Backdrop isDismissable={!assignPending}>
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog aria-busy={assignPending}>
              <form
                onSubmit={submitAssign}
                noValidate
                className="flex flex-col"
              >
                <Modal.Header>
                  <Modal.Heading>Asignar operario</Modal.Heading>
                  <p className="text-sm text-muted">
                    La orden {numero} pasará a &ldquo;Asignada&rdquo; y quedará a
                    cargo de la persona seleccionada.
                  </p>
                </Modal.Header>

                <Modal.Body className="mt-4 flex flex-col gap-3">
                  {assignError ? (
                    <Alert status="danger" role="alert">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{assignError}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  ) : null}

                  <SelectControl
                    name="operario_id"
                    label="Operario"
                    value={operarioId}
                    onChange={(value) => {
                      setOperarioId(value);
                      setAssignFieldError(null);
                    }}
                    options={operarioOptions}
                    error={assignFieldError ?? undefined}
                    isRequired
                    isDisabled={assignPending}
                  />
                </Modal.Body>

                <Modal.Footer className="mt-5 justify-end gap-2">
                  <Button
                    type="button"
                    variant="tertiary"
                    onPress={() => setAssignOpen(false)}
                    isDisabled={assignPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={assignPending || !operarioId}
                  >
                    {assignPending ? "Asignando…" : "Asignar"}
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
