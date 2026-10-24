import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Card, Chip } from "@heroui/react";
import { PageHeader } from "@/components/ui/page-header";

interface ComingSoonProps {
  title: string;
  description: string;
  bullets: string[];
}

export function ComingSoon({
  title,
  description,
  bullets,
}: ComingSoonProps) {
  return (
    <>
      <PageHeader title={title} description={description} />

      <Card className="overflow-hidden">
        <Card.Content className="gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" variant="soft" color="warning">
              <Chip.Label>Próximamente</Chip.Label>
            </Chip>
            <span className="text-xs text-muted">Disponible próximamente</span>
          </div>

          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
              <Compass aria-hidden className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Este módulo todavía no está habilitado
              </h2>
              <p className="mt-1 text-sm text-muted">
                La navegación ya está preparada. Cuando se habilite vas a poder
                trabajar acá sin cambiar de flujo.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Qué incluirá
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-foreground">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span aria-hidden className="text-foreground">
                    ·
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Volver al dashboard
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
        </Card.Content>
      </Card>
    </>
  );
}
