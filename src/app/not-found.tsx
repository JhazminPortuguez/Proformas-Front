import Link from "next/link";
import { Compass } from "lucide-react";
import { Card } from "@heroui/react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-10">
      <Card>
        <Card.Content className="items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
            <Compass aria-hidden className="size-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Página no encontrada
          </h1>
          <p className="text-sm text-muted">
            La ruta que buscas no existe o fue movida. Revisa el enlace o vuelve
            al dashboard.
          </p>
          <Link
            href="/dashboard"
            className="rounded-lg text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Volver al dashboard
          </Link>
        </Card.Content>
      </Card>
    </main>
  );
}
