import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardList,
  FileText,
  HandCoins,
  Package,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, Chip } from "@heroui/react";
import { EmptyState } from "@/components/ui/feedback";
import { OrdenEstadoChip, ProformaEstadoChip } from "@/components/ui/status-chip";
import {
  dashboardActividad,
  type ActividadKind,
} from "@/lib/dashboard";
import type { DashboardData } from "@/lib/api/types";
import { cn, formatDateTime, formatMoney, formatNumber } from "@/lib/utils";
import {
  FOCUS_RING,
  SectionIntro,
  toneSurface,
} from "@/components/dashboard/dashboard-ui";

const ACTIVIDAD_ICON: Record<ActividadKind, LucideIcon> = {
  proforma: FileText,
  orden: ClipboardList,
  pago: HandCoins,
  movimiento: Package,
  cliente: Users,
  otro: Sparkles,
};

export function ActividadSection({ data }: { data: DashboardData }) {
  const items = dashboardActividad(data, 6);

  return (
    <section
      aria-labelledby="actividad-title"
      className="flex h-full flex-col gap-3"
    >
      <SectionIntro
        id="actividad-title"
        title="Actividad reciente"
        description="Últimos movimientos registrados por el equipo."
        action={
          <Chip size="sm" variant="soft" color="default">
            <Chip.Label>{formatNumber(items.length)}</Chip.Label>
          </Chip>
        }
      />

      <Card className="flex-1">
        <Card.Content>
          {items.length > 0 ? (
            <ul className="flex flex-col">
              {items.map((item) => {
                const Icon = ACTIVIDAD_ICON[item.kind];
                const contenido = (
                  <>
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                        toneSurface(item.tone),
                      )}
                    >
                      <Icon className="size-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-sm font-medium text-foreground">
                          {item.descripcion}
                        </span>

                        {item.kind === "proforma" && item.estado ? (
                          <ProformaEstadoChip estado={item.estado} />
                        ) : null}
                        {item.kind === "orden" && item.estado ? (
                          <OrdenEstadoChip estado={item.estado} />
                        ) : null}

                        {item.monto !== null ? (
                          <span className="numeric text-sm font-semibold text-foreground">
                            {formatMoney(item.monto)}
                          </span>
                        ) : null}
                      </span>

                      <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                        <span>{item.tipoLabel}</span>
                        {item.usuario ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className="truncate">{item.usuario}</span>
                          </>
                        ) : null}
                        {item.fecha ? (
                          <>
                            <span aria-hidden>·</span>
                            <time dateTime={item.fecha}>
                              {formatDateTime(item.fecha)}
                            </time>
                          </>
                        ) : null}
                      </span>
                    </span>

                    {item.href ? (
                      <ArrowUpRight
                        aria-hidden
                        className="mt-1 size-4 shrink-0 text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    ) : null}
                  </>
                );

                return (
                  <li
                    key={item.key}
                    className="border-b border-separator last:border-0"
                  >
                    {item.href ? (
                      <Link
                        href={item.href}
                        className={cn(
                          "group -mx-2 flex items-start gap-3 rounded-lg px-2 py-3 transition-colors duration-200 hover:bg-surface-secondary",
                          FOCUS_RING,
                        )}
                      >
                        {contenido}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3 py-3">
                        {contenido}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="Sin actividad reciente"
              description="Las proformas, órdenes y pagos aparecerán acá."
              icon={<Sparkles aria-hidden className="size-5" />}
              className="border-0 bg-transparent px-2 py-8"
            />
          )}
        </Card.Content>
      </Card>
    </section>
  );
}
