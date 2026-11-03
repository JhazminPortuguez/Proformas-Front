import Link from "next/link";
import { Card } from "@heroui/react";
import { OrdenEstadoChip } from "@/components/ui/status-chip";
import { dashboardTrabajosHoy } from "@/lib/dashboard";
import type { DashboardData } from "@/lib/api/types";
import { cn, formatNumber } from "@/lib/utils";
import {
  FOCUS_RING,
  PanelEmpty,
  QuietLink,
  SectionIntro,
} from "@/components/dashboard/dashboard-ui";

export function TrabajosHoySection({ data }: { data: DashboardData }) {
  const { items, total, hayMas } = dashboardTrabajosHoy(data);

  return (
    <section aria-labelledby="trabajos-hoy-title" className="flex flex-col gap-3">
      <SectionIntro
        id="trabajos-hoy-title"
        title="Trabajos programados para hoy"
        description={
          total > 0
            ? `${formatNumber(total)} ${total === 1 ? "orden pendiente, asignada o en proceso" : "órdenes pendientes, asignadas o en proceso"}.`
            : "Órdenes pendientes, asignadas o en proceso con fecha de hoy."
        }
        action={
          hayMas ? (
            <QuietLink href="/ordenes">Ver todas las órdenes</QuietLink>
          ) : null
        }
      />

      <Card>
        <Card.Content>
          {items.length > 0 ? (
            <ul className="flex flex-col" aria-label="Trabajos programados para hoy">
              {items.map((trabajo) => (
                <li
                  key={trabajo.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 border-b border-separator py-2.5 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,12rem)_auto] sm:items-center"
                >
                  <Link
                    href={`/ordenes/${trabajo.id}`}
                    className={cn(
                      "w-fit text-sm font-medium text-accent-soft-foreground underline-offset-4 hover:underline",
                      FOCUS_RING,
                    )}
                  >
                    {trabajo.numero}
                  </Link>

                  <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                    <p className="truncate text-sm text-foreground">
                      {trabajo.cliente.nombre_razon?.trim() || "Sin cliente"}
                    </p>
                    {trabajo.cliente.nit_ci ? (
                      <p className="numeric text-xs text-muted">
                        NIT/CI {trabajo.cliente.nit_ci}
                      </p>
                    ) : null}
                  </div>

                  <p className="col-span-2 row-start-3 truncate text-xs text-muted sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:text-sm">
                    <span className="sm:sr-only">Operario: </span>
                    {trabajo.operario?.trim() || "Sin asignar"}
                  </p>

                  <div className="col-start-2 row-start-1 justify-self-end sm:col-start-4">
                    <OrdenEstadoChip estado={trabajo.estado} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <PanelEmpty>No hay trabajos programados para hoy</PanelEmpty>
          )}
        </Card.Content>
      </Card>
    </section>
  );
}
