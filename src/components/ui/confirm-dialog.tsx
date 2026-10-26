"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  AlertDialog,
  Button,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { useAnnouncer } from "./announcer";

export type ConfirmDialogTone = "danger" | "warning" | "accent";

const TONE_STATUS: Record<ConfirmDialogTone, "danger" | "warning" | "accent"> = {
  danger: "danger",
  warning: "warning",
  accent: "accent",
};

const TONE_ICON: Record<ConfirmDialogTone, typeof Trash2> = {
  danger: Trash2,
  warning: AlertTriangle,
  accent: Info,
};

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  pendingLabel?: string;
  onConfirm: (reason?: string) => void;
  isPending?: boolean;
  error?: string | null;
  tone?: ConfirmDialogTone;
  /** Exige un motivo escrito para habilitar la confirmación. */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = "Eliminar",
  pendingLabel = "Eliminando…",
  onConfirm,
  isPending = false,
  error = null,
  tone = "danger",
  requireReason = false,
  reasonLabel = "Motivo",
  reasonPlaceholder = "Explica brevemente por qué…",
}: ConfirmDialogProps) {
  const { announce } = useAnnouncer();
  const [reason, setReason] = useState("");
  const Icon = TONE_ICON[tone];
  const canConfirm = !isPending && (!requireReason || reason.trim().length > 0);

  useEffect(() => {
    if (isPending) announce("Procesando la operación…");
  }, [isPending, announce]);

  function handleOpenChange(next: boolean) {
    setReason("");
    onOpenChange(next);
  }

  function handleConfirm() {
    const nextReason = requireReason ? reason.trim() : undefined;

    setReason("");
    onConfirm(nextReason);
  }

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialog.Trigger className="hidden" tabIndex={0}>
        Abrir diálogo
      </AlertDialog.Trigger>
      <AlertDialog.Backdrop
        isDismissable={false}
        isKeyboardDismissDisabled={isPending}
      >
        <AlertDialog.Container placement="center" size="sm">
          <AlertDialog.Dialog aria-busy={isPending}>
            <AlertDialog.Header>
              <AlertDialog.Icon status={TONE_STATUS[tone]}>
                <Icon aria-hidden className="size-5" />
              </AlertDialog.Icon>
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body className="space-y-3 text-sm text-muted">
              <p>{description}</p>

              {requireReason ? (
                <TextField
                  aria-label={reasonLabel}
                  name="motivo"
                  data-field="motivo"
                  value={reason}
                  onChange={setReason}
                  isRequired
                  isDisabled={isPending}
                  fullWidth
                  className="flex flex-col gap-1.5"
                >
                  <Label>
                    {reasonLabel}
                    <span aria-hidden className="text-danger">
                      {" "}
                      *
                    </span>
                  </Label>
                  <TextArea
                    aria-label={reasonLabel}
                    fullWidth
                    rows={3}
                    placeholder={reasonPlaceholder}
                    disabled={isPending}
                  />
                </TextField>
              ) : null}

              {error ? (
                <Alert status="danger" role="alert">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}
            </AlertDialog.Body>

            <AlertDialog.Footer>
              <Button
                variant="tertiary"
                onPress={() => handleOpenChange(false)}
                isDisabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                onPress={handleConfirm}
                isDisabled={!canConfirm}
              >
                {isPending ? pendingLabel : confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
