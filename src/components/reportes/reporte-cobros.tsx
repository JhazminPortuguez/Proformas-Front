import Link from "next/link";
import { FOCUS_RING } from "@/components/dashboard/dashboard-ui";
import { StatusChip } from "@/components/ui/status-chip";
import { ConceptoCuentaChip } from "@/components/cobros/chips";
import { BarChart } from "@/components/reportes/bar-chart";
import {
  ClienteConNit,
  ReporteBloque,
  ReporteKpis,
  ReporteTabla,
} from "@/components/reportes/reporte-ui";
import type { ReporteCobros, ReporteCuentaSaldo } from "@/lib/api/types";
import { AGING_BANDS } from "@/lib/dashboard";
import { cn, formatDateNumeric, formatMoney, formatNumber } from "@/lib/utils";

function plural(count: number, singular: string, many: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : many}`;
}

function FranjaChip({ franja }: { franja: ReporteCuentaSaldo["franja"] }) {
  const band = AGING_BANDS.find((item) => item.key === franja) ?? AGING_BANDS[0];

  return <StatusChip tone={band.tone}>{band.label}</StatusChip>;
}

const COLUMNAS = [
  {
    header: "Número",
    cell: (cuenta: ReporteCuentaSaldo) => (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <Link
          href={`/cobros/${cuenta.id}`}
          className={cn(
            "whitespace-nowrap font-medium text-accent-soft-foreground underline-offset-4 hover:underline",
            FOCUS_RING,
          )}
        >
          {cuenta.numero}
        </Link>
        <ConceptoCuentaChip cuenta={cuenta} />
      </span>
    ),
  },
  {
    header: "Cliente",
    cell: (cuenta: ReporteCuentaSaldo) => (
      <ClienteConNit
        nombre={cuenta.cliente.nombre_razon}
        nitCi={cuenta.cliente.nit_ci}
      />
    ),
  },
  { header: "Vencimiento", numeric: true, cell: (cuenta: ReporteCuentaSaldo) => formatDateNumeric(cuenta.fecha_vencimiento) },
  { header: "Días vencida", numeric: true, cell: (cuenta: ReporteCuentaSaldo) => formatNumber(cuenta.dias_vencida) },
  { header: "Saldo", numeric: true, cell: (cuenta: ReporteCuentaSaldo) => formatMoney(cuenta.saldo) },
  { header: "Antigüedad", cell: (cuenta: ReporteCuentaSaldo) => <FranjaChip franja={cuenta.franja} /> },
];

export function ReporteCobrosView({ data }: { data: ReporteCobros }) {
  return (
    <div className="space-y-6">
      <ReporteKpis
        label="Indicadores de cuentas por cobrar"
        kpis={[
          {
            label: "Cobrado en el periodo",
            value: formatMoney(data.cobrado),
            hint: plural(data.pagos, "pago registrado", "pagos registrados"),
          },
          {
            label: "Saldo pendiente",
            value: formatMoney(data.saldo_pendiente),
            hint: `${plural(data.cuentas_con_saldo, "cuenta con saldo", "cuentas con saldo")}, a hoy`,
          },
          {
            label: "Vencido",
            value: formatMoney(data.monto_vencido),
            hint: plural(data.vencidas, "cuenta vencida", "cuentas vencidas"),
          },
          {
            label: "Al día",
            value: formatMoney(data.aging.al_dia),
            hint: "Saldo que todavía no vence",
          },
        ]}
      />

      <ReporteBloque
        id="reporte-cobros-antiguedad"
        title="Saldos por antigüedad"
        description="Saldo pendiente a hoy según los días vencidos. No depende del periodo elegido."
      >
        {data.cuentas.length === 0 ? (
          <ReporteTabla
            label="Cuentas con saldo pendiente"
            columns={COLUMNAS}
            rows={data.cuentas}
            getRowKey={(cuenta) => cuenta.id}
            empty="No hay cuentas con saldo pendiente."
          />
        ) : (
          <div className="space-y-4">
            <BarChart
              ariaLabel="Gráfico del saldo pendiente por antigüedad: al día, 1 a 30, 31 a 60, 61 a 90 y más de 90 días"
              money
              stacked
              labels={AGING_BANDS.map((band) => band.label)}
              series={AGING_BANDS.map((band, index) => ({
                label: band.label,
                tone: band.tone,
                opacity: band.key === "d1_30" || band.key === "d61_90" ? 0.6 : undefined,
                data: AGING_BANDS.map((_, position) =>
                  position === index ? data.aging[band.key] : 0,
                ),
              }))}
            />

            <dl
              aria-label="Saldo por antigüedad"
              className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5"
            >
              {AGING_BANDS.map((band) => (
                <div key={band.key} className="rounded-lg bg-surface-secondary px-3 py-2">
                  <dt className="text-xs text-muted">{band.label}</dt>
                  <dd className="numeric font-semibold text-foreground">
                    {formatMoney(data.aging[band.key])}
                  </dd>
                </div>
              ))}
            </dl>

            <ReporteTabla
              label="Cuentas con saldo pendiente"
              columns={COLUMNAS}
              rows={data.cuentas}
              getRowKey={(cuenta) => cuenta.id}
              empty="No hay cuentas con saldo pendiente."
              footer={["Total", "", "", "", formatMoney(data.saldo_pendiente), ""]}
            />
          </div>
        )}
      </ReporteBloque>
    </div>
  );
}
