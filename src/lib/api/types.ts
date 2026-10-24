export type Rol = "admin" | "operario" | "cliente";

export interface User {
  id: number;
  name: string;
  email: string;
  rol: Rol;
  activo: boolean;
  cliente_id: number | null;
  empresa_id: number | null;
}

export type ClienteEstado = "prospecto" | "activo" | "inactivo";

export interface Cliente {
  id: number;
  nombre_razon: string;
  nit_ci: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  estado: ClienteEstado;
  proformas_count?: number;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_base: number;
  duracion_estimada_min: number | null;
  categoria: string | null;
  activo: boolean;
  visible_catalogo: boolean;
}

/** El backend todavía no fija el esquema de actividad: se renderiza de forma defensiva. */
export interface ActividadReciente {
  id?: number | string;
  tipo?: string;
  titulo?: string;
  descripcion?: string;
  mensaje?: string;
  usuario?: string;
  created_at?: string;
  fecha?: string;
}

export interface DashboardData {
  clientes: number;
  servicios: number;
  proformas: number;
  proformas_por_estado: Record<string, number>;
  monto_proformas_mes: number;
  actividad_reciente: ActividadReciente[];
  ordenes_pendientes: number | null;
  saldo_por_cobrar: number | null;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export type ErroresValidacion = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly errors?: ErroresValidacion;

  constructor(message: string, status: number, errors?: ErroresValidacion) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isUnauthorized(error: unknown): boolean {
  return isApiError(error) && (error.status === 401 || error.status === 419);
}

export function isForbidden(error: unknown): boolean {
  return isApiError(error) && error.status === 403;
}

export function errorMessage(
  error: unknown,
  fallback = "No se pudo completar la operación.",
): string {
  if (isApiError(error)) {
    return error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export interface ClienteInput {
  nombre_razon: string;
  nit_ci?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  estado: ClienteEstado;
}

export interface ServicioInput {
  nombre: string;
  descripcion?: string | null;
  precio_base: number;
  duracion_estimada_min?: number | null;
  categoria?: string | null;
  activo: boolean;
  visible_catalogo: boolean;
}

export interface UsuarioInput {
  name?: string;
  email?: string;
  rol?: Rol;
  activo?: boolean;
  password?: string;
  password_confirmation?: string;
}

export interface RegistroInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  telefono?: string;
}
