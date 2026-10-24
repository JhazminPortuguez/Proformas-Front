"use client";

import Link from "next/link";
import { Alert, Button } from "@heroui/react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 px-4 py-10">
      <Alert status="danger" role="alert">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Algo salió mal</Alert.Title>
          <Alert.Description>
            No pudimos completar la operación. Puedes intentarlo nuevamente.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onPress={reset}>
          Reintentar
        </Button>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Volver al dashboard
        </Link>
      </div>
    </main>
  );
}
