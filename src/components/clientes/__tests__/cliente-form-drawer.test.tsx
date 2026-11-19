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
  obtener: vi.fn(),
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
    obtener: mocks.obtener,
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

describe("ClienteFormDrawer · validación antes de enviar", { timeout: 15_000 }, () => {
  beforeEach(() => {
    mocks.create.mockReset();
  });

  it("marca correo inválido y textos largos sin llamar a la API", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDrawer(null);

    await user.type(within(dialog).getByRole("textbox", { name: /Nombre o razón social/ }), "Cliente nuevo");
    await user.type(within(dialog).getByRole("textbox", { name: /NIT \/ CI/ }), "1".repeat(31));
    await user.type(within(dialog).getByRole("textbox", { name: /Correo electrónico/ }), "compras@");
    await user.click(within(dialog).getByRole("button", { name: "Crear cliente" }));

    expect(
      await within(dialog).findByText("El campo NIT/CI no debe tener más de 30 caracteres."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("El campo correo electrónico debe ser una dirección de correo válida."),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Revisa 2 campos")).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("con los datos corregidos, envía", async () => {
    const user = userEvent.setup();
    mocks.create.mockResolvedValue({ ...CLIENTE, id: 9 });
    const { dialog, onSaved } = renderDrawer(null);

    await user.type(within(dialog).getByRole("textbox", { name: /Nombre o razón social/ }), "Cliente nuevo");
    await user.type(within(dialog).getByRole("textbox", { name: /Correo electrónico/ }), "compras@nuevo.bo");
    await user.click(within(dialog).getByRole("button", { name: "Crear cliente" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      nombre_razon: "Cliente nuevo",
      email: "compras@nuevo.bo",
    });
    expect(onSaved).toHaveBeenCalled();
  });
});

describe("ClienteFormDrawer · otro usuario guardó antes (C-05)", { timeout: 15_000 }, () => {
  const MENSAJE =
    "Otro usuario modificó este cliente (Ana Torres, 17/11/2026 10:32) mientras lo editabas. Recarga para ver sus cambios; los tuyos no se guardaron.";

  beforeEach(() => {
    mocks.update.mockReset();
    mocks.obtener.mockReset();
  });

  it("envía la versión con la que se abrió", async () => {
    const user = userEvent.setup();
    mocks.update.mockResolvedValue({ ...CLIENTE, version: 5 });
    const { dialog } = renderDrawer({ ...CLIENTE, version: 4 });

    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][1]).toMatchObject({ version: 4 });
  });

  it("ante un 409 avisa con el mensaje del back y no pierde lo escrito", async () => {
    const user = userEvent.setup();
    mocks.update.mockRejectedValue(apiErrorFromResponse(409, { message: MENSAJE }));
    const { dialog, onSaved } = renderDrawer({ ...CLIENTE, version: 1 });
    const telefono = within(dialog).getByRole("textbox", { name: /Teléfono/ });

    await user.type(telefono, "70000001");
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    expect(await within(dialog).findByText("Este cliente cambió mientras lo editabas")).toBeInTheDocument();
    expect(within(dialog).getByText(MENSAJE)).toBeInTheDocument();
    expect(telefono).toHaveValue("70000001");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("Recargar datos trae el cliente actual y el siguiente guardado usa su versión", async () => {
    const user = userEvent.setup();
    mocks.update
      .mockRejectedValueOnce(apiErrorFromResponse(409, { message: MENSAJE }))
      .mockResolvedValueOnce({ ...CLIENTE, version: 3 });
    mocks.obtener.mockResolvedValue({ ...CLIENTE, telefono: "70099999", version: 2 });
    const { dialog, onSaved } = renderDrawer({ ...CLIENTE, version: 1 });

    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    await user.click(await within(dialog).findByRole("button", { name: "Recargar datos" }));

    await waitFor(() => expect(mocks.obtener).toHaveBeenCalledWith(3));
    expect(within(dialog).getByRole("textbox", { name: /Teléfono/ })).toHaveValue("70099999");
    expect(within(dialog).queryByText("Este cliente cambió mientras lo editabas")).toBeNull();

    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
    expect(mocks.update.mock.calls[1][1]).toMatchObject({ version: 2, telefono: "70099999" });
    expect(onSaved).toHaveBeenCalled();
  });
});
