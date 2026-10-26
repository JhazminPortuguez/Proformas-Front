import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  proformaPdfUrl,
  proformas,
  solicitudes,
} from "@/lib/api/client";
import type { ProformaInput } from "@/lib/api/types";

function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const PROFORMA = {
  id: 12,
  numero: "PRF-000012",
  cliente_id: 3,
  fecha_emision: "2026-10-25",
  fecha_validez: null,
  estado: "BORRADOR",
  moneda: "BOB",
  impuesto_tasa: 13,
  subtotal: 100,
  descuento: 0,
  impuesto: 13,
  total: 113,
  observaciones: null,
  origen: "MANUAL",
  solicitud_id: null,
  enviada_at: null,
  aceptada_at: null,
  aceptada_por: null,
  rechazada_at: null,
  motivo_rechazo: null,
  created_by: 1,
  updated_by: 1,
} as const;

const PAYLOAD: ProformaInput = {
  cliente_id: 3,
  fecha_emision: "2026-10-25",
  moneda: "BOB",
  impuesto_tasa: 13,
  descuento: 0,
  items: [
    {
      tipo: "SERVICIO",
      servicio_id: 8,
      cantidad: 1,
    },
  ],
};

describe("api client de proformas y solicitudes", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "XSRF-TOKEN=csrf-token";
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("crea una proforma y desenvuelve el sobre data", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { data: PROFORMA }));

    const created = await proformas.create(PAYLOAD);

    expect(created.numero).toBe("PRF-000012");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/proformas");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });

    const body = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
    );

    expect(body.items[0]).toMatchObject({ tipo: "SERVICIO", servicio_id: 8 });
  });

  it("actualiza con PUT al endpoint del detalle", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, PROFORMA));

    await proformas.update(12, PAYLOAD);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/proformas/12");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PUT" });
  });

  it("envía el motivo al rechazar", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, PROFORMA));

    await proformas.rechazar(12, "Precio fuera de presupuesto");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/proformas/12/rechazar",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(
      JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)),
    ).toEqual({ motivo: "Precio fuera de presupuesto" });
  });

  it("convierte una solicitud y devuelve la proforma creada", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { data: PROFORMA }));

    const converted = await solicitudes.convertir(4);

    expect(converted.id).toBe(12);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/solicitudes/4/convertir",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
  });

  it("expone la URL same-origin del PDF", () => {
    expect(proformaPdfUrl(12)).toBe("/api/v1/proformas/12/pdf");
  });
});
