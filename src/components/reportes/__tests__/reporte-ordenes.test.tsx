import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReporteOrdenesView } from "@/components/reportes/reporte-ordenes";
import { ReportesView } from "@/components/reportes/reportes-view";
import type { ReporteOrdenes } from "@/lib/api/types";
import type { ReportesQuery } from "@/lib/reportes";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const QUERY: ReportesQuery = {
  tab: "ordenes",
  desde: "2026-11-01",
  hasta: "2026-11-30",
  clienteId: "",
  operarioId: "",
};

const DATA: ReporteOrdenes = {
  periodo: { desde: "2026-11-01", hasta: "2026-11-30" },
  total: 8,
  por_estado: { PENDIENTE: 1, ASIGNADA: 1, EN_PROCESO: 1, FINALIZADA: 4, CANCELADA: 1 },
  por_operario: [
    { operario_id: 2, operario: "Ana Operaria", asignadas: 1, en_proceso: 0, finalizadas: 2, total: 3 },
    { operario_id: null, operario: null, asignadas: 0, en_proceso: 0, finalizadas: 0, total: 2 },
  ],
  cumplimiento: { a_tiempo: 2, con_atraso: 1, sin_fecha: 1, porcentaje_a_tiempo: 66.7 },
  atrasadas: [
    {
      id: 12,
      numero: "OS-2026-000002",
      cliente: { nombre_razon: "Constructora Andina", nit_ci: "111" },
      operario: "Ana Operaria",
      fecha_programada: "2026-11-05",
      fecha_finalizacion: "2026-11-08",
      dias_atraso: 3,
    },
  ],
};

const VACIO: ReporteOrdenes = {
  periodo: { desde: "2026-11-01", hasta: "2026-11-30" },
  total: 0,
  por_estado: { PENDIENTE: 0, ASIGNADA: 0, EN_PROCESO: 0, FINALIZADA: 0, CANCELADA: 0 },
  por_operario: [],
  cumplimiento: { a_tiempo: 0, con_atraso: 0, sin_fecha: 0, porcentaje_a_tiempo: null },
  atrasadas: [],
};

function kpi(label: string): HTMLElement {
  const indicadores = screen.getByLabelText("Indicadores de órdenes");

  return within(indicadores).getByText(label).parentElement as HTMLElement;
}

describe("ReporteOrdenesView", () => {
  it("muestra indicadores, estados, operarios y órdenes con atraso", () => {
    render(<ReporteOrdenesView data={DATA} />);

    expect(within(kpi("Órdenes del periodo")).getByText("8")).toBeInTheDocument();
    expect(within(kpi("Finalizadas")).getByText("4")).toBeInTheDocument();
    expect(within(kpi("A tiempo")).getByText("66,7 %")).toBeInTheDocument();
    expect(
      within(kpi("A tiempo")).getByText("2 de 3 finalizadas con fecha"),
    ).toBeInTheDocument();
    expect(
      within(kpi("Con atraso")).getByText("Sin fecha programada: 1"),
    ).toBeInTheDocument();

    const estados = screen.getByRole("list", { name: "Órdenes por estado" });
    const finalizada = within(estados).getByText("Finalizada").closest("li");
    expect(finalizada).toHaveTextContent("4");

    const operarios = screen.getByRole("table", { name: "Órdenes por operario" });
    const filas = within(operarios).getAllByRole("row");
    expect(filas[1]).toHaveTextContent("Ana Operaria1023");
    expect(filas[2]).toHaveTextContent("Sin asignar0002");

    const atraso = screen.getByRole("table", { name: "Órdenes finalizadas con atraso" });
    expect(
      within(atraso).getByRole("link", { name: "OS-2026-000002" }),
    ).toHaveAttribute("href", "/ordenes/12");
    expect(within(atraso).getByText("NIT/CI 111")).toBeInTheDocument();
    expect(within(atraso).getByText("05/11/2026")).toBeInTheDocument();
    expect(within(atraso).getByText("08/11/2026")).toBeInTheDocument();

    expect(
      screen.getByRole("img", {
        name: "Gráfico de órdenes asignadas, en proceso y finalizadas por operario",
      }),
    ).toBeInTheDocument();
  });

  it("sin órdenes en el periodo muestra ceros y el mensaje vacío", () => {
    render(<ReporteOrdenesView data={VACIO} />);

    expect(within(kpi("Órdenes del periodo")).getByText("0")).toBeInTheDocument();
    expect(within(kpi("A tiempo")).getByText("—")).toBeInTheDocument();
    expect(
      screen.getByText("No hay órdenes de servicio en este periodo."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("con órdenes pero ninguna atrasada lo dice en la tabla de atrasos", () => {
    render(<ReporteOrdenesView data={{ ...DATA, atrasadas: [] }} />);

    expect(
      screen.getByText("Ninguna orden finalizada con atraso en el periodo."),
    ).toBeInTheDocument();
  });
});

describe("ReportesView con el reporte de órdenes", () => {
  it("muestra el periodo, las pestañas y el enlace al CSV", () => {
    render(
      <ReportesView query={QUERY} clientes={[]} operarios={[]}>
        <ReporteOrdenesView data={DATA} />
      </ReportesView>,
    );

    expect(
      screen.getByRole("link", { name: "Órdenes de servicio" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("01/11/2026")).toBeInTheDocument();
    expect(screen.getByText("30/11/2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Exportar CSV" })).toHaveAttribute(
      "href",
      "/api/v1/reportes/ordenes?desde=2026-11-01&hasta=2026-11-30&formato=csv",
    );
    const filtros = screen.getByRole("form", { name: "Filtros del reporte" });
    expect(within(filtros).getAllByLabelText("Cliente").length).toBeGreaterThan(0);
    expect(within(filtros).getAllByLabelText("Operario").length).toBeGreaterThan(0);
  });

  it("si el back falla muestra el error, sin datos ni CSV", () => {
    render(
      <ReportesView
        query={QUERY}
        clientes={[]}
        operarios={[]}
        error="No se pudo conectar con el servidor."
      >
        <ReporteOrdenesView data={DATA} />
      </ReportesView>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo conectar con el servidor.",
    );
    expect(screen.queryByLabelText("Indicadores de órdenes")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Exportar CSV" }),
    ).not.toBeInTheDocument();
  });
});
