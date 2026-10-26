import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, Chip } from "@heroui/react";
import { StatusChip } from "@/components/ui/status-chip";
import {
  dashboardOrdenesPipeline,
  dashboardPipelineTotal,
  dashboardProformasPipeline,
  type DashboardPipelineItem,
} from "@/lib/dashboard";
import type { DashboardData } from "@/lib/api/types";
import { cn, formatNumber } from "@/lib/utils";
import {
  FOCUS_RING,
  PanelEmpty,
  QuietLink,
  SectionIntro,
  toneBar,
} from "@/components/dashboard/dashboard-ui";

export function PipelineSection({ data }: { data: DashboardData }) {
  const proformas = dashboardProformasPipeline(data);
  const ordenes = dashboardOrdenesPipeline(data);

  return (
    <section aria-labelledby="pipeline-title" className="space-y-3">
      <SectionIntro
        id="pipeline-title"
        title="Pipeline"
        description="Distribución actual de proformas y órdenes por estado."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PipelineCard
          title="Proformas por estado"
          description="Del borrador a la aceptación del cliente."
          items={proformas}
          unitOne="proforma"
          unitMany="proformas"
          emptyText="Todavía no hay proformas registradas."
          hrefAll="/proformas"
          linkLabel="Ver todas las proformas"
        />
        <PipelineCard
          title="Órdenes por estado"
          description="Ejecución del servicio y cierre administrativo."
          items={ordenes}
          unitOne="orden"
          unitMany="órdenes"
          emptyText="Todavía no hay órdenes de servicio registradas."
          hrefAll="/ordenes"
          linkLabel="Ver todas las órdenes"
        />
      </div>
    </section>
  );
}

interface PipelineCardProps {
  title: string;
  description: string;
  items: DashboardPipelineItem[];
  unitOne: string;
  unitMany: string;
  emptyText: string;
  hrefAll: string;
  linkLabel: string;
}

function PipelineCard({
  title,
  description,
  items,
  unitOne,
  unitMany,
  emptyText,
  hrefAll,
  linkLabel,
}: PipelineCardProps) {
  const total = dashboardPipelineTotal(items);

  return (
    <Card className="h-full">
      <Card.Header className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <Card.Title>{title}</Card.Title>
          <Card.Description>{description}</Card.Description>
        </div>
        <Chip size="sm" variant="soft" color="default" className="shrink-0">
          <Chip.Label>
            {formatNumber(total)} {total === 1 ? unitOne : unitMany}
          </Chip.Label>
        </Chip>
      </Card.Header>

      <Card.Content className="mt-1 flex-1">
        {total === 0 ? (
          <PanelEmpty>{emptyText}</PanelEmpty>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const percent =
                total > 0
                  ? Math.min(100, Math.round((item.count / total) * 100))
                  : 0;

              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-label={`${item.label}: ${formatNumber(item.count)} ${
                      item.count === 1 ? unitOne : unitMany
                    }`}
                    className={cn(
                      "group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-surface-secondary",
                      FOCUS_RING,
                    )}
                  >
                    <StatusChip tone={item.tone}>{item.label}</StatusChip>

                    <span
                      aria-hidden
                      className="hidden h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-secondary sm:block"
                    >
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          toneBar(item.tone),
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </span>

                    <span className="numeric ms-auto w-8 shrink-0 text-end text-sm font-semibold text-foreground">
                      {formatNumber(item.count)}
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-3.5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card.Content>

      <Card.Footer className="justify-end border-t border-separator pt-2">
        <QuietLink href={hrefAll}>{linkLabel}</QuietLink>
      </Card.Footer>
    </Card>
  );
}
