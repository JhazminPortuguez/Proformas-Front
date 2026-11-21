"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { useAnnouncer } from "@/components/ui/announcer";
import { auth } from "@/lib/api/client";
import { isApiError } from "@/lib/api/types";

export const MENSAJE_LIMITE_ENLACES =
  "Ya pediste varios enlaces seguidos. Espera unos minutos y revisa tu bandeja (también la carpeta de spam) antes de pedir otro.";

type Resultado =
  | { tipo: "ok"; texto: string }
  | { tipo: "error"; texto: string }
  | { tipo: "sin-sesion" };

/**
 * Ronda A, parte 3: "Reenviar enlace" de verificación. El back limita a 3
 * envíos cada 10 minutos; sin sesión, ofrece iniciarla.
 */
export function ReenviarEnlace({ volverA = "/portal" }: { volverA?: string }) {
  const { announce } = useAnnouncer();
  const [pendiente, setPendiente] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function reenviar() {
    setPendiente(true);
    setResultado(null);

    try {
      const respuesta = await auth.reenviarVerificacion();

      setResultado({ tipo: "ok", texto: respuesta.message });
      announce(respuesta.message);
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        setResultado({ tipo: "sin-sesion" });

        return;
      }

      const texto =
        isApiError(caught) && caught.status === 429
          ? MENSAJE_LIMITE_ENLACES
          : "No pudimos enviar el enlace ahora. Inténtalo de nuevo en unos minutos.";

      setResultado({ tipo: "error", texto });
      announce(texto);
    } finally {
      setPendiente(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" size="sm" onPress={reenviar} isDisabled={pendiente}>
        {pendiente ? "Enviando…" : "Reenviar enlace"}
      </Button>

      {resultado?.tipo === "ok" ? (
        <p role="status" className="text-sm text-success-soft-foreground">
          {resultado.texto}
        </p>
      ) : null}
      {resultado?.tipo === "error" ? (
        <p role="alert" className="text-sm text-danger">
          {resultado.texto}
        </p>
      ) : null}
      {resultado?.tipo === "sin-sesion" ? (
        <p role="status" className="text-sm text-foreground">
          Para pedir un enlace nuevo,{" "}
          <Link
            href={`/login?next=${encodeURIComponent(volverA)}`}
            className="font-medium text-accent-soft-foreground underline underline-offset-4"
          >
            inicia sesión
          </Link>{" "}
          y usa &quot;Reenviar enlace&quot; en tu portal.
        </p>
      ) : null}
    </div>
  );
}
