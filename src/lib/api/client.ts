import "client-only";

import {
  apiErrorFromResponse,
  NETWORK_ERROR_MESSAGE,
  type ApiErrorBody,
} from "./errors";
import { ApiError } from "./types";
import type {
  AjusteInventarioInput,
  Cliente,
  ClienteInput,
  ConsumoOrdenItemInput,
  CuentaPorCobrar,
  EntradaInventarioInput,
  MovimientoInventario,
  Orden,
  OrdenInput,
  PagoCuentaInput,
  Proforma,
  ProformaInput,
  RegistroInput,
  Servicio,
  ServicioInput,
  Solicitud,
  SolicitudInput,
  User,
  UsuarioInput,
} from "./types";

const BASE = "/api/v1";
const CSRF_ENDPOINT = "/sanctum/csrf-cookie";
const REQUEST_TIMEOUT_MS = 15_000;
const CSRF_TIMEOUT_MS = 10_000;

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
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }

  if (!response.ok) {
    throw apiErrorFromResponse(
      response.status,
      null,
      "No pudimos iniciar la sesión segura. Intenta nuevamente.",
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

    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
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
    | (T & ApiErrorBody)
    | null;

  if (!response.ok) {
    throw apiErrorFromResponse(response.status, body);
  }

  return body as T;
}

function jsonBody(payload: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(payload) };
}

/** Acepta un recurso plano (`Proforma`) o el sobre `{ data }` de Laravel. */
function unwrapResource<T>(body: T | { data: T }): T {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }

  return body as T;
}

/** URL same-origin del PDF: se usa siempre en un `<a href>`. */
export { proformaPdfUrl } from "./paths";

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

export const proformas = {
  async create(payload: ProformaInput): Promise<Proforma> {
    const body = await request<Proforma | { data: Proforma }>(
      "/proformas",
      jsonBody(payload),
    );

    return unwrapResource(body);
  },

  async update(id: number, payload: ProformaInput): Promise<Proforma> {
    const body = await request<Proforma | { data: Proforma }>(
      `/proformas/${id}`,
      { method: "PUT", body: JSON.stringify(payload) },
    );

    return unwrapResource(body);
  },

  remove(id: number): Promise<void> {
    return request<void>(`/proformas/${id}`, { method: "DELETE" });
  },

  enviar(id: number): Promise<Proforma> {
    return request<Proforma>(`/proformas/${id}/enviar`, { method: "POST" });
  },

  aceptar(id: number): Promise<Proforma> {
    return request<Proforma>(`/proformas/${id}/aceptar`, { method: "POST" });
  },

  rechazar(id: number, motivo: string): Promise<Proforma> {
    return request<Proforma>(
      `/proformas/${id}/rechazar`,
      jsonBody({ motivo }),
    );
  },
};

export const solicitudes = {
  async create(payload: SolicitudInput): Promise<Solicitud> {
    const body = await request<Solicitud | { data: Solicitud }>(
      "/solicitudes",
      jsonBody(payload),
    );

    return unwrapResource(body);
  },

  async convertir(id: number): Promise<Proforma> {
    const body = await request<Proforma | { data: Proforma }>(
      `/solicitudes/${id}/convertir`,
      { method: "POST" },
    );

    return unwrapResource(body);
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

export const ordenes = {
  async create(payload: OrdenInput): Promise<Orden> {
    const body = await request<Orden | { data: Orden }>(
      "/ordenes",
      jsonBody(payload),
    );

    return unwrapResource(body);
  },

  async asignar(id: number, operarioId: number): Promise<Orden> {
    const body = await request<Orden | { data: Orden }>(
      `/ordenes/${id}/asignar`,
      jsonBody({ operario_id: operarioId }),
    );

    return unwrapResource(body);
  },

  async iniciar(id: number, observaciones?: string): Promise<Orden> {
    const body = await request<Orden | { data: Orden }>(
      `/ordenes/${id}/iniciar`,
      jsonBody(observaciones?.trim() ? { observaciones } : {}),
    );

    return unwrapResource(body);
  },

  async finalizar(id: number, observaciones?: string): Promise<Orden> {
    const body = await request<Orden | { data: Orden }>(
      `/ordenes/${id}/finalizar`,
      jsonBody(observaciones?.trim() ? { observaciones } : {}),
    );

    return unwrapResource(body);
  },

  async cancelar(id: number, motivo: string): Promise<Orden> {
    const body = await request<Orden | { data: Orden }>(
      `/ordenes/${id}/cancelar`,
      jsonBody({ motivo }),
    );

    return unwrapResource(body);
  },

  async cerrar(id: number): Promise<Orden> {
    const body = await request<Orden | { data: Orden }>(
      `/ordenes/${id}/cerrar`,
      jsonBody({}),
    );

    return unwrapResource(body);
  },

  /**
   * Consume materiales de la orden. Sin `items`, el backend consume todos los
   * pendientes; la UI manda las cantidades explícitas del diálogo.
   */
  async consumir(
    id: number,
    items?: readonly ConsumoOrdenItemInput[],
  ): Promise<Orden> {
    const body = await request<Orden | { data: Orden }>(
      `/ordenes/${id}/consumir`,
      jsonBody(items && items.length > 0 ? { items } : {}),
    );

    return unwrapResource(body);
  },
};

/** Cobros: pagos de una cuenta por cobrar (CxC). */
export const cuentas = {
  /** Registra un pago y devuelve la cuenta actualizada con sus pagos. */
  async registrarPago(
    id: number,
    payload: PagoCuentaInput,
  ): Promise<CuentaPorCobrar> {
    const body = await request<CuentaPorCobrar | { data: CuentaPorCobrar }>(
      `/cuentas-por-cobrar/${id}/pagos`,
      jsonBody(payload),
    );

    return unwrapResource(body);
  },
};

export const pagos = {
  /** Anula un pago (solo admin). Devuelve la cuenta actualizada. */
  async anular(pagoId: number, motivo: string): Promise<CuentaPorCobrar> {
    const body = await request<CuentaPorCobrar | { data: CuentaPorCobrar }>(
      `/pagos-cuenta/${pagoId}/anular`,
      jsonBody({ motivo }),
    );

    return unwrapResource(body);
  },
};

export const inventario = {
  /** Registra una entrada de stock y devuelve el movimiento creado. */
  async entrada(
    payload: EntradaInventarioInput,
  ): Promise<MovimientoInventario> {
    const body = await request<
      MovimientoInventario | { data: MovimientoInventario }
    >("/inventario/entradas", jsonBody(payload));

    return unwrapResource(body);
  },

  /** Fija el stock a un valor absoluto dejando el motivo en el historial. */
  async ajuste(
    payload: AjusteInventarioInput,
  ): Promise<MovimientoInventario> {
    const body = await request<
      MovimientoInventario | { data: MovimientoInventario }
    >("/inventario/ajustes", jsonBody(payload));

    return unwrapResource(body);
  },
};

/** Pide la cookie CSRF antes de un formulario de login/registro. */
export { ensureCsrfCookie };
