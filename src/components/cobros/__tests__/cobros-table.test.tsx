import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CobrosTable } from "@/components/cobros/cobros-table";
import type { CuentaPorCobrar } from "@/lib/api/types";
import { COBROS_QUERY_VACIA } from "@/lib/cobros";
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

const CUENTA: CuentaPorCobrar = {
  id: 7,
  numero: "CXC-000007",
  orden_id: 9,
  cliente_id: 3,
  fecha_emision: "2026-09-01",
  fecha_vencimiento: "2026-10-31",
  moneda: "BOB",
  monto_total: 1000,
  saldo: 400,
  estado_cobro: "PARCIAL",
  vencida: true,
  dias_vencida: 12,
  total_pagado: 600,
  pagos_count: 2,
  acciones_disponibles: ["ver", "pagar"],
  cliente: {
    id: 3,
    nombre_razon: "Constructora Andina",
    nit_ci: null,
    telefono: null,
    email: null,
    direccion: null,
    estado: "activo",
  },
  orden: { id: 9, numero: "ORD-000009", estado: "FINALIZADA" },
};

const META = {
  current_page: 1,
  per_page: 15,
  total: 1,
  last_page: 1,
};

/** `formatMoney` usa NBSP; los matchers de texto comparan contra el texto normalizado. */
function moneyText(value: number): string {
  return formatMoney(value).replace(/\s+/g, " ");
}

function renderTable({
  canPay = true,
  onPagar = vi.fn(),
}: {
  canPay?: boolean;
  onPagar?: (cuenta: CuentaPorCobrar) => void;
} = {}) {
  render(
    <CobrosTable
      cuentas={[CUENTA]}
      meta={META}
      query={{ ...COBROS_QUERY_VACIA }}
      canPay={canPay}
      onPagar={onPagar}
    />,
  );

  return { onPagar };
}

describe("CobrosTable", () => {
  it("muestra número, cliente, orden, montos, estado y mora", () => {
    renderTable();

    const table = screen.getByRole("grid", { name: "Cuentas por cobrar" });

    expect(
      within(table).getByRole("link", { name: "CXC-000007" }),
    ).toBeInTheDocument();
    expect(within(table).getByText("Constructora Andina")).toBeInTheDocument();
    expect(
      within(table).getByRole("link", { name: "ORD-000009" }),
    ).toBeInTheDocument();
    expect(within(table).getByText(moneyText(1000))).toBeInTheDocument();
    expect(within(table).getByText(moneyText(600))).toBeInTheDocument();
    expect(within(table).getByText(moneyText(400))).toBeInTheDocument();
    expect(within(table).getByText("Parcial")).toBeInTheDocument();
    expect(within(table).getByText("Vencida 12 d")).toBeInTheDocument();
  });

  it("pide registrar el pago de la fila", async () => {
    const user = userEvent.setup();
    const { onPagar } = renderTable();

    const table = screen.getByRole("grid", { name: "Cuentas por cobrar" });

    await user.click(
      within(table).getByRole("button", {
        name: "Registrar pago CXC-000007",
      }),
    );

    expect(onPagar).toHaveBeenCalledWith(CUENTA);
  });

  it("oculta registrar pago sin permiso y mantiene el acceso al detalle", () => {
    renderTable({ canPay: false });

    const table = screen.getByRole("grid", { name: "Cuentas por cobrar" });

    expect(
      within(table).getByRole("link", { name: "Ver cobro CXC-000007" }),
    ).toBeInTheDocument();
    expect(
      within(table).queryByRole("button", {
        name: "Registrar pago CXC-000007",
      }),
    ).not.toBeInTheDocument();
  });

  it("ofrece limpiar filtros cuando la búsqueda no devuelve cuentas", () => {
    render(
      <CobrosTable
        cuentas={[]}
        meta={{ ...META, total: 0, last_page: 1 }}
        query={{ ...COBROS_QUERY_VACIA, search: "inexistente" }}
        canPay
        onPagar={vi.fn()}
      />,
    );

    expect(
      screen.getAllByText("Sin cuentas para estos filtros")[0],
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Limpiar filtros" })[0],
    ).toBeInTheDocument();
  });
});
