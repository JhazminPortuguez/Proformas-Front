import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OrdenesTable } from "@/components/ordenes/ordenes-table";
import type { Orden } from "@/lib/api/types";

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

const ORDEN: Orden = {
  id: 9,
  empresa_id: 1,
  numero: "ORD-000009",
  proforma_id: 12,
  cliente_id: 3,
  operario_id: 2,
  estado: "ASIGNADA",
  fecha_programada: "2026-11-01",
  fecha_inicio: null,
  fecha_fin: null,
  observaciones: null,
  motivo_cancelacion: null,
  cancelada_at: null,
  cerrada_at: null,
  cerrada_por: null,
  created_by: 1,
  updated_by: 1,
  items_count: 2,
  cliente: {
    id: 3,
    nombre_razon: "Constructora Andina",
    nit_ci: null,
    telefono: null,
    email: null,
    direccion: null,
    estado: "activo",
  },
  proforma: {
    id: 12,
    numero: "PRF-000012",
    estado: "ACEPTADA",
    moneda: "BOB",
    total: 565,
  },
  operario: {
    id: 2,
    name: "Pedro Operario",
    email: "pedro@example.com",
    rol: "operario",
    activo: true,
    cliente_id: null,
    empresa_id: 1,
  },
  acciones_disponibles: ["ver", "iniciar", "cancelar"],
};

const META = {
  current_page: 1,
  per_page: 15,
  total: 1,
  last_page: 1,
};

function renderTable() {
  return render(
    <OrdenesTable
      ordenes={[ORDEN]}
      meta={META}
      query={{
        search: "",
        estado: "",
        operarioId: "",
        clienteId: "",
        vista: "tabla",
        page: 1,
      }}
      operarios={[]}
      permisos={{ canAssign: true, canCancel: true, canClose: true }}
    />,
  );
}

describe("OrdenesTable", () => {
  it("muestra número, cliente, proforma, operario y estado", () => {
    renderTable();

    const table = screen.getByRole("grid", { name: "Órdenes de servicio" });

    expect(
      within(table).getByRole("link", { name: "ORD-000009" }),
    ).toBeInTheDocument();
    expect(within(table).getByText("Constructora Andina")).toBeInTheDocument();
    expect(
      within(table).getByRole("link", { name: "PRF-000012" }),
    ).toBeInTheDocument();
    expect(within(table).getByText("Pedro Operario")).toBeInTheDocument();
    expect(within(table).getByText("Asignada")).toBeInTheDocument();
    expect(within(table).getByText(/Programada:/)).toBeInTheDocument();
  });

  it("pide confirmación antes de iniciar la orden", async () => {
    const user = userEvent.setup();
    renderTable();

    const table = screen.getByRole("grid", { name: "Órdenes de servicio" });

    await user.click(
      within(table).getByRole("button", { name: "Iniciar ORD-000009" }),
    );

    expect(
      screen.getByRole("alertdialog", { name: "Iniciar orden" }),
    ).toBeInTheDocument();
  });

  it("exige motivo al cancelar", async () => {
    const user = userEvent.setup();
    renderTable();

    const table = screen.getByRole("grid", { name: "Órdenes de servicio" });

    await user.click(
      within(table).getByRole("button", { name: "Cancelar ORD-000009" }),
    );

    expect(
      screen.getByRole("alertdialog", { name: "Cancelar orden" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo de la cancelación/)).toBeInTheDocument();
  });

  it("abre el selector de operario al asignar", async () => {
    const user = userEvent.setup();

    render(
      <OrdenesTable
        ordenes={[{ ...ORDEN, acciones_disponibles: ["ver", "asignar"] }]}
        meta={META}
        query={{
          search: "",
          estado: "",
          operarioId: "",
          clienteId: "",
          vista: "tabla",
          page: 1,
        }}
        operarios={ORDEN.operario ? [ORDEN.operario] : []}
        permisos={{ canAssign: true, canCancel: true, canClose: true }}
      />,
    );

    const table = screen.getByRole("grid", { name: "Órdenes de servicio" });

    await user.click(
      within(table).getByRole("button", { name: "Asignar ORD-000009" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Asignar operario" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Operario")).toBeInTheDocument();
  });
});
