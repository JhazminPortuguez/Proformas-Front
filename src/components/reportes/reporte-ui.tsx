import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { Card } from "@heroui/react";
import {
  FOCUS_RING,
  PanelEmpty,
  SectionIntro,
} from "@/components/dashboard/dashboard-ui";
import { cn } from "@/lib/utils";

export interface ReporteKpi {
  label: string;
  value: string;
  hint?: string;
}

/** Indicadores del reporte: dos columnas en el celular, cuatro en escritorio. */
export function ReporteKpis({
  label,
  kpis,
}: {
  label: string;
  kpis: readonly ReporteKpi[];
}) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <Card.Content className="gap-1">
            <dt className="text-xs font-medium text-muted">{kpi.label}</dt>
            <dd className="numeric text-xl font-semibold text-foreground sm:text-2xl">
              {kpi.value}
            </dd>
            {kpi.hint ? (
              <dd className="text-xs text-muted">{kpi.hint}</dd>
            ) : null}
          </Card.Content>
        </Card>
      ))}
    </dl>
  );
}

interface ReporteBloqueProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}

/** Bloque con título y tarjeta, igual que las secciones del dashboard. */
export function ReporteBloque({
  id,
  title,
  description,
  children,
}: ReporteBloqueProps) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <SectionIntro id={id} title={title} description={description} />
      <Card className="min-w-0">
        <Card.Content className="min-w-0">{children}</Card.Content>
      </Card>
    </section>
  );
}

export interface ReporteColumna<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** Números y montos a la derecha. */
  numeric?: boolean;
}

interface ReporteTablaProps<T> {
  label: string;
  columns: readonly ReporteColumna<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string | number;
  empty: string;
  footer?: readonly ReactNode[];
}

/**
 * Tabla compacta. En el celular se desplaza dentro de su tarjeta, sin mover
 * la página.
 */
export function ReporteTabla<T>({
  label,
  columns,
  rows,
  getRowKey,
  empty,
  footer,
}: ReporteTablaProps<T>) {
  if (rows.length === 0) {
    return <PanelEmpty>{empty}</PanelEmpty>;
  }

  const align = (numeric?: boolean) => (numeric ? "text-end" : "text-start");

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table aria-label={label} className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-2 py-2 text-xs font-medium text-muted first:ps-0 last:pe-0",
                  align(column.numeric),
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="border-b border-separator last:border-0"
            >
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={cn(
                    "px-2 py-2.5 align-top first:ps-0 last:pe-0",
                    align(column.numeric),
                    column.numeric && "numeric whitespace-nowrap",
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? (
          <tfoot>
            <tr className="border-t border-border font-semibold">
              {footer.map((value, index) => (
                <td
                  key={columns[index]?.header ?? index}
                  className={cn(
                    "px-2 py-2.5 first:ps-0 last:pe-0",
                    align(columns[index]?.numeric),
                    columns[index]?.numeric && "numeric whitespace-nowrap",
                  )}
                >
                  {value}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

/** Nombre o razón social con su NIT/CI debajo. */
export function ClienteConNit({
  nombre,
  nitCi,
}: {
  nombre: string | null;
  nitCi: string | null;
}) {
  return (
    <div className="min-w-0">
      <p className="max-w-[16rem] truncate">{nombre?.trim() || "Sin cliente"}</p>
      {nitCi ? (
        <p className="numeric text-xs text-muted">NIT/CI {nitCi}</p>
      ) : null}
    </div>
  );
}

/**
 * Descarga del CSV. Es un enlace al back (vía el proxy `/api`), no una acción
 * de la app: el navegador baja el archivo con la sesión actual.
 */
export function CsvLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      download
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary",
        FOCUS_RING,
      )}
    >
      <Download aria-hidden className="size-4" />
      Exportar CSV
    </a>
  );
}
