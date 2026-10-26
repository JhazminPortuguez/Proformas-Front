import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClienteEditarAction } from "@/components/clientes/cliente-editar-action";
import type { Cliente } from "@/lib/api/types";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
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
  clientes: {
    create: vi.fn(),
    update: mocks.update,
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
};

describe("ClienteEditarAction", () => {
  beforeEach(() => {
    mocks.update.mockReset();
    mocks.refresh.mockReset();
  });

  it("abre el drawer con los datos y refresca la ficha al guardar", async () => {
    const user = userEvent.setup();

    mocks.update.mockResolvedValue(CLIENTE);

    render(<ClienteEditarAction cliente={CLIENTE} />);

    await user.click(screen.getByRole("button", { name: "Editar" }));

    const dialog = screen.getByRole("dialog", { name: "Editar cliente" });
    const nombre = within(dialog).getByLabelText(/Nombre o razón social/);

    expect(nombre).toHaveValue("Constructora Andina");

    await user.clear(nombre);
    await user.type(nombre, "Constructora Andina SRL");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => {
      expect(mocks.update).toHaveBeenCalledWith(3, {
        nombre_razon: "Constructora Andina SRL",
        nit_ci: "123456789",
        telefono: "77712345",
        email: "contacto@andina.example",
        direccion: "Av. Blanco Galindo km 5",
        estado: "activo",
      });
    });

    await waitFor(() => {
      expect(mocks.refresh).toHaveBeenCalled();
    });
  }, 15_000);

  it("no llama a la API si el nombre queda vacío", async () => {
    const user = userEvent.setup();

    render(<ClienteEditarAction cliente={CLIENTE} />);

    await user.click(screen.getByRole("button", { name: "Editar" }));

    const dialog = screen.getByRole("dialog", { name: "Editar cliente" });
    const nombre = within(dialog).getByLabelText(/Nombre o razón social/);

    await user.clear(nombre);
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByText(/obligatorio/i)).toBeInTheDocument();
  }, 15_000);
});
