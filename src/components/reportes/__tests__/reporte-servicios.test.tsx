import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReporteServiciosView } from "@/components/reportes/reporte-servicios";
import { ReportesView } from "@/components/reportes/reportes-view";
import type { ReporteServiciosProformas } from "@/lib/api/types";
import type { ReportesQuery } from "@/lib/reportes";
import { formatMoney } from "@/lib/utils";

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

/** Testing Library normaliza el espacio duro de "Bs 430,35" en el DOM, no en lo esperado. */
function dinero(value: number): string {
  return formatMoney(value).replace(/\s/g, " ");
}

const QUERY: ReportesQuery = {
  tab: "servicios",
  desde: "2026-11-01",
  hasta: "2026-11-30",
  clienteId: 3,
  operarioId: 7,
};

const DATA: ReporteServiciosProformas = {
  periodo: { desde: "2026-11-01", hasta: "2026-11-30" },
  proformas: {
    cotizado: 430.35,
    cotizadas: 3,
    aceptado: 550.55,
    aceptadas: 2,
    rechazadas: 1,
    en_espera: 1,
    tasa_aceptacion: 66.7,
  },
  servicios: [
    { servicio_id: 1, nombre: "Mantenimiento de aire", categoria: "Mantenimiento", cantidad: 3, monto: 450.15 },
    { servicio_id: 2, nombre: "Instalación", categoria: null, cantidad: 2, monto: 350.04 },
  ],
};

const VACIO: ReporteServiciosProformas = {
  periodo: { desde: "2026-11-01", hasta: "2026-11-30" },
  proformas: {
    cotizado: 0,
    cotizadas: 0,
    aceptado: 0,
    aceptadas: 0,
    rechazadas: 0,
    en_espera: 0,
    tasa_aceptacion: null,
  },
  servicios: [],
};

function kpi(label: string): HTMLElement {
  const indicadores = screen.getByLabelText("Indicadores de proformas");

  return within(indicadores).getByText(label).parentElement as HTMLElement;
}

describe("ReporteServiciosView", () => {
  it("muestra montos, tasa de aceptación y el ranking de servicios", () => {
    render(<ReporteServiciosView data={DATA} />);

    expect(within(kpi("Monto cotizado")).getByText(dinero(430.35))).toBeInTheDocument();
    expect(
      within(kpi("Monto cotizado")).getByText("3 proformas enviadas en el periodo"),
    ).toBeInTheDocument();
    expect(within(kpi("Monto aceptado")).getByText(dinero(550.55))).toBeInTheDocument();
    expect(within(kpi("Tasa de aceptación")).getByText("66,7 %")).toBeInTheDocument();
    expect(
      within(kpi("Tasa de aceptación")).getByText("2 aceptadas y 1 rechazada"),
    ).toBeInTheDocument();
    expect(within(kpi("En espera")).getByText("1")).toBeInTheDocument();

    const tabla = screen.getByRole("table", { name: "Servicios más solicitados" });
    const filas = within(tabla).getAllByRole("row");

    expect(filas[1]).toHaveTextContent("Mantenimiento de aire");
    expect(filas[1]).toHaveTextContent(dinero(450.15));
    expect(filas[2]).toHaveTextContent("Instalación—2");
    expect(filas[2]).toHaveTextContent(dinero(350.04));
    expect(
      screen.getByRole("img", {
        name: "Gráfico de los 2 servicios más solicitados por cantidad",
      }),
    ).toBeInTheDocument();
  });

  it("sin datos en el periodo muestra ceros y el mensaje vacío", () => {
    render(<ReporteServiciosView data={VACIO} />);

    expect(within(kpi("Monto cotizado")).getByText(dinero(0))).toBeInTheDocument();
    expect(within(kpi("Tasa de aceptación")).getByText("—")).toBeInTheDocument();
    expect(
      screen.getByText("No hay servicios en órdenes de este periodo."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("ReportesView con el reporte de servicios", () => {
  it("filtra solo por cliente y el CSV no envía el operario", () => {
    render(
      <ReportesView query={QUERY} clientes={[]} operarios={[]}>
        <ReporteServiciosView data={DATA} />
      </ReportesView>,
    );

    const filtros = screen.getByRole("form", { name: "Filtros del reporte" });

    expect(within(filtros).getAllByLabelText("Cliente").length).toBeGreaterThan(0);
    expect(within(filtros).queryAllByLabelText("Operario")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Exportar CSV" })).toHaveAttribute(
      "href",
      "/api/v1/reportes/servicios?desde=2026-11-01&hasta=2026-11-30&cliente_id=3&formato=csv",
    );
    expect(
      screen.getByRole("link", { name: "Servicios y proformas" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("si el back falla muestra el error en lugar del reporte", () => {
    render(
      <ReportesView query={QUERY} clientes={[]} operarios={[]} error="Error del servidor.">
        <ReporteServiciosView data={DATA} />
      </ReportesView>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Error del servidor.");
    expect(screen.queryByLabelText("Indicadores de proformas")).not.toBeInTheDocument();
  });
});
