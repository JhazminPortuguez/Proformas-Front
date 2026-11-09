import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CancelarOrdenDialog } from "@/components/ordenes/cancelar-orden-dialog";
import { ApiError, type OrdenItem } from "@/lib/api/types";
import { MOTIVO_NADA_QUE_COBRAR } from "@/lib/ordenes";

const mocks = vi.hoisted(() => ({ cancelar: vi.fn(), get: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  ordenes: { cancelar: mocks.cancelar, get: mocks.get },
}));

function material(
  id: number,
  nombre: string,
  cantidad: number,
  consumida: number,
  precio: number,
): OrdenItem {
  return {
    id,
    orden_id: 31,
    tipo: "MATERIAL",
    servicio_id: null,
    producto_id: id * 10,
    descripcion: nombre,
    unidad_medida: "unidad",
    cantidad,
    precio_unitario: precio,
    total_linea: cantidad * precio,
    cantidad_consumida: consumida,
  };
}

// Armado de PC: 2 RAM consumidas, 1 SSD consumido, 1 fuente sin consumir y el servicio.
const ITEMS: OrdenItem[] = [
  material(1, "Memoria RAM 8 GB", 2, 2, 150),
  material(2, "Disco SSD 480 GB", 1, 1, 280.5),
  material(3, "Fuente 500 W", 1, 0, 300),
  {
    ...material(4, "Armado y configuración", 1, 0, 200),
    tipo: "SERVICIO",
    producto_id: null,
    servicio_id: 7,
  },
];

function renderDialog(props: Partial<Parameters<typeof CancelarOrdenDialog>[0]> = {}) {
  const onCancelled = vi.fn();

  render(
    <CancelarOrdenDialog
      isOpen
      onOpenChange={vi.fn()}
      ordenId={31}
      numero="OS-2026-000031"
      items={ITEMS}
      onCancelled={onCancelled}
      onUnauthorized={vi.fn()}
      {...props}
    />,
  );

  return { onCancelled };
}

function campoDevolucion(nombre: string): HTMLInputElement {
  return screen.getByLabelText(`Devolver al stock: ${nombre}`, { selector: "input" }) as HTMLInputElement;
}

function casillaCobro(): HTMLInputElement {
  return screen.getByRole("checkbox", { name: "Cobrar al cliente los materiales utilizados" }) as HTMLInputElement;
}

