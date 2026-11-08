import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsuarioFormDrawer } from "@/components/usuarios/usuario-form-drawer";
import { UsuariosTable } from "@/components/usuarios/usuarios-table";
import type { User } from "@/lib/api/types";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
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
  usuarios: { create: mocks.create, update: mocks.update, remove: mocks.remove },
}));

const CLIENTES = [
  { id: 2, nombre_razon: "Cliente Prospecto SRL", nit_ci: "9001002" },
  { id: 3, nombre_razon: "Constructora Andina", nit_ci: null },
];

function renderDrawer(onSaved = vi.fn()) {
  render(
    <UsuarioFormDrawer isOpen onOpenChange={vi.fn()} clientes={CLIENTES} onSaved={onSaved} />,
  );

  return onSaved;
}

async function llenarDatos(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: /^Nombre/ }), "Compras Prospecto");
  await user.type(screen.getByRole("textbox", { name: /^Correo/ }), "compras@prospecto.test");
  await user.type(screen.getByLabelText(/^Contraseña inicial/), "secret123");
}

async function elegirRol(user: ReturnType<typeof userEvent.setup>, rol: string) {
  await user.click(screen.getByRole("button", { name: /Rol/ }));
  await user.click(await screen.findByRole("option", { name: rol }));
}

beforeEach(() => {
  mocks.create.mockReset();
});

// Formulario con varias teclas y dos selecciones: en la suite completa tarda.
const LENTA = 20_000;

describe("UsuarioFormDrawer", () => {
  it("el selector de cliente solo aparece con el rol Cliente", async () => {
    const user = userEvent.setup();
    renderDrawer();

    expect(screen.queryByRole("combobox", { name: /Cliente/ })).not.toBeInTheDocument();

    await elegirRol(user, "Cliente");

    expect(screen.getByRole("combobox", { name: /Cliente/ })).toBeInTheDocument();
  }, LENTA);

  it("con rol Cliente exige elegir el cliente", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await llenarDatos(user);
    await elegirRol(user, "Cliente");
    await user.click(screen.getByRole("button", { name: "Crear usuario" }));

    expect(
      await screen.findByText("Elige el cliente al que pertenece este acceso."),
    ).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  }, LENTA);

  it("crea el acceso de un cliente existente con su cliente_id", async () => {
    const user = userEvent.setup();
    mocks.create.mockResolvedValue({ id: 30 });
    const onSaved = renderDrawer();

    await llenarDatos(user);
    await elegirRol(user, "Cliente");
    await user.type(screen.getByRole("combobox", { name: /Cliente/ }), "Prospecto");
    await user.click(await screen.findByRole("option", { name: /Cliente Prospecto SRL/ }));
    await user.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith({
      name: "Compras Prospecto",
      email: "compras@prospecto.test",
      password: "secret123",
      rol: "cliente",
      cliente_id: 2,
    });
    expect(onSaved).toHaveBeenCalled();
  }, LENTA);

  it("un usuario interno se crea sin cliente", async () => {
    const user = userEvent.setup();
    mocks.create.mockResolvedValue({ id: 31 });
    renderDrawer();

    await llenarDatos(user);
    await user.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ rol: "operario", cliente_id: null });
  }, LENTA);
});

describe("UsuariosTable", () => {
  const ADMIN: User = {
    id: 1,
    name: "Admin",
    email: "admin@x.test",
    rol: "admin",
    activo: true,
    cliente_id: null,
    empresa_id: 1,
    cliente: null,
  };
  const CLIENTE: User = {
    id: 9,
    name: "Compras",
    email: "compras@prospecto.test",
    rol: "cliente",
    activo: true,
    cliente_id: 2,
    empresa_id: 1,
    cliente: { id: 2, nombre_razon: "Cliente Prospecto SRL", nit_ci: "9001002" },
  };

  it("muestra el cliente vinculado y ofrece crear usuarios", () => {
    render(
      <UsuariosTable
        usuarios={[ADMIN, CLIENTE]}
        meta={{ current_page: 1, per_page: 15, total: 2, last_page: 1 }}
        query={{ search: "", page: 1 }}
        currentUserId={1}
        clientes={CLIENTES}
      />,
    );

    expect(screen.getByText("Cliente Prospecto SRL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo usuario" })).toBeInTheDocument();
  });
});
