"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Alert, Button, Drawer } from "@heroui/react";
import { useAnnouncer } from "./announcer";
import { ConfirmDialog } from "./confirm-dialog";
import { FormErrorSummary } from "./form-errors";

export type FormDrawerSize = "sm" | "md" | "lg" | "xl";

const DRAWER_WIDTHS: Record<FormDrawerSize, string> = {
  sm: "24rem",
  md: "29rem",
  lg: "34rem",
  xl: "42rem",
};

/**
 * Permite que el botón Cancelar del footer pase por la misma guardia de
 * cambios sin guardar que el backdrop y la X.
 */
const FormDrawerCloseContext = createContext<(() => void) | null>(null);

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
  /** Cantidad de campos con error; dispara el resumen "Revisa N campos". */
  fieldErrorCount?: number;
  /** Guiar el cierre: si hay cambios sin guardar, pide confirmación. */
  isDirty?: boolean;
  size?: FormDrawerSize;
  formRef?: RefObject<HTMLFormElement | null>;
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
  fieldErrorCount = 0,
  isDirty = false,
  size = "lg",
  formRef,
}: FormDrawerProps) {
  const descriptionId = useId();
  const { announce } = useAnnouncer();
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    if (isPending) announce("Guardando cambios…");
  }, [isPending, announce]);

  function requestClose() {
    if (isPending) return;

    // No cerrar con datos escritos sin confirmar: se perdería el formulario.
    if (isDirty) {
      setDiscardOpen(true);

      return;
    }

    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);

      return;
    }

    requestClose();
  }

  return (
    <>
      <FormDrawerCloseContext.Provider value={requestClose}>
        <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
          <Drawer.Trigger className="hidden" aria-hidden="true">
            Abrir panel
          </Drawer.Trigger>
          <Drawer.Backdrop isDismissable={!isPending}>
            <Drawer.Content placement="right">
              <Drawer.Dialog
                aria-label={title}
                aria-describedby={description ? descriptionId : undefined}
                style={{ width: `min(${DRAWER_WIDTHS[size]}, 100vw)` }}
              >
                <form
                  ref={formRef}
                  onSubmit={onSubmit}
                  noValidate
                  aria-busy={isPending}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <Drawer.Header className="pe-8">
                    <Drawer.Heading>{title}</Drawer.Heading>
                    {description ? (
                      <p id={descriptionId} className="text-sm text-muted">
                        {description}
                      </p>
                    ) : null}
                    <Drawer.CloseTrigger
                      aria-label="Cerrar formulario"
                      className="text-muted"
                      isDisabled={isPending}
                    />
                  </Drawer.Header>

                  <Drawer.Body className="mt-4 flex flex-col gap-4">
                    {fieldErrorCount > 0 ? (
                      <FormErrorSummary
                        count={fieldErrorCount}
                        message={error}
                      />
                    ) : error ? (
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
                </form>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer>
      </FormDrawerCloseContext.Provider>

      <ConfirmDialog
        isOpen={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar cambios"
        description="Si cierras ahora, se perderán los datos que escribiste en este formulario."
        confirmLabel="Descartar cambios"
        pendingLabel="Descartando…"
        tone="warning"
        onConfirm={() => {
          setDiscardOpen(false);
          onOpenChange(false);
        }}
      />
    </>
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
  const requestClose = useContext(FormDrawerCloseContext);

  return (
    <>
      <Button
        type="button"
        variant="tertiary"
        onPress={() => (requestClose ? requestClose() : onCancel())}
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
