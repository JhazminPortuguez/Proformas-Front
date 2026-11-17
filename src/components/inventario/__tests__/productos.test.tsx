import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExistenciasView } from "@/components/inventario/existencias-view";
import { ProductoFormDrawer } from "@/components/inventario/producto-form-drawer";
import { apiErrorFromResponse } from "@/lib/api/errors";
import type { PaginationMeta, Producto } from "@/lib/api/types";
import { productoPayload, validarProducto } from "@/lib/inventario";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: mocks.refresh,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api/client", () => ({
  productos: { create: mocks.create, update: mocks.update, remove: mocks.remove },
  inventario: { entrada: vi.fn(), ajuste: vi.fn() },
}));

const CABLE: Producto = {
  id: 5,
  nombre: "Cable 12 AWG",
  descripcion: null,
  precio_unitario: 12.5,
  unidad_medida: "metro",
  activo: true,
  stock_actual: 40,
  stock_minimo: 5,
  costo_promedio: 8,
  stock_bajo: false,
  valor_stock: 320,
  movimientos_count: 3,
};

const META: PaginationMeta = { current_page: 1, per_page: 15, total: 1, last_page: 1 };
const QUERY = { search: "", bajoStock: false, activo: "" as const, page: 1 };

const BORRADOR = {
  nombre: "Cable UTP",
  unidad_medida: "metro",
  precio_unitario: "8,50",
  costo: "5.25",
  stock_minimo: "20",
  stock_inicial: "150",
  activo: true,
};

beforeEach(() => {
  mocks.create.mockReset();
  mocks.update.mockReset();
  mocks.remove.mockReset();
  mocks.refresh.mockReset();
});

describe("validarProducto", () => {
  it("un producto correcto no tiene errores", () => {
    expect(validarProducto(BORRADOR, { esNuevo: true })).toEqual({});
  });

  it("usa los mismos textos que el back", () => {
    expect(
      validarProducto(
        {
          nombre: " ",
          unidad_medida: "u".repeat(31),
          precio_unitario: "10,555",
          costo: "-1",
          stock_minimo: "abc",
          stock_inicial: "1.2345",
          activo: true,
        },
        { esNuevo: true },
      ),
    ).toEqual({
      nombre: ["El nombre del producto es obligatorio."],
      unidad_medida: ["El campo unidad de medida no debe tener más de 30 caracteres."],
      precio_unitario: ["El precio de venta debe tener como máximo 2 decimales."],
      costo_promedio: ["El costo no puede ser negativo."],
      stock_minimo: ["El stock mínimo debe ser numérico."],
      stock_actual: ["El stock inicial debe tener como máximo 3 decimales."],
    });
  });

  it("exige el precio de venta y al editar no revisa costo ni stock inicial", () => {
    expect(
      validarProducto(
        { ...BORRADOR, precio_unitario: "", costo: "-5", stock_inicial: "x" },
        { esNuevo: false },
      ),
    ).toEqual({ precio_unitario: ["El precio de venta es obligatorio."] });
  });

  it("el stock inicial solo viaja si es mayor que 0", () => {
    expect(productoPayload(BORRADOR)).toEqual({
      nombre: "Cable UTP",
      unidad_medida: "metro",
      precio_unitario: 8.5,
      costo_promedio: 5.25,
      stock_minimo: 20,
      stock_actual: 150,
      activo: true,
    });
    expect(productoPayload({ ...BORRADOR, stock_inicial: "0" })).not.toHaveProperty(
      "stock_actual",
    );
    expect(productoPayload({ ...BORRADOR, stock_inicial: "" })).not.toHaveProperty(
      "stock_actual",
    );
  });
});

