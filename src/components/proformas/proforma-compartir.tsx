"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@heroui/react";
import { ActionTooltip, BOTON_BLOQUEADO } from "@/components/ui/action-tooltip";
import { useAnnouncer } from "@/components/ui/announcer";
import { proformas as proformasApi } from "@/lib/api/client";
import { mensajeDeError } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import { enlaceWhatsApp } from "@/lib/whatsapp";

const sinSuscripcion = () => () => {};

/** Origen del front (para el enlace al portal); en el servidor, vacío. */
function useOrigen(): string {
  return useSyncExternalStore(
    sinSuscripcion,
    () => window.location.origin,
    () => "",
  );
}

export const MOTIVO_SIN_EMAIL =
  "El cliente no tiene correo registrado. Agrégalo en su ficha para enviarle la proforma.";

interface ProformaCompartirProps {
  proformaId: number;
  numero: string;
  total: number;
  moneda?: string | null;
  fechaValidez?: string | null;
  /** Ronda C: lo descontado por promociones, para el mensaje de WhatsApp. */
  descuentoPromocion?: number | null;
  email?: string | null;
  telefono?: string | null;
  /** El back ofrece `reenviar_correo` solo en una Enviada y al personal. */
  puedeReenviar: boolean;
}

/**
 * Ronda A, parte 2, en el detalle de una proforma Enviada:
 * - "Reenviar por correo" (con el PDF adjunto).
 * - "Compartir por WhatsApp": enlace gratuito wa.me con el mensaje escrito;
 *   el empleado lo envía desde su propio WhatsApp.
 * Sin correo o sin teléfono, el botón queda deshabilitado y dice por qué.
 */
export function ProformaCompartir({
  proformaId,
  numero,
  total,
  moneda,
  fechaValidez,
  descuentoPromocion,
  email,
  telefono,
  puedeReenviar,
}: ProformaCompartirProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [, startTransition] = useTransition();
  const [pendiente, setPendiente] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const origen = useOrigen();

  const whatsapp = enlaceWhatsApp({
    telefono,
    numero,
    total,
    moneda,
    fechaValidez,
    descuentoPromocion,
    enlacePortal: `${origen}/portal/proformas/${proformaId}`,
  });
  const sinEmail = !email?.trim();

  async function reenviar() {
    setPendiente(true);
    setAviso(null);

    try {
      const respuesta = await proformasApi.reenviarCorreo(proformaId);
      const texto = respuesta?.correo?.mensaje ?? "Correo enviado.";

      setAviso({ tono: respuesta?.correo?.enviado ? "ok" : "error", texto });
      announce(texto);
      startTransition(() => router.refresh());
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      const texto = mensajeDeError(caught, "No pudimos reenviar el correo. Vuelve a intentarlo.");

      setAviso({ tono: "error", texto });
      announce(texto);
    } finally {
      setPendiente(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {puedeReenviar ? (
          sinEmail ? (
            <ActionTooltip label={MOTIVO_SIN_EMAIL}>
              <Button variant="secondary" size="sm" aria-disabled="true" className={BOTON_BLOQUEADO}>
                <Mail aria-hidden className="size-4" />
                Reenviar por correo
              </Button>
            </ActionTooltip>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onPress={reenviar}
              isDisabled={pendiente}
              aria-label={`Reenviar la proforma ${numero} por correo a ${email}`}
            >
              <Mail aria-hidden className="size-4" />
              {pendiente ? "Enviando…" : "Reenviar por correo"}
            </Button>
          )
        ) : null}

        {whatsapp.url ? (
          <a
            href={whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            aria-label={`Compartir la proforma ${numero} por WhatsApp (se abre en una pestaña nueva)`}
          >
            <MessageCircle aria-hidden className="size-4" />
            Compartir por WhatsApp
          </a>
        ) : (
          <ActionTooltip label={whatsapp.motivo ?? ""}>
            <Button variant="secondary" size="sm" aria-disabled="true" className={BOTON_BLOQUEADO}>
              <MessageCircle aria-hidden className="size-4" />
              Compartir por WhatsApp
            </Button>
          </ActionTooltip>
        )}
      </div>

      {/* El tooltip no se ve al tocar en el celular: los motivos quedan escritos. */}
      {puedeReenviar && sinEmail ? <p className="text-xs text-muted">{MOTIVO_SIN_EMAIL}</p> : null}
      {whatsapp.motivo ? <p className="text-xs text-muted">{whatsapp.motivo}</p> : null}
      {aviso ? (
        <p
          role="status"
          className={aviso.tono === "ok" ? "text-xs text-success-soft-foreground" : "text-xs text-danger"}
        >
          {aviso.texto}
        </p>
      ) : null}
    </div>
  );
}
