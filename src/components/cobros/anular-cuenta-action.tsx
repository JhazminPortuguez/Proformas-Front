"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Ban } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAnnouncer } from "@/components/ui/announcer";
import { cuentas as cuentasApi } from "@/lib/api/client";
import { mensajeDeError } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";

interface AnularCuentaActionProps {
  cuentaId: number;
  numero: string;
}

/**
 * X-11: el admin anula una cuenta por cobrar sin pagos vigentes. El motivo es
 * obligatorio y la cuenta deja de sumar en el dashboard y en los reportes.
 */
export function AnularCuentaAction({ cuentaId, numero }: AnularCuentaActionProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function anular(motivo?: string) {
    setPending(true);
    setError(null);

    try {
      await cuentasApi.anular(cuentaId, motivo ?? "");
      announce(`Cuenta ${numero} anulada.`);
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      setError(mensajeDeError(caught, "No pudimos anular la cuenta."));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="danger-soft"
        size="md"
        onPress={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Ban aria-hidden className="size-4" />
        Anular cuenta
      </Button>

      <ConfirmDialog
        isOpen={open}
        onOpenChange={(next) => {
          if (!next && !pending) {
            setOpen(false);
            setError(null);
          }
        }}
        title="Anular cuenta por cobrar"
        description={`La cuenta ${numero} quedará anulada: no se cobrará y dejará de sumar en el dashboard y en los reportes. Queda registrado quién la anuló, cuándo y por qué.`}
        confirmLabel="Anular cuenta"
        pendingLabel="Anulando…"
        tone="danger"
        requireReason
        reasonLabel="Motivo de la anulación"
        reasonPlaceholder="Explica por qué se anula la cuenta…"
        onConfirm={anular}
        isPending={pending}
        error={error}
      />
    </>
  );
}
