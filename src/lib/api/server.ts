import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  apiErrorFromResponse,
  NETWORK_ERROR_MESSAGE,
  type ApiErrorBody,
} from "./errors";
import { ApiError } from "./types";
import type {
  Cliente,
  ClienteEstado,
  ClienteResumen,
  CxCResumen,
  CuentaPorCobrar,
  DashboardData,
  EstadoCobro,
  EstadoOrden,
  EstadoProforma,
  HistorialServicio,
  InventarioResumen,
  MovimientoInventario,
  Orden,
  Paginated,
  Producto,
  Proforma,
  Rol,
  Servicio,
  Solicitud,
  TipoMovimientoInventario,
  User,
} from "./types";
import { buildQuery } from "@/lib/utils";

const API_URL = (process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

const API_PREFIX = "/api/v1";
const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Lectura server-side contra Laravel reenviando la cookie de sesión.
 * Nunca se cachea: cada request depende del usuario autenticado.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (cookie) headers.set("Cookie", cookie);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${API_PREFIX}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json().catch(() => null)) as
    | (T & ApiErrorBody)
    | null;

  if (!response.ok) {
    throw apiErrorFromResponse(response.status, body);
  }

  return body as T;
}

async function requestOrNull<T>(path: string): Promise<T | null> {
  try {
    return await request<T>(path);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }

    throw error;
  }
}

/**
 * Usuario de la sesión actual (DAL). `cache` evita repetir la llamada cuando el
 * layout y la página necesitan el mismo dato en un solo render.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies();

  if (cookieStore.size === 0) return null;

  return requestOrNull<User>("/auth/me");
});

/**
 * Guard autoritativo del backoffice. Redirige cuando no hay sesión o cuando el
 * rol no corresponde. Debe llamarse dentro de un boundary de Suspense porque
 * lee cookies.
 */
export async function requireUser(roles?: Rol[]): Promise<User> {
  const user = await getSessionUser();

  if (!user || !user.activo) {
    redirect("/login");
  }

  if (user.rol === "cliente") {
    redirect("/portal");
  }

  if (roles && !roles.includes(user.rol)) {
    redirect("/dashboard");
  }

  return user;
}

/** Guard del portal del cliente. */
export async function requireCliente(): Promise<User> {
  const user = await getSessionUser();

  if (!user || !user.activo) {
    redirect("/login");
  }

  if (user.rol !== "cliente") {
    redirect("/dashboard");
  }

  return user;
}

export function getDashboard(): Promise<DashboardData> {
  return request<DashboardData>("/dashboard");
}

export interface ListarClientesParams {
  search?: string;
  estado?: ClienteEstado | "";
  page?: number;
  perPage?: number;
}

export function getClientes({
  search,
  estado,
  page = 1,
  perPage = 10,
}: ListarClientesParams = {}): Promise<Paginated<Cliente>> {
  const query = buildQuery({ search, estado, page, per_page: perPage });

  return request<Paginated<Cliente>>(`/clientes${query}`);
}

/**
 * Ficha del cliente. El detalle puede venir plano o dentro de `data`; se tolera
 * la segunda forma por consistencia con el resto de recursos.
 */
export async function getCliente(id: number): Promise<Cliente> {
  const body = await request<Cliente | { data: Cliente }>(`/clientes/${id}`);

  if (body && typeof body === "object" && "data" in body) {
    return body.data;
  }

  return body as Cliente;
}

/** Agregados de la ficha: proformas, órdenes, cobros y servicios. */
export function getClienteResumen(id: number): Promise<ClienteResumen> {
  return request<ClienteResumen>(`/clientes/${id}/resumen`);
}

export interface ListarHistorialServiciosParams {
  clienteId: number;
  page?: number;
  perPage?: number;
}

/** Servicios ejecutados para el cliente, paginados por línea de orden. */
export function getHistorialServicios({
  clienteId,
  page = 1,
  perPage = 15,
}: ListarHistorialServiciosParams): Promise<Paginated<HistorialServicio>> {
  const query = buildQuery({ page, per_page: perPage });

  return request<Paginated<HistorialServicio>>(
    `/clientes/${clienteId}/servicios${query}`,
  );
}

