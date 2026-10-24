import type { Metadata } from "next";
import { CalendarClock, FileText, Sparkles } from "lucide-react";
import { Card, Chip } from "@heroui/react";
import { requireCliente } from "@/lib/api/server";

export const metadata: Metadata = {
  title: "Mi portal",
};

export default async function PortalPage() {
  const user = await requireCliente();
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Mi portal
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Hola, {firstName}
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Desde acá vas a poder ver el catálogo de servicios, pedir una proforma
          y seguir el estado de tus solicitudes.
        </p>
      </header>

      <Card>
        <Card.Content className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" variant="soft" color="warning">
              <Chip.Label>Próximamente</Chip.Label>
            </Chip>
            <span className="text-xs text-muted">Catálogo</span>
          </div>

          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
              <Sparkles aria-hidden className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Catálogo de servicios
              </h2>
              <p className="mt-1 text-sm text-muted">
                Estamos preparando el catálogo con precios y tiempos estimados.
                Cuando esté disponible lo vas a encontrar en este mismo lugar.
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <Card.Content className="gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-surface-secondary text-muted">
              <FileText aria-hidden className="size-4" />
            </span>
            <h2 className="text-sm font-semibold text-foreground">
              Mis proformas
            </h2>
            <p className="text-sm text-muted">
              El historial de proformas y sus estados estará disponible próximamente.
            </p>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-surface-secondary text-muted">
              <CalendarClock aria-hidden className="size-4" />
            </span>
            <h2 className="text-sm font-semibold text-foreground">
              Solicitudes y visitas
            </h2>
            <p className="text-sm text-muted">
              Pronto vas a poder pedir visitas técnicas y seguir su avance.
            </p>
          </Card.Content>
        </Card>
      </div>

      <Card variant="transparent">
        <Card.Content className="text-sm text-muted">
          ¿Necesitas algo urgente? Escribinos a{" "}
          <a
            href="mailto:contacto@proformas.bo"
            className="font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            contacto@proformas.bo
          </a>
          .
        </Card.Content>
      </Card>
    </div>
  );
}
