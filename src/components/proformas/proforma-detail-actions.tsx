"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Send, Trash2, X } from "lucide-react";
import { Button } from "@heroui/react";
import { ActionTooltip, BOTON_BLOQUEADO } from "@/components/ui/action-tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAnnouncer } from "@/components/ui/announcer";
import { proformas as proformasApi } from "@/lib/api/client";
import { mensajeDeError } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import {
  avisoAceptarVencida,
  motivoNoEnviar,
  todayDateOnly,
  type AccionProforma,
} from "@/lib/proformas";
import type { EstadoProforma } from "@/lib/api/types";

type DetailAction = Extract<
  AccionProforma,
  "enviar" | "aceptar" | "rechazar" | "eliminar"
>;

interface ProformaDetailActionsProps {
  proformaId: number;
  numero: string;
  acciones: readonly AccionProforma[];
  canDelete: boolean;
  /** Con total Bs 0 el botón Enviar queda deshabilitado y explica por qué. */
  total: number;
  /** Para avisar al aceptar una proforma ya vencida. */
  estado?: EstadoProforma;
  fechaValidez?: string | null;
}

export function ProformaDetailActions({
  proformaId,
  numero,
  acciones,
  canDelete,
  total,
  estado = "ENVIADA",
  fechaValidez = null,
}: ProformaDetailActionsProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [, startTransition] = useTransition();
  const [target, setTarget] = useState<DetailAction | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = new Set(acciones);
  const bloqueoEnvio = motivoNoEnviar(total);

  function request(action: DetailAction) {
    setError(null);
    setTarget(action);
  }

  async function confirm(reason?: string) {
    if (!target) return;

    setPending(true);
    setError(null);

    try {
      switch (target) {
        case "enviar":
          await proformasApi.enviar(proformaId);
          announce(`Proforma ${numero} enviada.`);
          break;
        case "aceptar":
          await proformasApi.aceptar(proformaId);
          announce(`Proforma ${numero} aceptada.`);
          break;
        case "rechazar":
          await proformasApi.rechazar(proformaId, reason ?? "");
          announce(`Proforma ${numero} rechazada.`);
          break;
        case "eliminar":
          await proformasApi.remove(proformaId);
          announce(`Proforma ${numero} eliminada.`);
          break;
      }

      setTarget(null);

      if (target === "eliminar") {
        router.push("/proformas");
        startTransition(() => router.refresh());

        return;
      }

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

      if (isApiError(caught) && caught.status === 403) {
        setError("No tienes permisos para realizar esta acción.");
      } else {
        setError(mensajeDeError(caught, "No pudimos completar la acción."));
      }
    } finally {
      setPending(false);
    }
  }

  const config = target ? dialogForAction(target, numero) : null;

  if (
    !available.has("enviar") &&
    !available.has("aceptar") &&
    !available.has("rechazar") &&
    !available.has("eliminar")
  ) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {available.has("enviar") ? (
          bloqueoEnvio ? (
            <ActionTooltip label={bloqueoEnvio}>
              <Button
                variant="primary"
                size="sm"
                aria-disabled="true"
                className={BOTON_BLOQUEADO}
              >
                <Send aria-hidden className="size-4" />
                Enviar
              </Button>
            </ActionTooltip>
          ) : (
            <Button variant="primary" size="sm" onPress={() => request("enviar")}>
              <Send aria-hidden className="size-4" />
              Enviar
            </Button>
          )
        ) : null}

        {available.has("aceptar") ? (
          <Button variant="primary" size="sm" onPress={() => request("aceptar")}>
            <Check aria-hidden className="size-4" />
            Aceptar
          </Button>
        ) : null}

        {available.has("rechazar") ? (
          <Button
            variant="secondary"
            size="sm"
            className="text-danger"
            onPress={() => request("rechazar")}
          >
            <X aria-hidden className="size-4" />
            Rechazar
          </Button>
        ) : null}

        {available.has("eliminar") && canDelete ? (
          <Button
            variant="danger"
            size="sm"
            onPress={() => request("eliminar")}
          >
            <Trash2 aria-hidden className="size-4" />
            Eliminar
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={Boolean(target)}
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null);
            setError(null);
          }
        }}
        title={config?.title ?? ""}
        description={config?.description ?? ""}
        confirmLabel={config?.confirmLabel}
        pendingLabel={config?.pendingLabel}
        tone={config?.tone}
        requireReason={target === "rechazar"}
        notice={
          target === "aceptar"
            ? avisoAceptarVencida(
                { estado, fecha_validez: fechaValidez },
                todayDateOnly(),
              )
            : null
        }
        reasonLabel="Motivo del rechazo"
        reasonPlaceholder="Explica por qué el cliente rechazó la propuesta…"
        onConfirm={confirm}
        isPending={pending}
        error={error}
      />
    </>
  );
}

function dialogForAction(
  action: DetailAction,
  numero: string,
): {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  tone: "danger" | "warning" | "accent";
} {
  switch (action) {
    case "enviar":
      return {
        title: "Enviar proforma",
        description: `Se enviará la proforma ${numero} al cliente y quedará a la espera de su respuesta.`,
        confirmLabel: "Enviar",
        pendingLabel: "Enviando…",
        tone: "accent",
      };
    case "aceptar":
      return {
        title: "Aceptar proforma",
        description: `Se marcará la proforma ${numero} como aceptada. Confirma que el cliente dio su conformidad.`,
        confirmLabel: "Aceptar",
        pendingLabel: "Aceptando…",
        tone: "warning",
      };
    case "rechazar":
      return {
        title: "Rechazar proforma",
        description: `La proforma ${numero} quedará rechazada. El motivo se guarda en el historial.`,
        confirmLabel: "Rechazar",
        pendingLabel: "Rechazando…",
        tone: "danger",
      };
    case "eliminar":
      return {
        title: "Eliminar proforma",
        description: `¿Seguro que quieres eliminar la proforma ${numero}? Esta acción no se puede deshacer.`,
        confirmLabel: "Eliminar",
        pendingLabel: "Eliminando…",
        tone: "danger",
      };
  }
}
