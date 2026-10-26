import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardList,
  HandCoins,
  Package,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@heroui/react";
import {
  DASHBOARD_VENCIDAS_HREF,
  dashboardKpis,
  type DashboardKpi,
  type DashboardKpiKey,
} from "@/lib/dashboard";
import type { DashboardData } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  FOCUS_RING,
  QuietLink,
  SectionIntro,
  metricValue,
  toneSurface,
} from "@/components/dashboard/dashboard-ui";

const KPI_ICON: Record<DashboardKpiKey, LucideIcon> = {
  clientes: Users,
  ordenes: ClipboardList,
  saldo: HandCoins,
  stock: Package,
  cobrado: TrendingUp,
  cotizado: Wallet,
};

type KpiMap = Record<DashboardKpiKey, DashboardKpi>;

const OPERACION_KEYS: readonly DashboardKpiKey[] = [
  "clientes",
  "ordenes",
  "stock",
];

export function KpiOverview({ data }: { data: DashboardData }) {
  const kpis = Object.fromEntries(
    dashboardKpis(data).map((kpi) => [kpi.key, kpi]),
  ) as KpiMap;

  const vencidas = data.cobros?.vencidas ?? 0;

  return (
    <section aria-labelledby="pulso-title" className="space-y-3">
      <SectionIntro
        id="pulso-title"
        title="Pulso del mes"
        description="Finanzas, ejecución y abastecimiento en una sola lectura."
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <FinanceCard kpis={kpis} vencidas={vencidas} />
        </div>
        <div className="lg:col-span-5">
          <OperationsPanel kpis={kpis} />
        </div>
      </div>
    </section>
  );
}

function FinanceCard({
  kpis,
  vencidas,
}: {
  kpis: KpiMap;
  vencidas: number;
}) {
  const saldo = kpis.saldo;
  const secundarios = [kpis.cobrado, kpis.cotizado];

  return (
    <Card className="h-full">
      <Card.Content className="flex h-full flex-col gap-4">
        <Link
          href={saldo.href}
          className={cn("-m-1 block rounded-xl p-1", FOCUS_RING)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Finanzas del mes
              </p>
              <p className="mt-2 text-xs text-muted">Saldo por cobrar</p>
              <p className="numeric mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {metricValue(saldo)}
              </p>
              <p className="mt-1 text-xs text-muted">{saldo.hint}</p>
            </div>
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground"
            >
              <HandCoins className="size-5" />
            </span>
          </div>
        </Link>

        <ul className="grid gap-3 border-t border-separator pt-4 sm:grid-cols-2">
          {secundarios.map((kpi) => {
            const Icon = KPI_ICON[kpi.key];

            return (
              <li key={kpi.key}>
                <Link
                  href={kpi.href}
                  className={cn(
                    "group flex items-start gap-2.5 rounded-lg p-1 transition-colors duration-200 hover:bg-surface-secondary",
                    FOCUS_RING,
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                      toneSurface(kpi.tone),
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-muted">
                      {kpi.label}
                    </span>
                    <span className="numeric mt-0.5 block text-lg font-semibold text-foreground">
                      {metricValue(kpi)}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {kpi.hint}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1">
          <QuietLink href={saldo.href}>Ver cartera</QuietLink>
          {vencidas > 0 ? (
            <QuietLink href={DASHBOARD_VENCIDAS_HREF}>
              Ver {vencidas} {vencidas === 1 ? "vencida" : "vencidas"}
            </QuietLink>
          ) : null}
        </div>
      </Card.Content>
    </Card>
  );
}

function OperationsPanel({ kpis }: { kpis: KpiMap }) {
  return (
    <Card className="h-full">
      <Card.Header className="flex-row items-end justify-between gap-3">
        <div>
          <Card.Title>Operación</Card.Title>
          <Card.Description>
            Base comercial, ejecución y abastecimiento.
          </Card.Description>
        </div>
      </Card.Header>

      <Card.Content className="justify-between">
        <ul className="flex flex-col divide-y divide-separator">
          {OPERACION_KEYS.map((key) => {
            const kpi = kpis[key];
            const Icon = KPI_ICON[key];

            return (
              <li key={key}>
                <Link
                  href={kpi.href}
                  className={cn(
                    "group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-200 hover:bg-surface-secondary",
                    FOCUS_RING,
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg",
                      toneSurface(kpi.tone),
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {kpi.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {kpi.hint}
                    </span>
                  </span>
                  <span className="numeric shrink-0 text-xl font-semibold text-foreground">
                    {metricValue(kpi)}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </Card.Content>
    </Card>
  );
}
