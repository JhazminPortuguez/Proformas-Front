import { BarChart } from "@/components/reportes/bar-chart";
import { ReporteBloque, ReporteKpis, ReporteTabla } from "@/components/reportes/reporte-ui";
import type { ReportePromocionFila, ReportePromociones } from "@/lib/api/types";
import { formatMoney, formatNumber } from "@/lib/utils";

function plural(count: number, singular: string, many: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : many}`;
}

const COLUMNAS = [
  {
    header: "Promoción",
    cell: (fila: ReportePromocionFila) => (
      <span>
        <span className="font-medium text-foreground">{fila.nombre}</span>
        <span className="block text-xs text-muted">
          {fila.tipo_etiqueta} · {fila.etiqueta}
        </span>
      </span>
    ),
  },
  { header: "Usos", numeric: true, cell: (fila: ReportePromocionFila) => formatNumber(fila.usos) },
  { header: "Proformas", numeric: true, cell: (fila: ReportePromocionFila) => formatNumber(fila.proformas) },
  { header: "Descontado", numeric: true, cell: (fila: ReportePromocionFila) => formatMoney(fila.descontado) },
  {
    header: "En ventas aceptadas",
    numeric: true,
    cell: (fila: ReportePromocionFila) => formatMoney(fila.descontado_ventas),
  },
];

/** Ronda C: cuántas veces se usó cada promoción y cuánto se descontó. */
export function ReportePromocionesView({ data }: { data: ReportePromociones }) {
  const top = data.promociones.slice(0, 8);

  return (
    <div className="space-y-6">
      <ReporteKpis
        label="Indicadores de promociones"
        kpis={[
          {
            label: "Usos de promociones",
            value: formatNumber(data.usos),
            hint: plural(data.promociones.length, "promoción distinta", "promociones distintas"),
          },
          {
            label: "Proformas con promoción",
            value: formatNumber(data.proformas),
            hint: "Enviadas, aceptadas o rechazadas",
          },
          {
            label: "Descontado en total",
            value: formatMoney(data.descontado),
            hint: "En las proformas del periodo",
          },
          {
            label: "En ventas aceptadas",
            value: formatMoney(data.descontado_ventas),
            hint: "Solo proformas aceptadas",
          },
        ]}
      />

      <ReporteBloque
        id="reporte-promociones-detalle"
        title="Uso por promoción"
        description="Cuenta las líneas con promoción de las proformas emitidas en el periodo que ya se enviaron (sin borradores)."
      >
        <div className="space-y-4">
          {top.length > 0 ? (
            <BarChart
              ariaLabel="Gráfico de lo descontado por cada promoción"
              money
              labels={top.map((fila) => fila.nombre)}
              series={[{ label: "Descontado", tone: "accent", data: top.map((fila) => fila.descontado) }]}
            />
          ) : null}

          <ReporteTabla
            label="Promociones usadas en el periodo"
            columns={COLUMNAS}
            rows={data.promociones}
            getRowKey={(fila) => fila.id}
            empty="No se usaron promociones en el periodo."
            footer={
              data.promociones.length > 0
                ? [
                    `Total: ${plural(data.promociones.length, "promoción", "promociones")}`,
                    formatNumber(data.usos),
                    formatNumber(data.proformas),
                    formatMoney(data.descontado),
                    formatMoney(data.descontado_ventas),
                  ]
                : undefined
            }
          />
        </div>
      </ReporteBloque>
    </div>
  );
}
