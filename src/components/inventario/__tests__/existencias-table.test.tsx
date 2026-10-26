import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExistenciasTable } from "@/components/inventario/existencias-table";
import { MovimientosTable } from "@/components/inventario/movimientos-table";
import type {
  MovimientoInventario,
  PaginationMeta,
  Producto,
} from "@/lib/api/types";

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

const META: PaginationMeta = {
  current_page: 1,
  per_page: 15,
  total: 2,
  last_page: 1,
};

const CABLE: Producto = {
  id: 5,
  nombre: "Cable 12 AWG",
  descripcion: "Cable de cobre",
  precio_unitario: 12.5,
  unidad_medida: "metro",
  activo: true,
  stock_actual: 2,
  stock_minimo: 5,
  costo_promedio: 8,
  stock_bajo: true,
  valor_stock: 16,
  movimientos_count: 4,
};

const FOCO: Producto = {
  id: 6,
  nombre: "Foco LED",
  descripcion: null,
  precio_unitario: 20,
  unidad_medida: "unidad",
  activo: true,
  stock_actual: 20,
  stock_minimo: 5,
  costo_promedio: 12,
  stock_bajo: false,
  valor_stock: 240,
  movimientos_count: 0,
};

const QUERY_EXISTENCIAS = {
  search: "",
  bajoStock: false,
  activo: "" as const,
  page: 1,
};

const QUERY_MOVIMIENTOS = {
  search: "",
  tipo: "" as const,
  productoId: "" as const,
  desde: "",
  hasta: "",
  page: 1,
};

const MOVIMIENTO: MovimientoInventario = {
  id: 44,
  producto_id: 5,
  orden_id: 9,
  orden_item_id: 3,
  tipo: "CONSUMO",
  cantidad: -2,
  costo_unitario: 8,
  stock_anterior: 10,
  stock_nuevo: 8,
  motivo: "Consumo de la orden",
  created_at: "2026-10-25T14:30:00Z",
  producto: CABLE,
  orden: { id: 9, numero: "ORD-000009" },
  usuario: {
    id: 2,
    name: "Pedro Operario",
    email: "pedro@example.com",
    rol: "operario",
    activo: true,
    cliente_id: null,
    empresa_id: 1,
  },
};

describe("ExistenciasTable", () => {
  it("muestra producto, stock, estado, valor y acciones admin", async () => {
    const user = userEvent.setup();
    const onEntrada = vi.fn();
    const onAjuste = vi.fn();

    render(
      <ExistenciasTable
        productos={[CABLE, FOCO]}
        meta={META}
        query={QUERY_EXISTENCIAS}
        canAdjust
        onEntrada={onEntrada}
        onAjuste={onAjuste}
      />,
    );

    const table = screen.getByRole("grid", { name: "Existencias de inventario" });

    expect(within(table).getByText("Cable 12 AWG")).toBeInTheDocument();
    expect(within(table).getByText("Stock bajo")).toBeInTheDocument();
    expect(within(table).getByText("Normal")).toBeInTheDocument();
    expect(within(table).getByText(/16,00/)).toBeInTheDocument();

    await user.click(
      within(table).getByRole("button", {
        name: "Registrar entrada de Cable 12 AWG",
      }),
    );
    expect(onEntrada).toHaveBeenCalledWith(CABLE);

    await user.click(
      within(table).getByRole("button", {
        name: "Ajustar stock de Foco LED",
      }),
    );
    expect(onAjuste).toHaveBeenCalledWith(FOCO);
  });

  it("oculta acciones cuando el usuario no puede ajustar", () => {
    render(
      <ExistenciasTable
        productos={[CABLE]}
        meta={META}
        query={QUERY_EXISTENCIAS}
        canAdjust={false}
        onEntrada={vi.fn()}
        onAjuste={vi.fn()}
      />,
    );

    const table = screen.getByRole("grid", { name: "Existencias de inventario" });

    expect(
      within(table).queryByRole("button", {
        name: "Registrar entrada de Cable 12 AWG",
      }),
    ).not.toBeInTheDocument();
  });

  it("muestra un estado vacío con acción para limpiar filtros", () => {
    render(
      <ExistenciasTable
        productos={[]}
        meta={{ ...META, total: 0 }}
        query={{ ...QUERY_EXISTENCIAS, bajoStock: true }}
        canAdjust
        onEntrada={vi.fn()}
        onAjuste={vi.fn()}
      />,
    );

    expect(
      screen.getAllByText("Sin productos para estos filtros").length,
    ).toBeGreaterThan(0);
  });
});

describe("MovimientosTable", () => {
  it("muestra tipo, cantidad con signo y enlace a la orden", () => {
    render(
      <MovimientosTable
        movimientos={[MOVIMIENTO]}
        meta={{ ...META, total: 1 }}
        query={QUERY_MOVIMIENTOS}
      />,
    );

    const table = screen.getByRole("grid", {
      name: "Movimientos de inventario",
    });

    expect(within(table).getByText("Consumo")).toBeInTheDocument();
    expect(within(table).getByText("−2")).toBeInTheDocument();
    expect(
      within(table).getByRole("link", { name: "ORD-000009" }),
    ).toHaveAttribute("href", "/ordenes/9");
    expect(within(table).getByText(/10 → 8/)).toBeInTheDocument();
  });

  it("muestra el estado vacío según los filtros", () => {
    render(
      <MovimientosTable
        movimientos={[]}
        meta={{ ...META, total: 0 }}
        query={{ ...QUERY_MOVIMIENTOS, tipo: "CONSUMO" }}
      />,
    );

    expect(
      screen.getAllByText("Sin movimientos para estos filtros").length,
    ).toBeGreaterThan(0);
  });
});
