import "client-only";

import { ApiError } from "./types";
import type {
  Cliente,
  ClienteInput,
  ErroresValidacion,
  RegistroInput,
  Servicio,
  ServicioInput,
  User,
  UsuarioInput,
} from "./types";

const BASE = "/api/v1";
const CSRF_ENDPOINT = "/sanctum/csrf-cookie";
const REQUEST_TIMEOUT_MS = 15_000;
const CSRF_TIMEOUT_MS = 10_000;

const STATUS_MESSAGES: Record<number, string> = {
  401: "Tu sesión expiró. Vuelve a ingresar.",
  403: "No tienes permisos para realizar esta acción.",
  404: "El recurso solicitado no existe.",
  409: "La operación entra en conflicto con datos existentes.",
  419: "Tu sesión expiró. Intenta nuevamente.",
  422: "Revisa los datos ingresados.",
  429: "Demasiados intentos. Espera un momento.",
  500: "Ocurrió un error en el servidor.",
};

interface ErrorBody {
  message?: string;
  errors?: ErroresValidacion;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

/** Laravel exige cookie CSRF antes de cualquier POST (Sanctum SPA). */
async function ensureCsrfCookie(): Promise<void> {
  let response: Response;

  try {
    response = await fetch(CSRF_ENDPOINT, {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(CSRF_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError("No pudimos conectar con el servidor.", 0);
  }

  if (!response.ok) {
    throw new ApiError(
      "No pudimos iniciar la sesión segura.",
      response.status,
    );
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  reintentado = false,
): Promise<T> {
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");

  const xsrfToken = readCookie("XSRF-TOKEN");
  if (xsrfToken) headers.set("X-XSRF-TOKEN", xsrfToken);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError("No pudimos conectar con el servidor.", 0);
  }

  // El token CSRF caduca: se renueva una vez y se reintenta.
  if (response.status === 419 && !reintentado) {
    await ensureCsrfCookie();

    return request<T>(path, init, true);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json().catch(() => null)) as
    | (T & ErrorBody)
    | null;

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? STATUS_MESSAGES[response.status] ?? `Error ${response.status}`,
      response.status,
      body?.errors,
    );
  }

  return body as T;
}

function jsonBody(payload: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(payload) };
}

export const auth = {
  async login(email: string, password: string): Promise<User> {
    await ensureCsrfCookie();

    return request<User>("/auth/login", jsonBody({ email, password }));
  },

  async register(payload: RegistroInput): Promise<User> {
    await ensureCsrfCookie();

    return request<User>("/auth/register", jsonBody(payload));
  },

  async logout(): Promise<void> {
    await request<void>("/auth/logout", { method: "POST" });
  },

  me(signal?: AbortSignal): Promise<User> {
    return request<User>("/auth/me", { signal });
  },
};

export const clientes = {
  create(payload: ClienteInput): Promise<Cliente> {
    return request<Cliente>("/clientes", jsonBody(payload));
  },

  update(id: number, payload: ClienteInput): Promise<Cliente> {
    return request<Cliente>(`/clientes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(id: number): Promise<void> {
    return request<void>(`/clientes/${id}`, { method: "DELETE" });
  },
};

export const servicios = {
  create(payload: ServicioInput): Promise<Servicio> {
    return request<Servicio>("/servicios", jsonBody(payload));
  },

  update(id: number, payload: ServicioInput): Promise<Servicio> {
    return request<Servicio>(`/servicios/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(id: number): Promise<void> {
    return request<void>(`/servicios/${id}`, { method: "DELETE" });
  },
};

export const usuarios = {
  create(payload: UsuarioInput): Promise<User> {
    return request<User>("/users", jsonBody(payload));
  },

  update(id: number, payload: UsuarioInput): Promise<User> {
    return request<User>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(id: number): Promise<void> {
    return request<void>(`/users/${id}`, { method: "DELETE" });
  },
};

/** Pide la cookie CSRF antes de un formulario de login/registro. */
export { ensureCsrfCookie };
