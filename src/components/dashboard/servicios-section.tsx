import { Card } from "@heroui/react";
import { dashboardServiciosTop } from "@/lib/dashboard";
import type { DashboardData } from "@/lib/api/types";
import { formatMoney, formatNumber } from "@/lib/utils";
import {
  PanelEmpty,
  QuietLink,
  SectionIntro,
} from "@/components/dashboard/dashboard-ui";

export function ServiciosSection({ data }: { data: DashboardData }) {
  const servicios = dashboardServiciosTop(data, 5);

  return (
    <section
      aria-labelledby="servicios-title"
      className="flex h-full flex-col gap-3"
    >
      <SectionIntro
        id="servicios-title"
        title="Servicios más solicitados"
        description="Ranking por cantidad cotizada en el mes."
        action={<QuietLink href="/servicios">Ver catálogo</QuietLink>}
      />

      <Card className="flex-1">
        <Card.Content className="h-full">
          {servicios.length > 0 ? (
            <ol className="flex flex-col">
              {servicios.map((servicio, index) => (
                <li
                  key={`${servicio.servicioId}-${index}`}
                  className="flex items-center gap-3 border-b border-separator py-2.5 last:border-0 first:pt-0 last:pb-0"
                >
                  <span
                    aria-hidden
                    className="numeric grid size-7 shrink-0 place-items-center rounded-lg bg-surface-secondary text-xs font-semibold text-muted"
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {servicio.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatNumber(servicio.cantidad)}{" "}
                      {servicio.cantidad === 1 ? "solicitud" : "solicitudes"}
                    </p>
                  </div>

                  <p className="numeric shrink-0 text-sm font-semibold text-foreground">
                    {formatMoney(servicio.total)}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <PanelEmpty>
              Todavía no hay servicios cotizados este mes.
            </PanelEmpty>
          )}
        </Card.Content>
      </Card>
    </section>
  );
}