export interface ListarServiciosParams {
  search?: string;
  activo?: boolean | "";
  visible_catalogo?: boolean | "";
  page?: number;
  perPage?: number;
}

export function getServicios({
  search,
  activo,
  visible_catalogo,
  page = 1,
  perPage = 10,
}: ListarServiciosParams = {}): Promise<Paginated<Servicio>> {
  const query = buildQuery({
    search,
    activo: typeof activo === "boolean" ? (activo ? 1 : 0) : "",
    visible_catalogo:
      typeof visible_catalogo === "boolean" ? (visible_catalogo ? 1 : 0) : "",
    page,
    per_page: perPage,
  });

  return request<Paginated<Servicio>>(`/servicios${query}`);
}

export interface ListarProformasParams {
  search?: string;
  estado?: EstadoProforma | "";
  clienteId?: number | "";
  desde?: string;
  hasta?: string;
  page?: number;
  perPage?: number;
}

export function getProformas({
  search,
  estado,
  clienteId,
  desde,
  hasta,
  page = 1,
  perPage = 10,
}: ListarProformasParams = {}): Promise<Paginated<Proforma>> {
  const query = buildQuery({
    search,
    estado,
    cliente_id: clienteId,
    desde,
    hasta,
    page,
    per_page: perPage,
  });

  return request<Paginated<Proforma>>(`/proformas${query}`);
}

/**
 * El detalle puede venir como recurso plano o envuelto en `data`; el contrato
 * actual es plano, pero tolerar ambas formas evita romper la pantalla si el
 * backend estandariza recursos más adelante.
 */
export async function getProforma(id: number): Promise<Proforma> {
  const body = await request<Proforma | { data: Proforma }>(`/proformas/${id}`);

  if (body && typeof body === "object" && "data" in body) {
    return body.data;
  }

  return body as Proforma;
}

export interface ListarProductosParams {
  search?: string;
  activo?: boolean | "";
  page?: number;
  perPage?: number;
}

export function getProductos({
  search,
  activo,
  page = 1,
  perPage = 10,
}: ListarProductosParams = {}): Promise<Paginated<Producto>> {
  const query = buildQuery({
    search,
    activo: typeof activo === "boolean" ? (activo ? 1 : 0) : "",
    page,
    per_page: perPage,
  });

  return request<Paginated<Producto>>(`/productos${query}`);
}

/* -------------------------------------------------------------------------- */
/* Inventario                                                                 */
/* -------------------------------------------------------------------------- */

export interface ListarInventarioParams {
  search?: string;
  bajoStock?: boolean | "";
  activo?: boolean | "";
  page?: number;
  perPage?: number;
}

export function getInventario({
  search,
  bajoStock,
  activo,
  page = 1,
  perPage = 10,
}: ListarInventarioParams = {}): Promise<Paginated<Producto>> {
  const query = buildQuery({
    search,
    bajo_stock: typeof bajoStock === "boolean" ? (bajoStock ? 1 : 0) : "",
    activo: typeof activo === "boolean" ? (activo ? 1 : 0) : "",
    page,
    per_page: perPage,
  });

  return request<Paginated<Producto>>(`/inventario${query}`);
}

export function getInventarioResumen(): Promise<InventarioResumen> {
  return request<InventarioResumen>("/inventario/resumen");
}

export interface ListarMovimientosInventarioParams {
  search?: string;
  productoId?: number | "";
  tipo?: TipoMovimientoInventario | "";
  ordenId?: number | "";
  desde?: string;
  hasta?: string;
  page?: number;
  perPage?: number;
}

export function getMovimientosInventario({
  search,
  productoId,
  tipo,
  ordenId,
  desde,
  hasta,
  page = 1,
  perPage = 15,
}: ListarMovimientosInventarioParams = {}): Promise<
  Paginated<MovimientoInventario>
