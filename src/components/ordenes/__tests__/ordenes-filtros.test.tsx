import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrdenesFiltros } from "@/components/ordenes/ordenes-filtros";
import { ordenesPestanas, type OrdenesQuery } from "@/lib/ordenes";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const QUERY: OrdenesQuery = {
  search: "",
  estado: "EN_PROCESO",
  operarioId: "",
  clienteId: 3,
  vista: "tablero",
  page: 2,
};

describe("ordenesPestanas", () => {
  it("ofrece las seis pestañas de estado en orden", () => {
    expect(ordenesPestanas(QUERY).map((tab) => tab.label)).toEqual([
      "Todas",
      "Pendientes",
      "Asignadas",
      "En proceso",
      "Finalizadas",
      "Canceladas",
    ]);
  });

  it("cambia solo el estado, conserva vista y filtros y vuelve a la página 1", () => {
    const tabs = ordenesPestanas(QUERY);
    const todas = tabs.find((tab) => tab.key === "todas");
    const canceladas = tabs.find((tab) => tab.key === "CANCELADA");

    expect(todas?.href).toBe("/ordenes?cliente_id=3&vista=tablero");
    expect(canceladas?.href).toBe(
      "/ordenes?estado=CANCELADA&cliente_id=3&vista=tablero",
    );
  });
});

describe("OrdenesFiltros", () => {
  beforeEach(() => push.mockClear());

  it("ya no tiene selector de estado: lo reemplazan las pestañas", () => {
    render(
      <OrdenesFiltros
        query={QUERY}
        clientes={[]}
        operarios={[]}
        mostrarOperario={false}
      />,
    );

    expect(screen.queryByLabelText("Estado")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Cliente")).toBeInTheDocument();
  });

  it("limpiar filtros conserva la pestaña de estado", async () => {
    const user = userEvent.setup();

    render(
      <OrdenesFiltros
        query={QUERY}
        clientes={[]}
        operarios={[]}
        mostrarOperario={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(push).toHaveBeenCalledWith("/ordenes?estado=EN_PROCESO&vista=tablero");
  });

  it("buscar conserva la pestaña de estado", async () => {
    const user = userEvent.setup();

    render(
      <OrdenesFiltros
        query={{ ...QUERY, clienteId: "" }}
        clientes={[]}
        operarios={[]}
        mostrarOperario={false}
      />,
    );

    await user.type(screen.getByLabelText("Buscar"), "ORD-9");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(push).toHaveBeenCalledWith(
      "/ordenes?search=ORD-9&estado=EN_PROCESO&vista=tablero",
    );
  });
});
