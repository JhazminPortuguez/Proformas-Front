"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAnnouncer } from "@/components/ui/announcer";
import { portal } from "@/lib/api/client";
import { mensajeDeError } from "@/lib/api/errors";
import { isApiError, type PortalProforma } from "@/lib/api/types";
import { formatMoney } from "@/lib/utils";

type Respuesta = "aceptar" | "rechazar";

interface ResponderProformaProps {
  proforma: Pick<
    PortalProforma,
    "id" | "numero" | "estado" | "total" | "moneda" | "puede_responder" | "motivo_no_puede_responder"
  >;
  /** En la tabla, botones pequeños y el motivo en una línea corta. */
  compacto?: boolean;
}

/**
 * P-11 / U-05: el cliente acepta o rechaza su proforma Enviada desde el
 * portal. Si no puede (vencida o cuenta inactiva), se explica por qué. El
 * back revisa lo mismo con la fila bloqueada.
 */
export function ResponderProforma({ proforma, compacto = false }: ResponderProformaProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [, startTransition] = useTransition();
  const [abierto, setAbierto] = useState<Respuesta | null>(null);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (proforma.estado !== "ENVIADA") return null;

  if (!proforma.puede_responder) {
    return proforma.motivo_no_puede_responder ? (
      <p
        className={
          compacto
            ? "max-w-56 text-xs text-warning-soft-foreground"
            : "text-sm text-warning-soft-foreground"
        }
      >
        {proforma.motivo_no_puede_responder}
      </p>
    ) : null;
  }

  const total = formatMoney(proforma.total, proforma.moneda);

  function abrir(respuesta: Respuesta) {
    setError(null);
    setAbierto(respuesta);
  }

  async function confirmar(motivo?: string) {
    if (!abierto) return;

    setPendiente(true);
    setError(null);

    try {
      if (abierto === "aceptar") {
        await portal.aceptarProforma(proforma.id);
        announce(`Aceptaste la proforma ${proforma.numero}.`);
      } else {
        await portal.rechazarProforma(proforma.id, motivo);
        announce(`Rechazaste la proforma ${proforma.numero}.`);
      }

      setAbierto(null);
      startTransition(() => router.refresh());
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      setError(mensajeDeError(caught, "No pudimos registrar tu respuesta. Vuelve a intentarlo."));

      // Si la empresa respondió antes, el estado de atrás se actualiza.
      if (isApiError(caught) && caught.status === 409) {
        startTransition(() => router.refresh());
      }
    } finally {
      setPendiente(false);
    }
  }

  return (
    // En la tabla, el clic en los botones no abre la fila.
    <div
      className="flex flex-wrap items-center gap-2"
      onClick={(evento) => evento.stopPropagation()}
      onKeyDown={(evento) => evento.stopPropagation()}
    >
      <Button
        size="sm"
        variant="primary"
        onPress={() => abrir("aceptar")}
        aria-label={`Aceptar la proforma ${proforma.numero}`}
      >
        <Check aria-hidden className="size-4" />
        Aceptar
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onPress={() => abrir("rechazar")}
        aria-label={`Rechazar la proforma ${proforma.numero}`}
      >
        <X aria-hidden className="size-4" />
        Rechazar
      </Button>

      <ConfirmDialog
        isOpen={abierto !== null}
        onOpenChange={(open) => {
          if (!open && !pendiente) {
            setAbierto(null);
            setError(null);
          }
        }}
        title={
          abierto === "aceptar"
            ? `¿Aceptar la proforma ${proforma.numero}?`
            : `¿Rechazar la proforma ${proforma.numero}?`
        }
        description={
          abierto === "aceptar"
            ? `Total: ${total}. Al aceptarla, la empresa se comunicará contigo para coordinar el servicio.`
            : `Total: ${total}. La empresa verá que la rechazaste. Si cambias de opinión, comunícate con ella.`
        }
        confirmLabel={abierto === "aceptar" ? "Aceptar proforma" : "Rechazar proforma"}
        pendingLabel={abierto === "aceptar" ? "Aceptando…" : "Rechazando…"}
        tone={abierto === "aceptar" ? "accent" : "danger"}
        optionalReason={abierto === "rechazar"}
        icon={abierto === "aceptar" ? Check : X}
        reasonLabel="Motivo (opcional)"
        reasonPlaceholder="Cuéntale a la empresa por qué, si quieres…"
        onConfirm={confirmar}
        isPending={pendiente}
        error={error}
      />
    </div>
  );
}
