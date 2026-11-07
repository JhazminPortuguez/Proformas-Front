import { BarChart } from "@/components/reportes/bar-chart";
import {
  ReporteBloque,
  ReporteKpis,
  ReporteTabla,
} from "@/components/reportes/reporte-ui";
import type {
  ReporteServicio,
  ReporteServiciosProformas,
} from "@/lib/api/types";
import { formatPorcentaje } from "@/lib/reportes";
import { formatMoney, formatNumber } from "@/lib/utils";

/** Cuántos servicios entran en el gráfico; la tabla los muestra todos. */
const TOP_GRAFICO = 10;

function nombreServicio(servicio: ReporteServicio): string {
  return servicio.nombre?.trim() || `Servicio #${servicio.servicio_id}`;
}

function plural(count: number, singular: string, many: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : many}`;
}

const COLUMNAS = [
  { header: "Servicio", cell: (servicio: ReporteServicio) => nombreServicio(servicio) },
  { header: "Categoría", cell: (servicio: ReporteServicio) => servicio.categoria?.trim() || "—" },
  { header: "Cantidad", numeric: true, cell: (servicio: ReporteServicio) => formatNumber(servicio.cantidad) },
  { header: "Monto", numeric: true, cell: (servicio: ReporteServicio) => formatMoney(servicio.monto) },
];

export function ReporteServiciosView({
  data,
}: {
  data: ReporteServiciosProformas;
}) {
  const { proformas, servicios } = data;
  const top = servicios.slice(0, TOP_GRAFICO);

  return (
    <div className="space-y-6">
      <ReporteKpis
        label="Indicadores de proformas"
        kpis={[
          {
            label: "Monto cotizado",
            value: formatMoney(proformas.cotizado),
            hint: `${plural(proformas.cotizadas, "proforma enviada", "proformas enviadas")} en el periodo`,
          },
          {
            label: "Monto aceptado",
            value: formatMoney(proformas.aceptado),
            hint: `${plural(proformas.aceptadas, "proforma aceptada", "proformas aceptadas")} en el periodo`,
          },
          {
            label: "Tasa de aceptación",
            value: formatPorcentaje(proformas.tasa_aceptacion),
            hint: `${plural(proformas.aceptadas, "aceptada", "aceptadas")} y ${plural(proformas.rechazadas, "rechazada", "rechazadas")}`,
          },
          {
            label: "En espera",
            value: formatNumber(proformas.en_espera),
            hint: "Enviadas sin respuesta del cliente",
          },
        ]}
      />

      <ReporteBloque
        id="reporte-servicios-ranking"
        title="Servicios más solicitados"
        description="Servicios de las órdenes del periodo que no se cancelaron."
      >
        {servicios.length === 0 ? (
          <ReporteTabla
            label="Servicios más solicitados"
            columns={COLUMNAS}
            rows={servicios}
            getRowKey={(servicio) => servicio.servicio_id}
            empty="No hay servicios en órdenes de este periodo."
          />
        ) : (
          <div className="space-y-4">
            <BarChart
              ariaLabel={`Gráfico de los ${formatNumber(top.length)} servicios más solicitados por cantidad`}
              horizontal
              labels={top.map(nombreServicio)}
              series={[
                {
                  label: "Cantidad",
                  tone: "accent",
                  data: top.map((servicio) => servicio.cantidad),
                },
              ]}
            />
            <ReporteTabla
              label="Servicios más solicitados"
              columns={COLUMNAS}
              rows={servicios}
              getRowKey={(servicio) => servicio.servicio_id}
              empty="No hay servicios en órdenes de este periodo."
            />
          </div>
        )}
      </ReporteBloque>
    </div>
  );
}
