import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrabajosHoySection } from "@/components/dashboard/trabajos-hoy-section";
import type { DashboardData, DashboardTrabajoHoy } from "@/lib/api/types";

const BASE: DashboardData = {
  clientes: 0,
  servicios: 0,
  proformas: 0,
  proformas_por_estado: {},
  monto_proformas_mes: 0,
};

function trabajo(n: number, extra: Partial<DashboardTrabajoHoy> = {}): DashboardTrabajoHoy {
  return {
    id: n,
    numero: `OS-2026-${String(n).padStart(6, "0")}`,
    cliente: { nombre_razon: `Cliente ${n}`, nit_ci: null },
    operario: null,
    estado: "PENDIENTE",
    ...extra,
  };
}

describe("TrabajosHoySection", () => {
  it("muestra código con enlace, cliente con NIT/CI, operario y estado", () => {
    render(
      <TrabajosHoySection
        data={{
          ...BASE,
          trabajos_hoy: [
            trabajo(2, {
              cliente: { nombre_razon: "Constructora Andina", nit_ci: "123456789" },
              operario: "Pedro Operario",
              estado: "EN_PROCESO",
            }),
            trabajo(3),
          ],
          trabajos_hoy_total: 2,
        }}
      />,
    );

    const lista = screen.getByRole("list", { name: "Trabajos programados para hoy" });
    const filas = within(lista).getAllByRole("listitem");

    expect(filas).toHaveLength(2);
    expect(
      within(filas[0]).getByRole("link", { name: "OS-2026-000002" }),
    ).toHaveAttribute("href", "/ordenes/2");
    expect(within(filas[0]).getByText("Constructora Andina")).toBeInTheDocument();
    expect(within(filas[0]).getByText("NIT/CI 123456789")).toBeInTheDocument();
    expect(within(filas[0]).getByText("Pedro Operario")).toBeInTheDocument();
    expect(within(filas[0]).getByText("En proceso")).toBeInTheDocument();

    expect(within(filas[1]).getByText("Sin asignar")).toBeInTheDocument();
    expect(within(filas[1]).getByText("Pendiente")).toBeInTheDocument();
    expect(within(filas[1]).queryByText(/NIT\/CI/)).not.toBeInTheDocument();

    expect(
      screen.queryByRole("link", { name: /Ver todas las órdenes/ }),
    ).not.toBeInTheDocument();
  });

  it("sin trabajos muestra el mensaje vacío", () => {
    render(
      <TrabajosHoySection
        data={{ ...BASE, trabajos_hoy: [], trabajos_hoy_total: 0 }}
      />,
    );

    expect(
      screen.getByText("No hay trabajos programados para hoy"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Ver todas las órdenes/ }),
    ).not.toBeInTheDocument();
  });

  it("si el back no envía el dato también muestra el mensaje vacío", () => {
    render(<TrabajosHoySection data={BASE} />);

    expect(
      screen.getByText("No hay trabajos programados para hoy"),
    ).toBeInTheDocument();
  });

  it("con más de 10 lista los 10 recibidos y enlaza a todas las órdenes", () => {
    render(
      <TrabajosHoySection
        data={{
          ...BASE,
          trabajos_hoy: Array.from({ length: 10 }, (_, index) => trabajo(index + 1)),
          trabajos_hoy_total: 12,
        }}
      />,
    );

    expect(
      within(
        screen.getByRole("list", { name: "Trabajos programados para hoy" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(10);
    expect(
      screen.getByText("12 órdenes pendientes, asignadas o en proceso."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ver todas las órdenes/ }),
    ).toHaveAttribute("href", "/ordenes");
  });
});
