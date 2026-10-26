import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConsumirMaterialesDialog,
  erroresConsumo,
} from "@/components/ordenes/consumir-materiales-dialog";
import type { OrdenItem, Producto } from "@/lib/api/types";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  consumir: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
    refresh: mocks.refresh,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api/client", () => ({
  ordenes: {
    consumir: mocks.consumir,
  },
}));

const CABLE: Producto = {
  id: 5,
  nombre: "Cable 12 AWG",
  descripcion: null,
  precio_unitario: 12.5,
  unidad_medida: "metro",
  activo: true,
  stock_actual: 10,
  stock_minimo: 5,
  costo_promedio: 8,
};

const FOCO: Producto = {
  id: 6,
  nombre: "Foco LED",
  descripcion: null,
  precio_unitario: 20,
  unidad_medida: "unidad",
  activo: true,
  stock_actual: 4,
  stock_minimo: 2,
  costo_promedio: 12,
};

const CABLE_ITEM: OrdenItem = {
  id: 1,
  orden_id: 9,
  tipo: "MATERIAL",
  servicio_id: null,
  producto_id: 5,
  descripcion: null,
  unidad_medida: "metro",
  cantidad: 5,
  precio_unitario: 12.5,
  total_linea: 62.5,
  cantidad_consumida: 2,
  cantidad_pendiente: 3,
  consumido: false,
  producto: CABLE,
};

const FOCO_ITEM: OrdenItem = {
  id: 2,
  orden_id: 9,
  tipo: "MATERIAL",
  servicio_id: null,
  producto_id: 6,
  descripcion: null,
  unidad_medida: "unidad",
  cantidad: 2,
  precio_unitario: 20,
  total_linea: 40,
  cantidad_consumida: 2,
  cantidad_pendiente: 0,
  consumido: true,
  producto: FOCO,
};

describe("ConsumirMaterialesDialog", () => {
  beforeEach(() => {
    mocks.consumir.mockReset();
    mocks.refresh.mockReset();
  });

  it("solo lista materiales con pendiente y precarga la cantidad", async () => {
    const user = userEvent.setup();

    render(
      <ConsumirMaterialesDialog ordenId={9} numero="ORD-000009" items={[CABLE_ITEM, FOCO_ITEM]} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Consumir materiales" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Consumir materiales" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Cantidad de Cable 12 AWG")).toHaveValue("3");
    expect(
      screen.queryByLabelText("Cantidad de Foco LED"),
    ).not.toBeInTheDocument();
  });

  it("envía solo las cantidades mayores a cero", async () => {
    mocks.consumir.mockResolvedValue({ id: 9 });
    const user = userEvent.setup();

    render(
      <ConsumirMaterialesDialog ordenId={9} numero="ORD-000009" items={[CABLE_ITEM]} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Consumir materiales" }),
    );

    fireEvent.change(screen.getByLabelText("Cantidad de Cable 12 AWG"), {
      target: { value: "2" },
    });

    const dialog = screen.getByRole("dialog", {
      name: "Consumir materiales",
    });

    await user.click(
      within(dialog).getByRole("button", { name: "Consumir materiales" }),
    );

    await waitFor(() => {
      expect(mocks.consumir).toHaveBeenCalledWith(9, [
        { orden_item_id: 1, cantidad: 2 },
      ]);
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("no permite consumir más de lo pendiente", async () => {
    const user = userEvent.setup();

    render(
      <ConsumirMaterialesDialog ordenId={9} numero="ORD-000009" items={[CABLE_ITEM]} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Consumir materiales" }),
    );

    fireEvent.change(screen.getByLabelText("Cantidad de Cable 12 AWG"), {
      target: { value: "9" },
    });

    const dialog = screen.getByRole("dialog", {
      name: "Consumir materiales",
    });

    await user.click(
      within(dialog).getByRole("button", { name: "Consumir materiales" }),
    );

    expect(
      screen.getByText("No superes lo pendiente (3)."),
    ).toBeInTheDocument();
    expect(mocks.consumir).not.toHaveBeenCalled();
  });

  it("advierte cuando el stock actual no alcanza", async () => {
    const user = userEvent.setup();

    render(
      <ConsumirMaterialesDialog
        ordenId={9}
        numero="ORD-000009"
        items={[
          {
            ...CABLE_ITEM,
            producto: { ...CABLE, stock_actual: 1 },
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Consumir materiales" }),
    );

    const dialog = screen.getByRole("dialog", {
      name: "Consumir materiales",
    });

    await user.click(
      within(dialog).getByRole("button", { name: "Consumir materiales" }),
    );

    expect(
      screen.getByText(
        "Stock insuficiente: hay 1 metro.",
      ),
    ).toBeInTheDocument();
    expect(mocks.consumir).not.toHaveBeenCalled();
  });
});

describe("erroresConsumo", () => {
  it("traduce los 422 indexados a los data-field de cada material", () => {
    const mapped = erroresConsumo(
      {
        "items.0.cantidad": ["La cantidad supera el stock."],
        motivo: ["Motivo inválido."],
      },
      [CABLE_ITEM],
    );

    expect(mapped).toEqual({
      cantidad_1: ["La cantidad supera el stock."],
      motivo: ["Motivo inválido."],
    });
  });
});
