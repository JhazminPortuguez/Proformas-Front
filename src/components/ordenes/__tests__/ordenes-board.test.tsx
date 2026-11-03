import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrdenesBoard } from "@/components/ordenes/ordenes-board";
import type { Orden } from "@/lib/api/types";
import type { OrdenesQuery } from "@/lib/ordenes";

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
    nit_ci: "123456789",
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
  acciones_disponibles: ["ver"],
};

const META = { current_page: 1, per_page: 15, total: 1, last_page: 1 };

const QUERY: OrdenesQuery = {
  search: "",
  estado: "",
  operarioId: "",
  clienteId: "",
  vista: "tablero",
  page: 1,
};

function renderBoard(ordenes: Orden[], query: OrdenesQuery = QUERY) {
  return render(
    <OrdenesBoard
      ordenes={ordenes}
      meta={{ ...META, total: ordenes.length }}
      query={query}
      operarios={[]}
      permisos={{ canAssign: true, canCancel: true, canClose: true }}
    />,
  );
}

describe("OrdenesBoard", () => {
  beforeEach(() => push.mockClear());

  it("las tarjetas muestran el NIT/CI y ya no muestran Ítems", () => {
    renderBoard([ORDEN]);

    const columna = screen.getByRole("region", { name: "Asignada" });

    expect(within(columna).getByText("Constructora Andina")).toBeInTheDocument();
    expect(within(columna).getByText("NIT/CI 123456789")).toBeInTheDocument();
    expect(within(columna).getByText("PRF-000012")).toBeInTheDocument();
    expect(within(columna).queryByText("Ítems")).not.toBeInTheDocument();
  });

  it("limpiar filtros del estado vacío conserva la pestaña y la vista", async () => {
    const user = userEvent.setup();
    renderBoard([], { ...QUERY, estado: "FINALIZADA", clienteId: 3 });

    expect(screen.getByText("Sin coincidencias")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(push).toHaveBeenCalledWith("/ordenes?estado=FINALIZADA&vista=tablero");
  });

  it("una pestaña vacía sin filtros no ofrece limpiar filtros", () => {
    renderBoard([], { ...QUERY, estado: "CANCELADA" });

    expect(screen.getByText("Sin órdenes en este estado")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Limpiar filtros" }),
    ).not.toBeInTheDocument();
  });
});
