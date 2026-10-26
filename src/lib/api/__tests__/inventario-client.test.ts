import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inventario, ordenes } from "@/lib/api/client";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const MOVIMIENTO = {
  id: 44,
  producto_id: 5,
  orden_id: 9,
  orden_item_id: 3,
  tipo: "CONSUMO",
  cantidad: -2,
  costo_unitario: 8,
  stock_anterior: 10,
  stock_nuevo: 8,
  motivo: "Consumo de orden ORD-000009",
  created_at: "2026-10-25T14:30:00Z",
} as const;

function lastBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  return JSON.parse(
    String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
  );
}

describe("api client de inventario", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "XSRF-TOKEN=csrf-token";
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registra una entrada de stock", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, MOVIMIENTO));

    const movimiento = await inventario.entrada({
      producto_id: 5,
      cantidad: 4,
      costo_unitario: 9.5,
      motivo: "Compra",
    });

    expect(movimiento.id).toBe(44);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/inventario/entradas");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(lastBody(fetchMock)).toEqual({
      producto_id: 5,
      cantidad: 4,
      costo_unitario: 9.5,
      motivo: "Compra",
    });
  });

  it("registra un ajuste con el motivo obligatorio", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, MOVIMIENTO));

    await inventario.ajuste({
      producto_id: 5,
      stock_nuevo: 12,
      motivo: "Conteo físico",
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/inventario/ajustes");
    expect(lastBody(fetchMock)).toEqual({
      producto_id: 5,
      stock_nuevo: 12,
      motivo: "Conteo físico",
    });
  });

  it("consume materiales con las cantidades explícitas", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: { id: 9 } }));

    await ordenes.consumir(9, [{ orden_item_id: 3, cantidad: 2 }]);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/ordenes/9/consumir");
    expect(lastBody(fetchMock)).toEqual({
      items: [{ orden_item_id: 3, cantidad: 2 }],
    });
  });

  it("consume todos los pendientes cuando no se envían items", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: { id: 9 } }));

    await ordenes.consumir(9);

    expect(lastBody(fetchMock)).toEqual({});
  });
});
