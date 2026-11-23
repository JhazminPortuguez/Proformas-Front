import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsuarioFormDrawer } from "@/components/usuarios/usuario-form-drawer";
import { UsuariosTable } from "@/components/usuarios/usuarios-table";
import type { Rol, User } from "@/lib/api/types";

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

function renderDrawer(onSaved = vi.fn(), roles: Rol[] = ["operario", "cliente"]) {
  render(
    <UsuarioFormDrawer isOpen onOpenChange={vi.fn()} roles={roles} clientes={CLIENTES} onSaved={onSaved} />,
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
        viewerRol="admin"
        clientes={CLIENTES}
      />,
    );

    expect(screen.getByText("Cliente Prospecto SRL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo usuario" })).toBeInTheDocument();
  });

  const OTRO_ADMIN: User = { ...ADMIN, id: 2, name: "Otra Admin", email: "otra@x.test" };
  const OPERARIO: User = { ...ADMIN, id: 3, name: "Rosa", email: "rosa@x.test", rol: "operario" };

  it("ronda B: el admin ve a otro administrador, pero no lo puede modificar", () => {
    render(
      <UsuariosTable
        usuarios={[ADMIN, OTRO_ADMIN, OPERARIO]}
        meta={{ current_page: 1, per_page: 15, total: 3, last_page: 1 }}
        query={{ search: "", page: 1 }}
        currentUserId={1}
        viewerRol="admin"
        clientes={CLIENTES}
      />,
    );

    expect(screen.getAllByText("Lo gestiona el superusuario")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Rol de Otra Admin" })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Activo: Otra Admin" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Eliminar Otra Admin" })).not.toBeInTheDocument();
    // Al operario sí.
    expect(screen.getByRole("switch", { name: "Activo: Rosa" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Eliminar Rosa" })).toBeEnabled();
  });

  it("ronda B: el superusuario gestiona administradores", () => {
    const SUPER: User = { ...ADMIN, id: 7, name: "Soporte", email: "soporte@x.test", rol: "superusuario" };

    render(
      <UsuariosTable
        usuarios={[SUPER, OTRO_ADMIN, OPERARIO]}
        meta={{ current_page: 1, per_page: 15, total: 3, last_page: 1 }}
        query={{ search: "", page: 1 }}
        currentUserId={7}
        viewerRol="superusuario"
      />,
    );

    expect(screen.getByRole("switch", { name: "Activo: Otra Admin" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Eliminar Otra Admin" })).toBeEnabled();
    expect(screen.queryByText(/Los clientes nuevos pueden registrarse/)).not.toBeInTheDocument();
  });
});

describe("UsuarioFormDrawer según quién crea (ronda B)", () => {
  it("el admin no ofrece el rol Administrador", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: /Rol/ }));

    expect(await screen.findByRole("option", { name: "Cliente" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Administrador" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Superusuario" })).not.toBeInTheDocument();
  }, LENTA);

  it("el superusuario crea administradores y operarios, no clientes ni superusuarios", async () => {
    const user = userEvent.setup();
    mocks.create.mockResolvedValue({});
    renderDrawer(vi.fn(), ["admin", "operario"]);

    await llenarDatos(user);
    await elegirRol(user, "Administrador");
    expect(screen.queryByRole("combobox", { name: /Cliente/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Rol/ }));
    expect(screen.queryByRole("option", { name: "Cliente" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Superusuario" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Crear usuario" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ rol: "admin", cliente_id: null });
  }, LENTA);
});
