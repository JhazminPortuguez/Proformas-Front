"use client";

import { Alert, AlertDialog, Button } from "@heroui/react";
import { Trash2 } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  pendingLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  error?: string | null;
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
}: ConfirmDialogProps) {
  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container placement="center" size="sm">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger">
                <Trash2 aria-hidden className="size-5" />
              </AlertDialog.Icon>
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body className="space-y-3 text-sm text-muted">
              <p>{description}</p>
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
                onPress={() => onOpenChange(false)}
                isDisabled={isPending}
              >
                Cancelar
              </Button>
              <Button variant="danger" onPress={onConfirm} isDisabled={isPending}>
                {isPending ? pendingLabel : confirmLabel}
              </Button>
            </AlertDialog.Footer>

            <p role="status" aria-live="polite" className="sr-only">
              {isPending ? "Eliminando registro…" : ""}
            </p>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
