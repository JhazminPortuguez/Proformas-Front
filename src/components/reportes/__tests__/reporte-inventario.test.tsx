import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReporteInventarioView } from "@/components/reportes/reporte-inventario";
import { ReportesView } from "@/components/reportes/reportes-view";
import type { ReporteInventario } from "@/lib/api/types";
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
  tab: "inventario",
  desde: "2026-11-01",
  hasta: "2026-11-30",
  clienteId: "",
  operarioId: 7,
};

const DATA: ReporteInventario = {
  periodo: { desde: "2026-11-01", hasta: "2026-11-30" },
  consumo: { costo_total: 225.55, movimientos: 5, productos: 3 },
  productos: [
    { producto_id: 3, nombre: "Gas", unidad_medida: "kg", cantidad: 1.083, costo: 129.96 },
    { producto_id: 1, nombre: "Cable", unidad_medida: "metro", cantidad: 14.5, costo: 49.6 },
    { producto_id: 2, nombre: "Filtro", unidad_medida: "unidad", cantidad: 1, costo: 45.99 },
  ],
  stock_bajo: [
    { id: 2, nombre: "Filtro", unidad_medida: "unidad", stock_actual: 2, stock_minimo: 5, faltante: 3 },
  ],
};

const VACIO: ReporteInventario = {
  periodo: { desde: "2026-11-01", hasta: "2026-11-30" },
  consumo: { costo_total: 0, movimientos: 0, productos: 0 },
  productos: [],
  stock_bajo: [],
};

function kpi(label: string): HTMLElement {
  const indicadores = screen.getByLabelText("Indicadores de inventario");

  return within(indicadores).getByText(label).parentElement as HTMLElement;
}

describe("ReporteInventarioView", () => {
  it("muestra el costo del consumo, la tabla por producto y el stock bajo", () => {
    render(<ReporteInventarioView data={DATA} />);

    expect(within(kpi("Costo del consumo")).getByText(dinero(225.55))).toBeInTheDocument();
    expect(within(kpi("Productos consumidos")).getByText("3")).toBeInTheDocument();
    expect(within(kpi("Movimientos de consumo")).getByText("5")).toBeInTheDocument();
    expect(within(kpi("Con stock bajo")).getByText("1")).toBeInTheDocument();

    const consumo = screen.getByRole("table", { name: "Consumo de materiales" });
    const filas = within(consumo).getAllByRole("row");

    expect(filas[1]).toHaveTextContent("Gaskg1,083");
    expect(filas[1]).toHaveTextContent(dinero(129.96));
    expect(filas[2]).toHaveTextContent("Cablemetro14,5");
    // Fila de total con el monto calculado por el back.
    expect(filas[4]).toHaveTextContent("Total");
    expect(filas[4]).toHaveTextContent(dinero(225.55));

    const stock = screen.getByRole("table", { name: "Productos con stock bajo" });
    expect(within(stock).getAllByRole("row")[1]).toHaveTextContent(
      "Filtro2 unidad5 unidad3 unidad",
    );

    expect(
      screen.getByRole("img", {
        name: "Gráfico del costo de los 3 materiales con más costo consumido",
      }),
    ).toBeInTheDocument();
  });

  it("sin consumo ni stock bajo muestra los mensajes vacíos", () => {
    render(<ReporteInventarioView data={VACIO} />);

    expect(within(kpi("Costo del consumo")).getByText(dinero(0))).toBeInTheDocument();
    expect(
      screen.getByText("No se consumieron materiales en este periodo."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ningún producto está por debajo de su stock mínimo."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("ReportesView con el reporte de inventario", () => {
  it("filtra por cliente y operario y exporta el CSV del inventario", () => {
    render(
      <ReportesView query={QUERY} clientes={[]} operarios={[]}>
        <ReporteInventarioView data={DATA} />
      </ReportesView>,
    );

    expect(screen.getByRole("link", { name: "Exportar CSV" })).toHaveAttribute(
      "href",
      "/api/v1/reportes/inventario?desde=2026-11-01&hasta=2026-11-30&operario_id=7&formato=csv",
    );
    expect(screen.getByRole("link", { name: "Inventario" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("si el back falla muestra el error en lugar del reporte", () => {
    render(
      <ReportesView query={QUERY} clientes={[]} operarios={[]} error="Sin conexión.">
        <ReporteInventarioView data={DATA} />
      </ReportesView>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Sin conexión.");
    expect(screen.queryByLabelText("Indicadores de inventario")).not.toBeInTheDocument();
  });
});
