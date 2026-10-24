"use client";

import type { ReactNode } from "react";
import { Alert, Button, Drawer } from "@heroui/react";

interface FormDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isPending?: boolean;
  error?: string | null;
}

export function FormDrawer({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  onSubmit,
  isPending = false,
  error = null,
}: FormDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog style={{ width: "min(27rem, 85vw)" }}>
            <form
              onSubmit={onSubmit}
              noValidate
              aria-busy={isPending}
              className="flex min-h-0 flex-1 flex-col"
            >
              <Drawer.Header className="pe-8">
                <Drawer.Heading>{title}</Drawer.Heading>
                {description ? (
                  <p className="text-sm text-muted">{description}</p>
                ) : null}
                <Drawer.CloseTrigger
                  aria-label="Cerrar formulario"
                  className="text-muted"
                />
              </Drawer.Header>

              <Drawer.Body className="mt-4 flex flex-col gap-4">
                {error ? (
                  <Alert status="danger" role="alert">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>No se pudo guardar</Alert.Title>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}

                {children}
              </Drawer.Body>

              <Drawer.Footer className="mt-5 gap-2 border-t border-border pt-4">
                {footer}
              </Drawer.Footer>

              <p role="status" aria-live="polite" className="sr-only">
                {isPending ? "Guardando cambios…" : ""}
              </p>
            </form>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

interface DrawerActionsProps {
  isPending: boolean;
  onCancel: () => void;
  submitLabel?: string;
  pendingLabel?: string;
}

export function DrawerActions({
  isPending,
  onCancel,
  submitLabel = "Guardar",
  pendingLabel = "Guardando…",
}: DrawerActionsProps) {
  return (
    <>
      <Button
        type="button"
        variant="tertiary"
        onPress={onCancel}
        isDisabled={isPending}
      >
        Cancelar
      </Button>
      <Button type="submit" variant="primary" isDisabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </>
  );
}
