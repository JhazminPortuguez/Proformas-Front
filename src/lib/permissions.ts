import type { OrdenAccion, Rol, User } from "@/lib/api/types";

/**
 * Permisos de la interfaz. No reemplazan las policies del backend: solo
 * evitan mostrar acciones que el servidor va a rechazar.
 *
 * Regla del MVP: admin es superconjunto del operario; solo admin elimina,
 * gestiona usuarios/configuración y anula pagos.
 */
export type Permission =
  | "dashboard.ver"
  | "clientes.ver"
  | "clientes.crear"
  | "clientes.editar"
  | "clientes.eliminar"
  | "servicios.ver"
  | "servicios.gestionar"
  | "servicios.eliminar"
  | "proformas.ver"
  | "proformas.crear"
  | "proformas.editar"
  | "proformas.enviar"
  | "proformas.aceptar"
  | "proformas.rechazar"
  | "proformas.eliminar"
  | "solicitudes.gestionar"
  | "ordenes.ver"
  | "ordenes.crear"
  | "ordenes.asignar"
  | "ordenes.avanzar"
  | "ordenes.cancelar"
  | "ordenes.cerrar"
  | "inventario.ver"
  | "inventario.consumir"
  | "inventario.ajustar"
  | "cobros.ver"
  | "pagos.registrar"
  | "pagos.anular"
  | "reportes.ver"
  | "usuarios.ver"
  | "usuarios.gestionar"
  | "configuracion.gestionar"
  | "portal.ver";

const ROLES_POR_PERMISO: Record<Permission, readonly Rol[]> = {
  "dashboard.ver": ["admin", "operario"],
  "clientes.ver": ["admin", "operario"],
  "clientes.crear": ["admin", "operario"],
  "clientes.editar": ["admin", "operario"],
  "clientes.eliminar": ["admin"],
  "servicios.ver": ["admin", "operario"],
  "servicios.gestionar": ["admin"],
  "servicios.eliminar": ["admin"],
  "proformas.ver": ["admin", "operario"],
  "proformas.crear": ["admin", "operario"],
  "proformas.editar": ["admin", "operario"],
  "proformas.enviar": ["admin", "operario"],
  "proformas.aceptar": ["admin", "operario"],
  "proformas.rechazar": ["admin", "operario"],
  "proformas.eliminar": ["admin"],
  "solicitudes.gestionar": ["admin", "operario"],
  "ordenes.ver": ["admin", "operario"],
  "ordenes.crear": ["admin", "operario"],
  "ordenes.asignar": ["admin", "operario"],
  "ordenes.avanzar": ["admin", "operario"],
  "ordenes.cancelar": ["admin"],
  "ordenes.cerrar": ["admin"],
  "inventario.ver": ["admin", "operario"],
  "inventario.consumir": ["admin", "operario"],
  "inventario.ajustar": ["admin"],
  "cobros.ver": ["admin", "operario"],
  "pagos.registrar": ["admin", "operario"],
  "pagos.anular": ["admin"],
  "reportes.ver": ["admin", "operario"],
  "usuarios.ver": ["admin"],
  "usuarios.gestionar": ["admin"],
  "configuracion.gestionar": ["admin"],
  "portal.ver": ["cliente"],
};

interface PermissionSubject {
  rol: Rol;
  activo?: boolean;
}

/** Un usuario inactivo no puede hacer nada, aunque su rol lo permita. */
export function can(
  user: User | PermissionSubject | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;

  if (user.activo === false) return false;

  const allowed = ROLES_POR_PERMISO[permission];

  return allowed ? allowed.includes(user.rol) : false;
}

export function canAny(
  user: User | PermissionSubject | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => can(user, permission));
}

export function canAll(
  user: User | PermissionSubject | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => can(user, permission));
}

/** Utilidad para pruebas y documentación de la matriz de permisos. */
export function rolesFor(permission: Permission): readonly Rol[] {
  return ROLES_POR_PERMISO[permission] ?? [];
}

/**
 * Permiso de UI asociado a cada acción de una orden. El backend manda con
 * `acciones_disponibles`; esto solo evita ofrecer una acción que la policy va a
 * rechazar.
 */
export const PERMISO_ACCION_ORDEN: Record<OrdenAccion, Permission> = {
  ver: "ordenes.ver",
  asignar: "ordenes.asignar",
  iniciar: "ordenes.avanzar",
  finalizar: "ordenes.avanzar",
  cancelar: "ordenes.cancelar",
  cerrar: "ordenes.cerrar",
  consumir: "inventario.consumir",
  ver_cobro: "cobros.ver",
};

export function canAccionOrden(
  user: User | PermissionSubject | null | undefined,
  accion: OrdenAccion,
): boolean {
  return can(user, PERMISO_ACCION_ORDEN[accion]);
}
