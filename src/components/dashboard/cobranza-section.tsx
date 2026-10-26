import { Card, Chip } from "@heroui/react";
import { TriangleAlert } from "lucide-react";
import {
  DASHBOARD_VENCIDAS_HREF,
  dashboardAgingSlices,
  dashboardCobradoMes,
  dashboardSaldoPorCobrar,
  dashboardVencidas,
  dashboardVencido,
} from "@/lib/dashboard";
import type { DashboardData } from "@/lib/api/types";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import {
  PanelEmpty,
  QuietLink,
  SectionIntro,
  toneBar,
} from "@/components/dashboard/dashboard-ui";

export function CobranzaSection({ data }: { data: DashboardData }) {
  const cobros = data.cobros;
  const saldo = dashboardSaldoPorCobrar(data);
  const vencido = dashboardVencido(data);
  const vencidas = dashboardVencidas(data) ?? 0;
  const cobrado = dashboardCobradoMes(data);
  const montoTotal = cobros?.monto_total ?? null;

  const aging = cobros?.aging;
  const slices = aging ? dashboardAgingSlices(aging, saldo) : [];

  const progreso =
    cobrado !== null && montoTotal !== null && montoTotal > 0
      ? Math.min(100, Math.max(0, Math.round((cobrado / montoTotal) * 100)))
      : 0;

  return (
    <section aria-labelledby="cobranza-title" className="space-y-3">
      <SectionIntro
        id="cobranza-title"
        title="Cobranza"
        description="Saldo pendiente, mora y antigüedad de la cartera."
        action={<QuietLink href="/cobros">Ver cartera</QuietLink>}
      />

      <Card>
        <Card.Header className="flex-row flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Card.Title>Cartera del mes</Card.Title>
            <Card.Description>
              {cobros
                ? `${formatNumber(cobros.cuentas)} cuentas emitidas al cierre de órdenes.`
                : "Sin datos de cartera en este momento."}
            </Card.Description>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cobros ? (
              <Chip size="sm" variant="soft" color="default">
                <Chip.Label>
                  {formatNumber(cobros.pendientes)}{" "}
                  {cobros.pendientes === 1 ? "pendiente" : "pendientes"}
                </Chip.Label>
              </Chip>
            ) : null}
            {vencidas > 0 ? (
              <Chip size="sm" variant="soft" color="danger">
                <Chip.Label>
                  {formatNumber(vencidas)}{" "}
                  {vencidas === 1 ? "vencida" : "vencidas"}
                </Chip.Label>
              </Chip>
            ) : null}
          </div>
        </Card.Header>

        <Card.Content className="mt-2 grid gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-4 lg:border-e lg:border-separator lg:pe-6">
            <div>
              <p className="text-xs text-muted">Saldo por cobrar</p>
              <p className="numeric mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {formatMoney(saldo)}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {saldo === null
                  ? "Sin datos de cartera"
                  : cobrado === null
                    ? "Pagos del mes sin datos"
                    : `Cobrado ${formatMoney(cobrado)} de ${formatMoney(montoTotal)}`}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-muted">Vencido</dt>
                <dd
                  className={cn(
                    "numeric mt-0.5 text-lg font-semibold",
                    vencido !== null && vencido > 0
                      ? "text-danger"
                      : "text-foreground",
                  )}
                >
                  {formatMoney(vencido)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Cobrado del mes</dt>
                <dd className="numeric mt-0.5 text-lg font-semibold text-foreground">
                  {formatMoney(cobrado)}
                </dd>
              </div>
            </dl>

            <div>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-muted">Cobrado sobre lo emitido</span>
                <span className="numeric text-muted">{progreso}%</span>
              </div>
              <div
                role="progressbar"
                aria-label={`Cobrado del mes: ${formatMoney(cobrado)} de ${formatMoney(montoTotal)} (${progreso} %)`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progreso}
                className="mt-1 h-2 overflow-hidden rounded-full bg-surface-secondary"
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>

            {vencidas > 0 ? (
              <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[11px] text-warning-soft-foreground">
                <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Hay saldo en mora. Revisá las cuentas vencidas para priorizar
                  el seguimiento.
                </span>
              </p>
            ) : null}
          </div>

          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Antigüedad del saldo
              </h3>
              <QuietLink href={DASHBOARD_VENCIDAS_HREF}>
                Ver cuentas vencidas
              </QuietLink>
            </div>

            {slices.length > 0 ? (
              <>
                <ul className="mt-3 flex flex-col gap-3">
                  {slices.map((banda) => (
                    <li key={banda.key}>
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="text-muted">{banda.label}</span>
                        <span className="flex items-baseline gap-2">
                          <span className="numeric font-medium text-foreground">
                            {formatMoney(banda.amount)}
                          </span>
                          <span className="numeric w-9 text-end text-[11px] text-muted">
                            {banda.percent}%
                          </span>
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`${banda.label}: ${formatMoney(
                          banda.amount,
                        )} (${banda.percent} % del saldo)`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={banda.percent}
                        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-secondary"
                      >
                        <div
                          className={cn(
                            "h-full rounded-full",
                            toneBar(banda.tone),
                          )}
                          style={{ width: `${banda.percent}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-separator pt-3 text-xs">
                  <span className="text-muted">Total desglosado</span>
                  <span className="numeric font-semibold text-foreground">
                    {formatMoney(
                      slices.reduce((total, banda) => total + banda.amount, 0),
                    )}
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-3">
                <PanelEmpty>
                  Sin desglose de antigüedad disponible para esta cartera.
                </PanelEmpty>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>
    </section>
  );
}
