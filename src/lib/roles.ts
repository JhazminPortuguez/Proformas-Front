import type { Rol } from "@/lib/api/types";

export const ROLE_LABELS: Record<Rol, string> = {
  admin: "Administrador",
  operario: "Operario",
  cliente: "Cliente",
};

export const ROLE_DESCRIPTIONS: Record<Rol, string> = {
  admin: "Acceso total al backoffice y a la administración de usuarios.",
  operario: "Operación diaria: clientes, proformas y órdenes.",
  cliente: "Portal del cliente y catálogo de servicios.",
};

export function homePathFor(rol: Rol): string {
  return rol === "cliente" ? "/portal" : "/dashboard";
}

export function isStaff(rol: Rol): boolean {
  return rol === "admin" || rol === "operario";
}
