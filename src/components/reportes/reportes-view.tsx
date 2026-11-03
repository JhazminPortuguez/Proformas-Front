import type { ReactNode } from "react";
import { NavTabs } from "@/components/ui/nav-tabs";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { CsvLink } from "@/components/reportes/reporte-ui";
import { ReportesFiltros } from "@/components/reportes/reportes-filtros";
import type { Cliente, User } from "@/lib/api/types";
import {
  REPORTES,
  reporteCsvHref,
  reportesPestanas,
  type ReportesQuery,
} from "@/lib/reportes";
import { formatDateNumeric } from "@/lib/utils";

interface ReportesViewProps {
  query: ReportesQuery;
  clientes: readonly Cliente[];
  operarios: readonly User[];
  /** Mensaje si el reporte no se pudo cargar; reemplaza al contenido. */
  error?: string | null;
  children?: ReactNode;
}

export function ReportesView({
  query,
  clientes,
  operarios,
  error,
  children,
}: ReportesViewProps) {
  return (
    <div className="space-y-6">
      <NavTabs
        label="Reportes"
        current={query.tab}
        tabs={reportesPestanas(query)}
      />

      <ReportesFiltros query={query} clientes={clientes} operarios={operarios} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          {REPORTES[query.tab].label}
          <span className="block text-xs font-normal text-muted sm:inline sm:ps-2">
            Del{" "}
            <time dateTime={query.desde}>{formatDateNumeric(query.desde)}</time>{" "}
            al{" "}
            <time dateTime={query.hasta}>{formatDateNumeric(query.hasta)}</time>
          </span>
        </h2>

        {error ? null : <CsvLink href={reporteCsvHref(query)} />}
      </div>

      {error ? (
        <ErrorState message={error} action={<RetryButton />} />
      ) : (
        children
      )}
    </div>
  );
}
