import { describe, expect, it } from "vitest";
import { can, canAll, canAny, rolesFor } from "@/lib/permissions";
import type { Rol, User } from "@/lib/api/types";

function user(rol: Rol, activo = true): User {
  return {
    id: 1,
    name: "Usuario de prueba",
    email: `${rol}@example.com`,
    rol,
    activo,
    cliente_id: rol === "cliente" ? 10 : null,
    empresa_id: 1,
  };
}

describe("permissions", () => {
  it("el admin puede eliminar clientes y gestionar usuarios", () => {
    expect(can(user("admin"), "clientes.eliminar")).toBe(true);
    expect(can(user("admin"), "usuarios.gestionar")).toBe(true);
    expect(can(user("admin"), "ordenes.cerrar")).toBe(true);
  });

  it("el operario opera pero no elimina ni administra", () => {
    expect(can(user("operario"), "clientes.crear")).toBe(true);
    expect(can(user("operario"), "proformas.enviar")).toBe(true);
    expect(can(user("operario"), "ordenes.avanzar")).toBe(true);
    expect(can(user("operario"), "clientes.eliminar")).toBe(false);
    expect(can(user("operario"), "usuarios.gestionar")).toBe(false);
    expect(can(user("operario"), "pagos.anular")).toBe(false);
  });

  it("el cliente queda limitado al portal", () => {
    expect(can(user("cliente"), "portal.ver")).toBe(true);
    expect(can(user("cliente"), "dashboard.ver")).toBe(false);
    expect(can(user("cliente"), "proformas.crear")).toBe(false);
  });

  it("un usuario inactivo no puede hacer nada", () => {
    expect(can(user("admin", false), "dashboard.ver")).toBe(false);
  });

  it("canAny y canAll combinan permisos", () => {
    const operario = user("operario");

    expect(canAny(operario, ["clientes.eliminar", "clientes.editar"])).toBe(
      true,
    );
    expect(canAll(operario, ["clientes.editar", "clientes.eliminar"])).toBe(
      false,
    );
  });

  it("expone la matriz de roles por permiso", () => {
    expect(rolesFor("clientes.eliminar")).toEqual(["admin"]);
  });
});
