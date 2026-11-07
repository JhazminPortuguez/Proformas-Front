import Link from "next/link";
import { FOCUS_RING, PanelEmpty } from "@/components/dashboard/dashboard-ui";
import { OrdenEstadoChip } from "@/components/ui/status-chip";
import { BarChart } from "@/components/reportes/bar-chart";
import {
  ClienteConNit,
  ReporteBloque,
  ReporteKpis,
  ReporteTabla,
} from "@/components/reportes/reporte-ui";
import type {
  ReporteOrdenAtrasada,
  ReporteOrdenes,
  ReporteOrdenesOperario,
} from "@/lib/api/types";
import { ORDEN_ESTADOS, type OrdenEstado } from "@/lib/estados";
import { formatPorcentaje } from "@/lib/reportes";
import { cn, formatDateNumeric, formatNumber } from "@/lib/utils";

const ESTADOS = Object.keys(ORDEN_ESTADOS) as OrdenEstado[];

function nombreOperario(fila: Pick<ReporteOrdenesOperario, "operario">): string {
  return fila.operario?.trim() || "Sin asignar";
}

const COLUMNAS_OPERARIO = [
  { header: "Operario", cell: (fila: ReporteOrdenesOperario) => nombreOperario(fila) },
  { header: "Pendientes", numeric: true, cell: (fila: ReporteOrdenesOperario) => formatNumber(fila.pendientes) },
  { header: "Asignadas", numeric: true, cell: (fila: ReporteOrdenesOperario) => formatNumber(fila.asignadas) },
  { header: "En proceso", numeric: true, cell: (fila: ReporteOrdenesOperario) => formatNumber(fila.en_proceso) },
  { header: "Finalizadas", numeric: true, cell: (fila: ReporteOrdenesOperario) => formatNumber(fila.finalizadas) },
  { header: "Canceladas", numeric: true, cell: (fila: ReporteOrdenesOperario) => formatNumber(fila.canceladas) },
  { header: "Total", numeric: true, cell: (fila: ReporteOrdenesOperario) => formatNumber(fila.total) },
];

const COLUMNAS_ATRASO = [
  {
    header: "Código",
    cell: (orden: ReporteOrdenAtrasada) => (
      <Link
        href={`/ordenes/${orden.id}`}
        className={cn(
          "whitespace-nowrap font-medium text-accent-soft-foreground underline-offset-4 hover:underline",
          FOCUS_RING,
        )}
      >
        {orden.numero}
      </Link>
    ),
  },
  {
    header: "Cliente",
    cell: (orden: ReporteOrdenAtrasada) => (
      <ClienteConNit
        nombre={orden.cliente.nombre_razon}
        nitCi={orden.cliente.nit_ci}
      />
    ),
  },
  { header: "Operario", cell: (orden: ReporteOrdenAtrasada) => nombreOperario(orden) },
  { header: "Programada", numeric: true, cell: (orden: ReporteOrdenAtrasada) => formatDateNumeric(orden.fecha_programada) },
  { header: "Finalizada", numeric: true, cell: (orden: ReporteOrdenAtrasada) => formatDateNumeric(orden.fecha_finalizacion) },
  { header: "Días de atraso", numeric: true, cell: (orden: ReporteOrdenAtrasada) => formatNumber(orden.dias_atraso) },
];

export function ReporteOrdenesView({ data }: { data: ReporteOrdenes }) {
  const { cumplimiento } = data;
  const medibles = cumplimiento.a_tiempo + cumplimiento.con_atraso;
  const finalizadas = data.por_estado.FINALIZADA ?? 0;

  return (
    <div className="space-y-6">
      <ReporteKpis
        label="Indicadores de órdenes"
        kpis={[
          { label: "Órdenes del periodo", value: formatNumber(data.total) },
          { label: "Finalizadas", value: formatNumber(finalizadas) },
          {
            label: "A tiempo",
            value: formatPorcentaje(cumplimiento.porcentaje_a_tiempo),
            hint: `${formatNumber(cumplimiento.a_tiempo)} de ${formatNumber(medibles)} finalizadas con fecha`,
          },
          {
            label: "Con atraso",
            value: formatNumber(cumplimiento.con_atraso),
            hint: `Sin fecha programada: ${formatNumber(cumplimiento.sin_fecha)}`,
          },
        ]}
      />

      <ul aria-label="Órdenes por estado" className="flex flex-wrap gap-2">
        {ESTADOS.map((estado) => (
          <li
            key={estado}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5"
          >
            <OrdenEstadoChip estado={estado} />
            <span className="numeric text-sm font-semibold text-foreground">
              {formatNumber(data.por_estado[estado] ?? 0)}
            </span>
          </li>
        ))}
      </ul>

      {data.total === 0 ? (
        <PanelEmpty>No hay órdenes de servicio en este periodo.</PanelEmpty>
      ) : (
        <>
          <ReporteBloque
            id="reporte-ordenes-operario"
            title="Órdenes por operario"
            description="Asignadas, en proceso y finalizadas de cada operario en el periodo."
          >
            <div className="space-y-4">
              <BarChart
                ariaLabel="Gráfico de órdenes asignadas, en proceso y finalizadas por operario"
                labels={data.por_operario.map(nombreOperario)}
                series={[
                  {
                    label: ORDEN_ESTADOS.ASIGNADA.label,
                    tone: ORDEN_ESTADOS.ASIGNADA.tone,
                    opacity: 0.45,
                    data: data.por_operario.map((fila) => fila.asignadas),
                  },
                  {
                    label: ORDEN_ESTADOS.EN_PROCESO.label,
                    tone: ORDEN_ESTADOS.EN_PROCESO.tone,
                    data: data.por_operario.map((fila) => fila.en_proceso),
                  },
                  {
                    label: ORDEN_ESTADOS.FINALIZADA.label,
                    tone: ORDEN_ESTADOS.FINALIZADA.tone,
                    data: data.por_operario.map((fila) => fila.finalizadas),
                  },
                ]}
              />
              <ReporteTabla
                label="Órdenes por operario"
                columns={COLUMNAS_OPERARIO}
                rows={data.por_operario}
                getRowKey={(fila) => fila.operario_id ?? "sin-asignar"}
                empty="Sin órdenes en el periodo."
              />
            </div>
          </ReporteBloque>

          <ReporteBloque
            id="reporte-ordenes-atraso"
            title="Órdenes finalizadas con atraso"
            description="Terminaron después del día programado (hora de Bolivia)."
          >
            <ReporteTabla
              label="Órdenes finalizadas con atraso"
              columns={COLUMNAS_ATRASO}
              rows={data.atrasadas}
              getRowKey={(orden) => orden.id}
              empty="Ninguna orden finalizada con atraso en el periodo."
            />
          </ReporteBloque>
        </>
      )}
    </div>
  );
}
