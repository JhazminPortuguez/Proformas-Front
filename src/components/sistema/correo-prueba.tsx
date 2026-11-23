"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@heroui/react";
import { useAnnouncer } from "@/components/ui/announcer";
import { sistema } from "@/lib/api/client";
import { mensajeDeError } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";

type Resultado = { tipo: "ok" | "aviso" | "error"; texto: string };

/**
 * Ronda B, parte 1: "Enviar correo de prueba" al correo del propio
 * superusuario. El back limita a 3 por minuto.
 */
export function CorreoPrueba({ email }: { email: string }) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [pendiente, setPendiente] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function enviar() {
    setPendiente(true);
    setResultado(null);

    try {
      const respuesta = await sistema.correoPrueba();
      const nuevo: Resultado = { tipo: respuesta.real === false ? "aviso" : "ok", texto: respuesta.message };

      setResultado(nuevo);
      announce(nuevo.texto);
    } catch (error) {
      if (isApiError(error) && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      const texto = mensajeDeError(error, "No pudimos enviar el correo de prueba.");

      setResultado({ tipo: "error", texto });
      announce(texto);
    } finally {
      setPendiente(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" size="sm" onPress={enviar} isDisabled={pendiente}>
        <Mail aria-hidden className="size-4" />
        {pendiente ? "Enviando…" : "Enviar correo de prueba"}
      </Button>
      <p className="text-xs text-muted">
        Se envía a tu correo: <span className="font-medium text-foreground">{email}</span>
      </p>

      {resultado ? (
        <p
          role={resultado.tipo === "error" ? "alert" : "status"}
          className={
            resultado.tipo === "error"
              ? "text-sm text-danger"
              : resultado.tipo === "aviso"
                ? "text-sm text-warning-soft-foreground"
                : "text-sm text-success-soft-foreground"
          }
        >
          {resultado.texto}
        </p>
      ) : null}
    </div>
  );
}
