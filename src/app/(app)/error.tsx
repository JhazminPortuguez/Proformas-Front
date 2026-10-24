"use client";

import { Button } from "@heroui/react";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="space-y-4" role="alert">
      <h1 className="text-xl font-semibold text-foreground">Algo salió mal</h1>
      <p className="text-sm text-muted">
        No pudimos completar esta operación. Puedes intentarlo nuevamente sin
        salir del panel.
      </p>
      <Button type="button" variant="secondary" size="sm" onPress={reset}>
        Reintentar
      </Button>
    </section>
  );
}
