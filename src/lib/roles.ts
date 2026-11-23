import type { Rol } from "@/lib/api/types";

export const ROLE_LABELS: Record<Rol, string> = {
  superusuario: "Superusuario",
  admin: "Administrador",
  operario: "Operario",
  cliente: "Cliente",
};

export const ROLE_DESCRIPTIONS: Record<Rol, string> = {
  superusuario: "Rol técnico: configuración, administradores y estado del sistema. No participa en la operación.",
  admin: "Todo lo del negocio; gestiona operarios y usuarios cliente.",
  operario: "Operación diaria: clientes, proformas y órdenes.",
  cliente: "Portal del cliente y catálogo de servicios.",
};

export function homePathFor(rol: Rol): string {
  if (rol === "cliente") return "/portal";

  // Ronda B: el superusuario no participa en la operación (no tiene Panel).
  if (rol === "superusuario") return "/configuracion";

  return "/dashboard";
}

/** Roles de la operación diaria (todo el backoffice salvo lo técnico). */
export const ROLES_OPERACION: Rol[] = ["admin", "operario"];

/**
 * Roles cuyos usuarios gestiona cada rol en la pantalla de Usuarios (igual
 * que `Rol::rolesQueGestiona` del back).
 */
export function rolesQueGestiona(rol: Rol): Rol[] {
  if (rol === "superusuario") return ["superusuario", "admin", "operario"];
  if (rol === "admin") return ["operario", "cliente"];

  return [];
}

/** Roles que cada uno puede dar; el de superusuario solo lo da el comando. */
export function rolesQueAsigna(rol: Rol): Rol[] {
  return rolesQueGestiona(rol).filter((opcion) => opcion !== "superusuario");
}

export function isStaff(rol: Rol): boolean {
  return rol === "admin" || rol === "operario";
}
