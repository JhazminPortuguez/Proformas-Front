import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AjustarStockDialog } from "@/components/inventario/ajustar-stock-dialog";
import { RegistrarEntradaDialog } from "@/components/inventario/registrar-entrada-dialog";
import { ApiError } from "@/lib/api/types";
import type { ProductoCatalogOption } from "@/lib/inventario";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  entrada: vi.fn(),
  ajuste: vi.fn(),
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
  inventario: {
    entrada: mocks.entrada,
    ajuste: mocks.ajuste,
  },
}));

const PRODUCTOS: ProductoCatalogOption[] = [
  {
    id: 5,
    label: "Cable 12 AWG",
    description: "Stock 2 metro · mínimo 5 metro",
  },
];

describe("RegistrarEntradaDialog", () => {
  beforeEach(() => {
    mocks.entrada.mockReset();
    mocks.refresh.mockReset();
  });

  it("valida la cantidad antes de llamar a la API", async () => {
    const user = userEvent.setup();

    render(
      <RegistrarEntradaDialog
        isOpen
        onOpenChange={vi.fn()}
        productos={PRODUCTOS}
        productoId={5}
      />,
    );

    const dialog = screen.getByRole("dialog", {
      name: "Registrar entrada de stock",
    });

    await user.click(
      within(dialog).getByRole("button", { name: "Registrar entrada" }),
    );

    expect(screen.getByText("Revisa 1 campo")).toBeInTheDocument();
    expect(
      screen.getByText("Indica una cantidad mayor a cero."),
    ).toBeInTheDocument();
    expect(mocks.entrada).not.toHaveBeenCalled();
  });

  it("registra la entrada con cantidad, costo y motivo", async () => {
    mocks.entrada.mockResolvedValue({ id: 44 });
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RegistrarEntradaDialog
        isOpen
        onOpenChange={onOpenChange}
        productos={PRODUCTOS}
        productoId={5}
      />,
    );

    const dialog = screen.getByRole("dialog", {
      name: "Registrar entrada de stock",
    });

    fireEvent.change(screen.getByLabelText("Cantidad"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Costo unitario (opcional)"), {
      target: { value: "9,5" },
    });
    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), {
      target: { value: "Compra a proveedor" },
    });

    await user.click(
      within(dialog).getByRole("button", { name: "Registrar entrada" }),
    );

    await waitFor(() => {
      expect(mocks.entrada).toHaveBeenCalledWith({
        producto_id: 5,
        cantidad: 4,
        costo_unitario: 9.5,
        motivo: "Compra a proveedor",
      });
    });

    expect(mocks.refresh).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("muestra el 422 junto al campo y enfoca la cantidad", async () => {
    mocks.entrada.mockRejectedValueOnce(
      new ApiError("Revisa los datos", 422, {
        cantidad: ["La cantidad debe ser mayor a cero."],
      }),
    );
    const user = userEvent.setup();

    render(
      <RegistrarEntradaDialog
        isOpen
        onOpenChange={vi.fn()}
        productos={PRODUCTOS}
        productoId={5}
      />,
    );

    fireEvent.change(screen.getByLabelText("Cantidad"), {
      target: { value: "4" },
    });

    const dialog = screen.getByRole("dialog", {
      name: "Registrar entrada de stock",
    });

    await user.click(
      within(dialog).getByRole("button", { name: "Registrar entrada" }),
    );

    expect(
      (await screen.findAllByText("La cantidad debe ser mayor a cero.")).length,
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText("Cantidad")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

describe("AjustarStockDialog", () => {
  beforeEach(() => {
    mocks.ajuste.mockReset();
    mocks.refresh.mockReset();
  });

  it("exige el motivo del ajuste", async () => {
    const user = userEvent.setup();

    render(
      <AjustarStockDialog
        isOpen
        onOpenChange={vi.fn()}
        productos={PRODUCTOS}
        productoId={5}
      />,
    );

    fireEvent.change(screen.getByLabelText("Stock final"), {
      target: { value: "12" },
    });

    const dialog = screen.getByRole("dialog", { name: "Ajustar stock" });

    await user.click(
      within(dialog).getByRole("button", { name: "Ajustar stock" }),
    );

    expect(
      screen.getByText("Explica el motivo del ajuste (mínimo 3 caracteres)."),
    ).toBeInTheDocument();
    expect(mocks.ajuste).not.toHaveBeenCalled();
  });

  it("envía el stock final y el motivo", async () => {
    mocks.ajuste.mockResolvedValue({ id: 45 });
    const user = userEvent.setup();

    render(
      <AjustarStockDialog
        isOpen
        onOpenChange={vi.fn()}
        productos={PRODUCTOS}
        productoId={5}
      />,
    );

    fireEvent.change(screen.getByLabelText("Stock final"), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText("Motivo del ajuste"), {
      target: { value: "Conteo físico" },
    });

    const dialog = screen.getByRole("dialog", { name: "Ajustar stock" });

    await user.click(
      within(dialog).getByRole("button", { name: "Ajustar stock" }),
    );

    await waitFor(() => {
      expect(mocks.ajuste).toHaveBeenCalledWith({
        producto_id: 5,
        stock_nuevo: 12,
        motivo: "Conteo físico",
      });
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