describe("ProductoFormDrawer", { timeout: 15_000 }, () => {
  it("valida en el navegador sin llamar a la API", async () => {
    const user = userEvent.setup();

    render(<ProductoFormDrawer isOpen onOpenChange={vi.fn()} producto={null} />);
    const dialog = screen.getByRole("dialog");

    fireEvent.change(within(dialog).getByRole("textbox", { name: /^Precio de venta/ }), {
      target: { value: "1,999" },
    });
    await user.click(within(dialog).getByRole("button", { name: "Crear producto" }));

    expect(within(dialog).getByText("El nombre del producto es obligatorio.")).toBeInTheDocument();
    expect(
      within(dialog).getByText("El precio de venta debe tener como máximo 2 decimales."),
    ).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("crea con el stock inicial (el back lo registra como entrada)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    mocks.create.mockResolvedValue({ ...CABLE, id: 9 });
    render(<ProductoFormDrawer isOpen onOpenChange={onOpenChange} producto={null} />);
    const dialog = screen.getByRole("dialog");

    await user.type(within(dialog).getByRole("textbox", { name: /^Nombre/ }), "Cable UTP");
    await user.type(within(dialog).getByRole("textbox", { name: /^Unidad de medida/ }), "metro");
    await user.type(within(dialog).getByRole("textbox", { name: /^Precio de venta/ }), "8,50");
    await user.type(within(dialog).getByRole("textbox", { name: /^Costo/ }), "5.25");
    await user.type(within(dialog).getByRole("textbox", { name: /^Stock mínimo/ }), "20");
    await user.type(within(dialog).getByRole("textbox", { name: /^Stock inicial/ }), "150");
    await user.click(within(dialog).getByRole("button", { name: "Crear producto" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith({
      nombre: "Cable UTP",
      unidad_medida: "metro",
      precio_unitario: 8.5,
      costo_promedio: 5.25,
      stock_minimo: 20,
      stock_actual: 150,
      activo: true,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("al editar no se escribe stock ni costo: se muestran como lectura", async () => {
    const user = userEvent.setup();

    mocks.update.mockResolvedValue({ ...CABLE, precio_unitario: 13 });
    render(<ProductoFormDrawer isOpen onOpenChange={vi.fn()} producto={CABLE} />);
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).queryByRole("textbox", { name: /^Stock inicial/ })).toBeNull();
    expect(within(dialog).queryByRole("textbox", { name: /^Costo/ })).toBeNull();
    expect(within(dialog).getByText("Stock actual")).toBeInTheDocument();

    const precio = within(dialog).getByRole("textbox", { name: /^Precio de venta/ });

    await user.clear(precio);
    await user.type(precio, "13");
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const [id, payload] = mocks.update.mock.calls[0];

    expect(id).toBe(5);
    expect(payload).toEqual({
      nombre: "Cable 12 AWG",
      unidad_medida: "metro",
      precio_unitario: 13,
      stock_minimo: 5,
      activo: true,
    });
    expect(payload).not.toHaveProperty("stock_actual");
    expect(payload).not.toHaveProperty("costo_promedio");
  });
});

describe("ExistenciasView · gestión de productos", { timeout: 15_000 }, () => {
  function renderView({ canManage }: { canManage: boolean }) {
    render(
      <ExistenciasView
        productos={[CABLE]}
        meta={META}
        query={QUERY}
        catalogo={[]}
        canAdjust={canManage}
        canManage={canManage}
      />,
    );
  }

  it("el operario no ve Nuevo producto, Editar, Desactivar ni Eliminar", () => {
    renderView({ canManage: false });

    expect(screen.queryByRole("button", { name: "Nuevo producto" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar Cable 12 AWG" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Desactivar Cable 12 AWG" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Eliminar Cable 12 AWG" })).toBeNull();
  });

  it("el admin desactiva después de confirmar", async () => {
    const user = userEvent.setup();

    mocks.update.mockResolvedValue({ ...CABLE, activo: false });
    renderView({ canManage: true });

    expect(screen.getByRole("button", { name: "Nuevo producto" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Desactivar Cable 12 AWG" })[0]);

    const confirmar = await screen.findByRole("alertdialog", { name: "Desactivar producto" });

    await user.click(within(confirmar).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(5, { activo: false }));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("si el back no deja eliminar, muestra su motivo", async () => {
    const user = userEvent.setup();

    mocks.remove.mockRejectedValue(
      apiErrorFromResponse(409, {
        message:
          "No se puede eliminar el producto porque tiene movimientos de inventario. Desactívalo en su lugar.",
      }),
    );
    renderView({ canManage: true });

    await user.click(screen.getAllByRole("button", { name: "Eliminar Cable 12 AWG" })[0]);
    const confirmar = await screen.findByRole("alertdialog", { name: "Eliminar producto" });

    await user.click(within(confirmar).getByRole("button", { name: "Eliminar" }));

    expect(
      await within(confirmar).findByText(
        "No se puede eliminar el producto porque tiene movimientos de inventario. Desactívalo en su lugar.",
      ),
    ).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("Editar abre el formulario con los datos del producto", async () => {
    const user = userEvent.setup();

    renderView({ canManage: true });
    await user.click(screen.getAllByRole("button", { name: "Editar Cable 12 AWG" })[0]);

    const dialog = await screen.findByRole("dialog", { name: /Editar producto/ });

    expect(within(dialog).getByRole("textbox", { name: /^Nombre/ })).toHaveValue("Cable 12 AWG");
  });
});