> {
  const query = buildQuery({
    search,
    producto_id: productoId,
    tipo,
    orden_id: ordenId,
    desde,
    hasta,
    page,
    per_page: perPage,
  });

  return request<Paginated<MovimientoInventario>>(
    `/inventario/movimientos${query}`,
  );
}

export interface ListarSolicitudesParams {
  search?: string;
  estado?: string;
  clienteId?: number | "";
  page?: number;
  perPage?: number;
}

export function getSolicitudes({
  search,
  estado,
  clienteId,
  page = 1,
  perPage = 10,
}: ListarSolicitudesParams = {}): Promise<Paginated<Solicitud>> {
  const query = buildQuery({
    search,
    estado,
    cliente_id: clienteId,
    page,
    per_page: perPage,
  });

  return request<Paginated<Solicitud>>(`/solicitudes${query}`);
}

export interface ListarUsuariosParams {
  search?: string;
  rol?: Rol | "";
  activo?: boolean | "";
  page?: number;
  perPage?: number;
}

export function getUsuarios({
  search,
  rol,
  activo,
  page = 1,
  perPage = 10,
}: ListarUsuariosParams = {}): Promise<Paginated<User>> {
  const query = buildQuery({
    search,
    rol,
    activo: typeof activo === "boolean" ? (activo ? 1 : 0) : "",
    page,
    per_page: perPage,
  });

  return request<Paginated<User>>(`/users${query}`);
}

export interface ListarOrdenesParams {
  search?: string;
  estado?: EstadoOrden | "";
  operarioId?: number | "";
  clienteId?: number | "";
  page?: number;
  perPage?: number;
}

export function getOrdenes({
  search,
  estado,
  operarioId,
  clienteId,
  page = 1,
  perPage = 15,
}: ListarOrdenesParams = {}): Promise<Paginated<Orden>> {
  const query = buildQuery({
    search,
    estado,
    operario_id: operarioId,
    cliente_id: clienteId,
    page,
    per_page: perPage,
  });

  return request<Paginated<Orden>>(`/ordenes${query}`);
}

/**
 * El detalle puede venir como recurso plano o envuelto en `data` (mismo criterio
 * tolerante que `getProforma`).
 */
export async function getOrden(id: number): Promise<Orden> {
  const body = await request<Orden | { data: Orden }>(`/ordenes/${id}`);

  if (body && typeof body === "object" && "data" in body) {
    return body.data;
  }

  return body as Orden;
}

/* -------------------------------------------------------------------------- */
/* Cuentas por cobrar                                                         */
/* -------------------------------------------------------------------------- */

export interface ListarCuentasPorCobrarParams {
  search?: string;
  estado?: EstadoCobro | "";
  /** `true` agrega `vencida=1`; el backend resuelve el vencimiento. */
  vencida?: boolean;
  clienteId?: number | "";
  /** Rango de vencimiento (fechas date-only). */
  desde?: string;
  hasta?: string;
  page?: number;
  perPage?: number;
}

export function getCuentasPorCobrar({
  search,
  estado,
  vencida,
  clienteId,
  desde,
  hasta,
  page = 1,
  perPage = 15,
}: ListarCuentasPorCobrarParams = {}): Promise<Paginated<CuentaPorCobrar>> {
  const query = buildQuery({
    search,
    estado_cobro: estado,
    vencida: vencida ? 1 : "",
    cliente_id: clienteId,
    desde,
    hasta,
    page,
    per_page: perPage,
  });

  return request<Paginated<CuentaPorCobrar>>(`/cuentas-por-cobrar${query}`);
}

export function getCxCResumen(): Promise<CxCResumen> {
  return request<CxCResumen>("/cuentas-por-cobrar/resumen");
}

/** Mismo criterio tolerante de detalle que `getOrden` y `getProforma`. */
export async function getCuentaPorCobrar(id: number): Promise<CuentaPorCobrar> {
  const body = await request<CuentaPorCobrar | { data: CuentaPorCobrar }>(
    `/cuentas-por-cobrar/${id}`,
  );

  if (body && typeof body === "object" && "data" in body) {
    return body.data;
  }

  return body as CuentaPorCobrar;
}
