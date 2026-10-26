import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cuentas, pagos } from "@/lib/api/client";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const CUENTA = {
  id: 7,
  numero: "CXC-000007",
  orden_id: 9,
  cliente_id: 3,
  fecha_emision: "2026-10-01",
  fecha_vencimiento: "2026-10-31",
  moneda: "BOB",
  monto_total: 500,
  saldo: 300,
  estado_cobro: "PARCIAL",
  vencida: false,
  dias_vencida: 0,
  total_pagado: 200,
  pagos_count: 1,
} as const;

function lastBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  return JSON.parse(
    String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
  );
}

describe("api client de cuentas por cobrar", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "XSRF-TOKEN=csrf-token";
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registra un pago y desenvuelve el sobre data", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { data: CUENTA }));

    const actualizada = await cuentas.registrarPago(7, {
      monto: 150,
      metodo: "TRANSFERENCIA",
      fecha_pago: "2026-10-20",
      referencia: "TRF-9981",
    });

    expect(actualizada.numero).toBe("CXC-000007");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/cuentas-por-cobrar/7/pagos",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(lastBody(fetchMock)).toEqual({
      monto: 150,
      metodo: "TRANSFERENCIA",
      fecha_pago: "2026-10-20",
      referencia: "TRF-9981",
    });
  });

  it("anula un pago con motivo", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: CUENTA }));

    await pagos.anular(33, "Depósito duplicado");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/pagos-cuenta/33/anular",
    );
    expect(lastBody(fetchMock)).toEqual({ motivo: "Depósito duplicado" });
  });
});
