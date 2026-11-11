import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClienteFormDrawer } from "@/components/clientes/cliente-form-drawer";
import { apiErrorFromResponse } from "@/lib/api/errors";
import type { Cliente } from "@/lib/api/types";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  create: vi.fn(),
  enCurso: vi.fn(),
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
  clientes: {
    create: mocks.create,
    update: mocks.update,
    remove: vi.fn(),
    enCurso: mocks.enCurso,
  },
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

function renderDrawer(cliente: Cliente | null = CLIENTE) {
  const onSaved = vi.fn();

  render(
    <ClienteFormDrawer isOpen onOpenChange={vi.fn()} cliente={cliente} onSaved={onSaved} />,
  );

  return { onSaved, dialog: screen.getByRole("dialog") };
}

async function elegirInactivo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Estado/ }));
  await user.click(await screen.findByRole("option", { name: "Inactivo" }));
}

describe("ClienteFormDrawer · desactivar con trabajo en curso (punto 2)", { timeout: 15_000 }, () => {
  beforeEach(() => {
    mocks.update.mockReset();
    mocks.enCurso.mockReset();
  });

  it("avisa con los números y desactiva al confirmar", async () => {
    const user = userEvent.setup();
    mocks.enCurso.mockResolvedValue({
      proformas: ["PR-2026-000003", "PR-2026-000012"],
      ordenes: ["OS-2026-000009"],
    });
    mocks.update.mockResolvedValue({ ...CLIENTE, estado: "inactivo" });
    const { onSaved, dialog } = renderDrawer();

    await elegirInactivo(user);
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    expect(await within(dialog).findByText("Este cliente tiene trabajo en curso")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Proformas enviadas: PR-2026-000003, PR-2026-000012.");
    expect(dialog).toHaveTextContent("Órdenes activas: OS-2026-000009.");
    expect(mocks.update).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Desactivar de todos modos" }));

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(3, expect.objectContaining({ estado: "inactivo" })),
    );
    expect(onSaved).toHaveBeenCalled();
    expect(mocks.enCurso).toHaveBeenCalledTimes(1);
  });

  it("sin trabajo en curso guarda directo", async () => {
    const user = userEvent.setup();
    mocks.enCurso.mockResolvedValue({ proformas: [], ordenes: [] });
    mocks.update.mockResolvedValue({ ...CLIENTE, estado: "inactivo" });
    const { dialog } = renderDrawer();

    await elegirInactivo(user);
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(within(dialog).queryByText("Este cliente tiene trabajo en curso")).not.toBeInTheDocument();
  });

  it("si no cambia a inactivo no consulta", async () => {
    const user = userEvent.setup();
    mocks.update.mockResolvedValue(CLIENTE);
    const { dialog } = renderDrawer();

    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.enCurso).not.toHaveBeenCalled();
  });
});

describe("ClienteFormDrawer · NIT/CI duplicado (C-02)", () => {
  it("muestra junto al campo el cliente que ya tiene ese NIT/CI", async () => {
    const user = userEvent.setup();
    const mensaje = "El NIT/CI 1020304 ya está registrado para el cliente «Hotel Illimani».";
    mocks.create.mockRejectedValue(
      apiErrorFromResponse(422, { message: mensaje, errors: { nit_ci: [mensaje] } }),
    );
    const { dialog } = renderDrawer(null);

    await user.type(within(dialog).getByLabelText(/Nombre o razón social/), "Otra SRL");
    await user.type(within(dialog).getByLabelText(/NIT \/ CI/), "1020304");
    await user.click(within(dialog).getByRole("button", { name: "Crear cliente" }));

    expect(await within(dialog).findAllByText(mensaje)).not.toHaveLength(0);
  });
});
