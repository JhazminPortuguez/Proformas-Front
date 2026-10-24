import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "./types";
import type {
  Cliente,
  ClienteEstado,
  DashboardData,
  Paginated,
  Rol,
  Servicio,
  User,
} from "./types";
import { buildQuery } from "@/lib/utils";

const API_URL = (process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

const API_PREFIX = "/api/v1";
const REQUEST_TIMEOUT_MS = 8_000;

const STATUS_MESSAGES: Record<number, string> = {
  401: "Tu sesión expiró.",
  403: "No tienes permisos para ver esta información.",
  404: "No encontramos la información solicitada.",
  419: "Tu sesión expiró.",
  422: "Revisa los datos enviados.",
  429: "Demasiadas solicitudes. Intenta en unos segundos.",
  500: "La API tuvo un problema. Intenta nuevamente.",
};

interface ErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

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
    throw new ApiError(
      "No pudimos conectar con el servidor. Intenta nuevamente.",
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json().catch(() => null)) as
    | (T & ErrorBody)
    | null;

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? STATUS_MESSAGES[response.status] ?? "Error inesperado.",
      response.status,
      body?.errors,
    );
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

export interface ListarUsuariosParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export function getUsuarios({
  search,
  page = 1,
  perPage = 10,
}: ListarUsuariosParams = {}): Promise<Paginated<User>> {
  const query = buildQuery({ search, page, per_page: perPage });

  return request<Paginated<User>>(`/users${query}`);
}