describe("CancelarOrdenDialog · materiales consumidos", () => {
  beforeEach(() => {
    mocks.cancelar.mockReset();
    mocks.get.mockReset();
  });

  it("lista solo los materiales consumidos, con 0 a devolver por defecto", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: "Cancelar orden" });

    expect(within(dialog).getByText("Memoria RAM 8 GB")).toBeInTheDocument();
    expect(within(dialog).getByText("Disco SSD 480 GB")).toBeInTheDocument();
    expect(within(dialog).queryByText("Fuente 500 W")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Armado y configuración")).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Consumido: 2 unidad/)).toBeInTheDocument();

    expect(campoDevolucion("Memoria RAM 8 GB")).toHaveValue("0");
    expect(campoDevolucion("Disco SSD 480 GB")).toHaveValue("0");
    expect(casillaCobro()).not.toBeChecked();
    // Sin devolver nada, se cobraría todo lo consumido: 2 × 150 + 280,50.
    expect(dialog).toHaveTextContent(/se cobra lo que no se devuelve: Bs\s?580,50/);
  });

  it("devuelve una parte y cobra el resto en una sola llamada", async () => {
    const user = userEvent.setup();
    mocks.cancelar.mockResolvedValue({ id: 31 });
    const { onCancelled } = renderDialog();

    await user.type(screen.getByLabelText("Motivo de la cancelación", { selector: "textarea" }), "El cliente desistió.");
    fireEvent.change(campoDevolucion("Memoria RAM 8 GB"), { target: { value: "1" } });
    await user.click(casillaCobro());

    const dialog = screen.getByRole("dialog", { name: "Cancelar orden" });
    expect(dialog).toHaveTextContent(/cuenta por cobrar por cancelación de Bs\s?430,50, con vencimiento a 30 días/);
    expect(dialog).toHaveTextContent(/Se cobra 1 × Bs\s?150,00 = Bs\s?150,00/);

    await user.click(screen.getByRole("button", { name: "Cancelar orden" }));

    await waitFor(() =>
      expect(mocks.cancelar).toHaveBeenCalledWith(31, "El cliente desistió.", {
        devoluciones: [
          { orden_item_id: 1, cantidad: 1 },
          { orden_item_id: 2, cantidad: 0 },
        ],
        cobrar_materiales: true,
      }),
    );
    expect(onCancelled).toHaveBeenCalledWith(
      expect.stringMatching(/cobro por cancelación de Bs\s?430,50/),
    );
  });

  it("si se devuelve todo, la casilla queda deshabilitada y explica el motivo", async () => {
    const user = userEvent.setup();
    renderDialog();

    fireEvent.change(campoDevolucion("Memoria RAM 8 GB"), { target: { value: "2" } });
    fireEvent.change(campoDevolucion("Disco SSD 480 GB"), { target: { value: "1" } });

    expect(casillaCobro()).toBeDisabled();
    expect(casillaCobro()).not.toBeChecked();
    expect(screen.getByRole("dialog", { name: "Cancelar orden" })).toHaveTextContent(MOTIVO_NADA_QUE_COBRAR);

    // El tooltip repite el motivo. React Aria lo abre con foco solo si la
    // última interacción fue de teclado (Escape cerraría el modal: se usa una flecha).
    const disparador = casillaCobro().closest<HTMLElement>('[data-slot="tooltip-trigger"]')!;
    await user.keyboard("{ArrowLeft}");
    act(() => disparador.focus());
    expect(await screen.findByRole("tooltip")).toHaveTextContent(MOTIVO_NADA_QUE_COBRAR);
    act(() => disparador.blur());
  });

  it("no deja devolver más de lo consumido ni sin motivo", async () => {
    const user = userEvent.setup();
    renderDialog();

    fireEvent.change(campoDevolucion("Memoria RAM 8 GB"), { target: { value: "3" } });
    await user.click(screen.getByRole("button", { name: "Cancelar orden" }));

    expect(await screen.findByText("No puede superar lo consumido (2).")).toBeInTheDocument();
    expect(screen.getByText(/Explica por qué se cancela/)).toBeInTheDocument();
    expect(mocks.cancelar).not.toHaveBeenCalled();
  });

  it("muestra el error del back", async () => {
    const user = userEvent.setup();
    mocks.cancelar.mockRejectedValue(
      new ApiError("Datos inválidos", 422, {
        cobrar_materiales: [
          "No queda nada por cobrar: se devolvieron al stock todos los materiales consumidos.",
        ],
      }),
    );
    renderDialog();

    await user.type(screen.getByLabelText("Motivo de la cancelación", { selector: "textarea" }), "Cliente canceló.");
    await user.click(casillaCobro());
    await user.click(screen.getByRole("button", { name: "Cancelar orden" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No queda nada por cobrar: se devolvieron al stock todos los materiales consumidos.",
    );
  });

  it("sin ítems (tabla o tablero) pide la orden y luego muestra los materiales", async () => {
    let resolver: (orden: unknown) => void = () => {};
    mocks.get.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    renderDialog({ items: undefined });

    expect(mocks.get).toHaveBeenCalledWith(31);
    expect(screen.getByText("Revisando los materiales consumidos…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar orden" })).toBeDisabled();

    await act(async () => resolver({ id: 31, items: ITEMS }));

    expect(await screen.findByText("Memoria RAM 8 GB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar orden" })).toBeEnabled();
  });

  it("una orden sin consumos se cancela solo con el motivo", async () => {
    const user = userEvent.setup();
    mocks.cancelar.mockResolvedValue({ id: 31 });
    renderDialog({ items: [ITEMS[2], ITEMS[3]] });

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Motivo de la cancelación", { selector: "textarea" }), "Cliente canceló.");
    await user.click(screen.getByRole("button", { name: "Cancelar orden" }));

    await waitFor(() =>
      expect(mocks.cancelar).toHaveBeenCalledWith(31, "Cliente canceló.", {}),
    );
  });
});
