import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReporteCobrosView } from "@/components/reportes/reporte-cobros";
import { ReportesView } from "@/components/reportes/reportes-view";
import type { ReporteCobros } from "@/lib/api/types";
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
  tab: "cobros",
  desde: "2026-11-01",
  hasta: "2026-11-30",
  clienteId: 3,
  operarioId: 7,
};

const DATA: ReporteCobros = {
  periodo: { desde: "2026-11-01", hasta: "2026-11-30" },
  cobrado: 30.16,
  pagos: 3,
  saldo_pendiente: 2802.8,
  cuentas_con_saldo: 7,
  vencidas: 5,
  monto_vencido: 2502.5,
  aging: { al_dia: 300.3, d1_30: 700.7, d31_60: 500.5, d61_90: 600.6, d90_plus: 700.7 },
  cuentas: [
    {
      id: 7,
      numero: "CXC-2026-000007",
      cliente: { nombre_razon: "Hotel Illimani", nit_ci: "222" },
      fecha_vencimiento: "2026-08-16",
      dias_vencida: 91,
      saldo: 700.7,
      franja: "d90_plus",
    },
    {
      id: 2,
      numero: "CXC-2026-000002",
      cliente: { nombre_razon: "Constructora Andina", nit_ci: null },
      fecha_vencimiento: "2026-11-15",
      dias_vencida: 0,
      saldo: 200.2,
      franja: "al_dia",
    },
  ],
};

const VACIO: ReporteCobros = {
  periodo: { desde: "2026-11-01", hasta: "2026-11-30" },
  cobrado: 0,
  pagos: 0,
  saldo_pendiente: 0,
  cuentas_con_saldo: 0,
  vencidas: 0,
  monto_vencido: 0,
  aging: { al_dia: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 },
  cuentas: [],
};

function kpi(label: string): HTMLElement {
  const indicadores = screen.getByLabelText("Indicadores de cuentas por cobrar");

  return within(indicadores).getByText(label).parentElement as HTMLElement;
}

describe("ReporteCobrosView", () => {
  it("muestra lo cobrado, el saldo, las franjas y las cuentas", () => {
    render(<ReporteCobrosView data={DATA} />);

    expect(within(kpi("Cobrado en el periodo")).getByText(dinero(30.16))).toBeInTheDocument();
    expect(within(kpi("Cobrado en el periodo")).getByText("3 pagos registrados")).toBeInTheDocument();
    expect(within(kpi("Saldo pendiente")).getByText(dinero(2802.8))).toBeInTheDocument();
    expect(within(kpi("Saldo pendiente")).getByText("7 cuentas con saldo, a hoy")).toBeInTheDocument();
    expect(within(kpi("Vencido")).getByText(dinero(2502.5))).toBeInTheDocument();
    expect(within(kpi("Al día")).getByText(dinero(300.3))).toBeInTheDocument();

    const franjas = screen.getByLabelText("Saldo por antigüedad");
    expect(within(franjas).getByText("Más de 90 días").nextElementSibling).toHaveTextContent(dinero(700.7));
    expect(within(franjas).getByText("31 a 60 días").nextElementSibling).toHaveTextContent(dinero(500.5));

    const tabla = screen.getByRole("table", { name: "Cuentas con saldo pendiente" });
    const filas = within(tabla).getAllByRole("row");

    expect(
      within(filas[1]).getByRole("link", { name: "CXC-2026-000007" }),
    ).toHaveAttribute("href", "/cobros/7");
    expect(filas[1]).toHaveTextContent("NIT/CI 222");
    expect(filas[1]).toHaveTextContent("16/08/2026");
    expect(filas[1]).toHaveTextContent("91");
    expect(within(filas[1]).getByText("Más de 90 días")).toBeInTheDocument();
    expect(within(filas[2]).getByText("Al día")).toBeInTheDocument();
    // Total calculado por el back.
    expect(filas[3]).toHaveTextContent(`Total${dinero(2802.8)}`);

    expect(
      screen.getByRole("img", { name: /Gráfico del saldo pendiente por antigüedad/ }),
    ).toBeInTheDocument();
  });

  it("sin cobros ni saldos muestra ceros y el mensaje vacío", () => {
    render(<ReporteCobrosView data={VACIO} />);

    expect(within(kpi("Cobrado en el periodo")).getByText(dinero(0))).toBeInTheDocument();
    expect(within(kpi("Cobrado en el periodo")).getByText("0 pagos registrados")).toBeInTheDocument();
    expect(screen.getByText("No hay cuentas con saldo pendiente.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("ReportesView con el reporte de cuentas por cobrar", () => {
  it("filtra solo por cliente y exporta el CSV de cobros", () => {
    render(
      <ReportesView query={QUERY} clientes={[]} operarios={[]}>
        <ReporteCobrosView data={DATA} />
      </ReportesView>,
    );

    const filtros = screen.getByRole("form", { name: "Filtros del reporte" });

    expect(within(filtros).queryAllByLabelText("Operario")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Exportar CSV" })).toHaveAttribute(
      "href",
      "/api/v1/reportes/cobros?desde=2026-11-01&hasta=2026-11-30&cliente_id=3&formato=csv",
    );
    expect(
      screen.getByRole("link", { name: "Cuentas por cobrar" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("si el back falla muestra el error en lugar del reporte", () => {
    render(
      <ReportesView query={QUERY} clientes={[]} operarios={[]} error="El servidor no respondió.">
        <ReporteCobrosView data={DATA} />
      </ReportesView>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("El servidor no respondió.");
    expect(
      screen.queryByLabelText("Indicadores de cuentas por cobrar"),
    ).not.toBeInTheDocument();
  });
});
