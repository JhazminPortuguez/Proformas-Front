import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SolicitudesTable } from "@/components/proformas/solicitudes-table";
import type { Cliente, Solicitud } from "@/lib/api/types";

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

const CLIENTE: Cliente = {
  id: 3,
  nombre_razon: "Constructora Andina",
  nit_ci: "123456789",
  telefono: null,
  email: null,
  direccion: null,
  estado: "activo",
};

const PENDIENTE: Solicitud = {
  id: 4,
  cliente_id: 3,
  descripcion: "Mantenimiento de 5 equipos",
  estado: "PENDIENTE",
  created_at: "2026-10-25T10:00:00.000Z",
  convertida_proforma_id: null,
  cliente: CLIENTE,
};

const ATENDIDA: Solicitud = {
  ...PENDIENTE,
  id: 5,
  estado: "ATENDIDA",
  convertida_proforma_id: 12,
};

const META = {
  current_page: 1,
  per_page: 15,
  total: 1,
  last_page: 1,
};

function renderTable(solicitud: Solicitud) {
  return render(
    <SolicitudesTable
      solicitudes={[solicitud]}
      meta={META}
      clientes={[CLIENTE]}
      search=""
      canManage
    />,
  );
}

describe("SolicitudesTable", () => {
  it("ofrece convertir una solicitud pendiente", () => {
    renderTable(PENDIENTE);

    expect(
      screen.getAllByRole("button", { name: "Convertir solicitud #4" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
  });

  it("una solicitud atendida enlaza su proforma y ya no se puede convertir", () => {
    renderTable(ATENDIDA);

    expect(
      screen.queryByRole("button", { name: "Convertir solicitud #5" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", {
        name: "Ver proforma de la solicitud #5",
      })[0],
    ).toHaveAttribute("href", "/proformas/12");
    expect(screen.getAllByText("Atendida").length).toBeGreaterThan(0);
  });
});
