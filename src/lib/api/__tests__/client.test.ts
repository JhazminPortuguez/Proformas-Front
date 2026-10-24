import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth, clientes } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function noContent(status = 204): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Response;
}

const USER = {
  id: 7,
  name: "Ana Admin",
  email: "ana@example.com",
  rol: "admin",
  activo: true,
  cliente_id: null,
  empresa_id: 1,
};

describe("api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "XSRF-TOKEN=csrf-token";
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mapea un 401 a ApiError con status y mensaje", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: "No autenticado." }),
    );

    await expect(auth.me()).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "No autenticado.",
    });
  });

  it("mapea los errores 422 por campo", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, {
        message: "Los datos son inválidos.",
        errors: { nombre_razon: ["El nombre es obligatorio."] },
      }),
    );

    const error = await clientes
      .create({ nombre_razon: "", estado: "prospecto" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).errors?.nombre_razon).toEqual([
      "El nombre es obligatorio.",
    ]);
  });

  it("renueva el CSRF y reintenta una vez cuando recibe 419", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(419, { message: "CSRF token mismatch" }))
      .mockResolvedValueOnce(noContent(204))
      .mockResolvedValueOnce(noContent(204));

    await expect(clientes.remove(1)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/clientes/1");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/sanctum/csrf-cookie");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/v1/clientes/1");
  });

  it("pide la cookie CSRF antes de iniciar sesión", async () => {
    fetchMock
      .mockResolvedValueOnce(noContent(204))
      .mockResolvedValueOnce(jsonResponse(200, USER));

    const user = await auth.login("ana@example.com", "secreto123");

    expect(user.rol).toBe("admin");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/sanctum/csrf-cookie");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/auth/login");
  });

  it("devuelve undefined en un 204 (logout)", async () => {
    fetchMock.mockResolvedValueOnce(noContent(204));

    await expect(auth.logout()).resolves.toBeUndefined();
  });

  it("convierte un fallo de red en ApiError status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));

    await expect(auth.me()).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      message: "No pudimos conectar con el servidor.",
    });
  });
});
