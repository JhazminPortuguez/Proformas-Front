import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientesTable } from "@/components/clientes/clientes-table";
import type { Cliente } from "@/lib/api/types";

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

vi.mock("@/lib/api/client", () => ({
  clientes: {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const CLIENTE: Cliente = {
  id: 3,
  nombre_razon: "Constructora Andina",
  nit_ci: "123456789",
  telefono: "77712345",
  email: "contacto@andina.example",
  direccion: "Av. Blanco Galindo km 5",
  estado: "activo",
  proformas_count: 3,
  ordenes_count: 2,
};

const META = {
  current_page: 1,
  per_page: 10,
  total: 1,
  last_page: 1,
};

function renderTable(cliente: Cliente = CLIENTE) {
  render(
    <ClientesTable
      clientes={[cliente]}
      meta={META}
      query={{ search: "", estado: "", page: 1 }}
      canDelete
    />,
  );
}

describe("ClientesTable", () => {
  it("enlaza el nombre y el historial a la ficha del cliente", () => {
    renderTable();

    const table = screen.getByRole("grid", { name: "Clientes" });
    const nombre = within(table).getByRole("link", {
      name: "Constructora Andina",
    });

    expect(nombre).toHaveAttribute("href", "/clientes/3");
    expect(
      within(table).getByRole("link", {
        name: "Ver historial de Constructora Andina",
      }),
    ).toHaveAttribute("href", "/clientes/3");
    expect(
      within(table).getByRole("button", { name: "Editar Constructora Andina" }),
    ).toBeInTheDocument();
  });

  it("muestra el conteo de órdenes cuando el backend lo envía", () => {
    renderTable();

    const table = screen.getByRole("grid", { name: "Clientes" });

    expect(
      within(table).getByRole("columnheader", { name: "Órdenes" }),
    ).toBeInTheDocument();
    expect(within(table).getByText("2")).toBeInTheDocument();
  });

  it("omite la columna de órdenes si el dato no existe", () => {
    renderTable({ ...CLIENTE, ordenes_count: undefined });

    const table = screen.getByRole("grid", { name: "Clientes" });

    expect(
      within(table).queryByRole("columnheader", { name: "Órdenes" }),
    ).not.toBeInTheDocument();
  });
});
