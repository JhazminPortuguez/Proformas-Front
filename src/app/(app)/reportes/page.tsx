import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ReporteInventarioView } from "@/components/reportes/reporte-inventario";
import { ReporteOrdenesView } from "@/components/reportes/reporte-ordenes";
import { ReporteServiciosView } from "@/components/reportes/reporte-servicios";
import { ReportesView } from "@/components/reportes/reportes-view";
import {
  getClientes,
  getReporte,
  getUsuarios,
  requireUser,
} from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  Cliente,
  ReporteInventario,
  ReporteOrdenes,
  ReporteServiciosProformas,
  User,
} from "@/lib/api/types";
import {
  REPORTES,
  parseReportesQuery,
  reporteParams,
  type ReportesQuery,
} from "@/lib/reportes";

export const metadata: Metadata = {
  title: "Reportes",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Opciones de los filtros: si fallan, el reporte se muestra igual sin ellas. */
async function cargarClientes(): Promise<Cliente[]> {
  try {
    return (await getClientes({ perPage: 100 })).data;
  } catch {
    return [];
  }
}

async function cargarOperarios(): Promise<User[]> {
  try {
    return (await getUsuarios({ rol: "operario", perPage: 100 })).data;
  } catch {
    return [];
  }
}

async function cargarReporte(query: ReportesQuery): Promise<ReactNode> {
  const params = reporteParams(query);
  const endpoint = REPORTES[query.tab].endpoint;

  switch (query.tab) {
    case "ordenes":
      return (
        <ReporteOrdenesView
          data={await getReporte<ReporteOrdenes>(endpoint, params)}
        />
      );
    case "servicios":
      return (
        <ReporteServiciosView
          data={await getReporte<ReporteServiciosProformas>(endpoint, params)}
        />
      );
    case "inventario":
      return (
        <ReporteInventarioView
          data={await getReporte<ReporteInventario>(endpoint, params)}
        />
      );
  }
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["admin"]);
  const params = await searchParams;

  const query = parseReportesQuery(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, first(value)]),
    ),
  );

  const [clientes, operarios] = await Promise.all([
    cargarClientes(),
    cargarOperarios(),
  ]);

  let contenido: ReactNode = null;
  let error: string | null = null;

  try {
    contenido = await cargarReporte(query);
  } catch (caught) {
    if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
      redirect("/login");
    }

    error = apiErrorMessage(caught);
  }

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Indicadores del periodo para tomar decisiones. Montos en Bs."
      />

      <ReportesView
        query={query}
        clientes={clientes}
        operarios={operarios}
        error={error}
      >
        {contenido}
      </ReportesView>
    </>
  );
}
