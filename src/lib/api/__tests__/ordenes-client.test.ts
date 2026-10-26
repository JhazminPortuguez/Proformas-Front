import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ordenes } from "@/lib/api/client";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const ORDEN = {
  id: 9,
  empresa_id: 1,
  numero: "ORD-000009",
  proforma_id: 12,
  cliente_id: 3,
  operario_id: 2,
  estado: "ASIGNADA",
  fecha_programada: "2026-11-01",
  fecha_inicio: null,
  fecha_fin: null,
  observaciones: null,
  motivo_cancelacion: null,
  cancelada_at: null,
  cerrada_at: null,
  cerrada_por: null,
  created_by: 1,
  updated_by: 1,
} as const;

function lastBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  return JSON.parse(
    String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
  );
}

describe("api client de órdenes", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "XSRF-TOKEN=csrf-token";
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("crea una orden y desenvuelve el sobre data", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { data: ORDEN }));

    const created = await ordenes.create({
      proforma_id: 12,
      operario_id: 2,
      fecha_programada: "2026-11-01",
      observaciones: "Llevar escalera",
    });

    expect(created.numero).toBe("ORD-000009");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/ordenes");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(lastBody(fetchMock)).toEqual({
      proforma_id: 12,
      operario_id: 2,
      fecha_programada: "2026-11-01",
      observaciones: "Llevar escalera",
    });
  });

  it("asigna un operario", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: ORDEN }));

    await ordenes.asignar(9, 2);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/ordenes/9/asignar");
    expect(lastBody(fetchMock)).toEqual({ operario_id: 2 });
  });

  it("inicia sin observaciones enviando un cuerpo vacío", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, ORDEN));

    await ordenes.iniciar(9);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/ordenes/9/iniciar");
    expect(lastBody(fetchMock)).toEqual({});
  });

  it("finaliza con observaciones cuando se escriben", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, ORDEN));

    await ordenes.finalizar(9, "Trabajo terminado");

    expect(lastBody(fetchMock)).toEqual({ observaciones: "Trabajo terminado" });
  });

  it("cancela con motivo obligatorio", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, ORDEN));

    await ordenes.cancelar(9, "El cliente suspendió la obra");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/ordenes/9/cancelar");
    expect(lastBody(fetchMock)).toEqual({
      motivo: "El cliente suspendió la obra",
    });
  });

  it("cierra la orden con un cuerpo vacío", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: ORDEN }));

    const closed = await ordenes.cerrar(9);

    expect(closed.id).toBe(9);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/ordenes/9/cerrar");
    expect(lastBody(fetchMock)).toEqual({});
  });
});
