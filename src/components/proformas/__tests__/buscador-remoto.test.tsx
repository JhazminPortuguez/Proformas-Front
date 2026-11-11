import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProformaForm } from "@/components/proformas/proforma-form";
import type { Cliente, Servicio } from "@/lib/api/types";
import { opcionesVisibles } from "@/lib/hooks/use-catalogo-remoto";

/** Punto 5: los selectores de la proforma buscan en el servidor, sin límite de 100. */

const mocks = vi.hoisted(() => ({
  buscarClientes: vi.fn(),
  buscarServicios: vi.fn(),
  buscarProductos: vi.fn(),
}));

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
  clientes: { buscar: mocks.buscarClientes },
  servicios: { buscar: mocks.buscarServicios },
  productos: { buscar: mocks.buscarProductos },
  proformas: { create: vi.fn(), update: vi.fn(), enviar: vi.fn() },
}));

function cliente(id: number, nombre: string): Cliente {
  return { id, nombre_razon: nombre, nit_ci: null, telefono: null, email: null, direccion: null, estado: "activo" };
}

const SERVICIO: Servicio = {
  id: 10,
  nombre: "Armado de PC",
  descripcion: null,
  precio_base: 150,
  duracion_estimada_min: 60,
  categoria: "Soporte",
  activo: true,
  visible_catalogo: true,
};

describe("Buscador remoto de la proforma", { timeout: 20_000 }, () => {
  beforeEach(() => {
    mocks.buscarClientes.mockReset();
    mocks.buscarServicios.mockReset();
    mocks.buscarProductos.mockReset();
  });

  it("busca clientes en el servidor y ofrece uno que no estaba precargado", async () => {
    const user = userEvent.setup();
    mocks.buscarClientes.mockResolvedValue([cliente(150, "Hotel Illimani")]);

    render(
      <ProformaForm
        proforma={null}
        clientes={[cliente(1, "Constructora Andina")]}
        servicios={[]}
        productos={[]}
        today="2026-11-10"
      />,
    );

    const combo = screen.getByRole("combobox", { name: /Cliente/ });
    await user.click(combo);
    await user.type(combo, "Illi");

    await waitFor(() => expect(mocks.buscarClientes).toHaveBeenLastCalledWith("Illi"));
    expect(await screen.findByRole("option", { name: /Hotel Illimani/ })).toBeInTheDocument();
    // El resultado del servidor reemplaza la lista precargada: no hay filtro local.
    expect(screen.queryByRole("option", { name: /Constructora Andina/ })).not.toBeInTheDocument();
  });

  it("al elegir un servicio buscado, el formulario conoce su precio", async () => {
    const user = userEvent.setup();
    mocks.buscarServicios.mockResolvedValue([SERVICIO]);

    render(
      <ProformaForm
        proforma={null}
        clientes={[cliente(1, "Constructora Andina")]}
        servicios={[]}
        productos={[]}
        today="2026-11-10"
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Servicio$/ }));
    const combo = screen.getAllByRole("combobox", { name: /Servicio/ }).at(-1)!;
    await user.click(combo);
    await user.type(combo, "Arm");

    await waitFor(() => expect(mocks.buscarServicios).toHaveBeenLastCalledWith("Arm"));
    await user.click(await screen.findByRole("option", { name: /Armado de PC/ }));

    // El precio del catálogo (Bs 150,00) se toma del servicio buscado.
    expect((await screen.findAllByText(/150,00/)).length).toBeGreaterThan(0);
  });
});

describe("opcionesVisibles", () => {
  const ITEMS = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it("respeta el orden del servidor y agrega lo elegido aunque no venga en el resultado", () => {
    expect(opcionesVisibles(ITEMS, [3, 1], "").map((item) => item.id)).toEqual([3, 1]);
    expect(opcionesVisibles(ITEMS, [3], "2").map((item) => item.id)).toEqual([3, 2]);
    expect(opcionesVisibles(ITEMS, [3], "3").map((item) => item.id)).toEqual([3]);
  });
});
