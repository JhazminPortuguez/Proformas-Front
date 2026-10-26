import { describe, expect, it } from "vitest";
import type { CuentaPorCobrar, PagoCuenta } from "@/lib/api/types";
import {
  accionesCuenta,
  cuentaAging,
  cuentaDiasVencida,
  cuentaEstaVencida,
  cuentaPagosCount,
  cuentaProgreso,
  cuentaSaldo,
  cuentaTotalPagado,
  cobrosHref,
  estadoCobroMeta,
  metodoPagoLabel,
  montoPagadoVigente,
  pagosVigentes,
  puedeAnularPago,
  puedeRegistrarPago,
} from "@/lib/cobros";

const CUENTA: CuentaPorCobrar = {
  id: 1,
  numero: "CXC-000001",
  orden_id: 9,
  cliente_id: 3,
  fecha_emision: "2026-09-01",
  fecha_vencimiento: "2026-09-30",
  moneda: "BOB",
  monto_total: 1000,
  saldo: 400,
  estado_cobro: "PARCIAL",
  vencida: true,
  dias_vencida: 25,
  total_pagado: 600,
  pagos_count: 2,
  acciones_disponibles: ["ver", "pagar"],
};

function pago(overrides: Partial<PagoCuenta> = {}): PagoCuenta {
  return {
    id: 10,
    cuenta_id: 1,
    monto: 200,
    metodo: "EFECTIVO",
    fecha_pago: "2026-09-15",
    referencia: null,
    observaciones: null,
    anulado: false,
    anulado_at: null,
    motivo_anulacion: null,
    ...overrides,
  };
}

describe("estados y métodos de cobro", () => {
  it("traduce el estado de cobro y tolera valores desconocidos", () => {
    expect(estadoCobroMeta("PARCIAL")).toMatchObject({
      label: "Parcial",
      tone: "accent",
    });
    expect(estadoCobroMeta("pagada").label).toBe("Pagada");
    expect(estadoCobroMeta("EN_GESTION")).toMatchObject({
      label: "En gestion",
      tone: "neutral",
    });
  });

  it("normaliza el método de pago sin importar mayúsculas", () => {
    expect(metodoPagoLabel("TRANSFERENCIA")).toBe("Transferencia");
    expect(metodoPagoLabel("transferencia")).toBe("Transferencia");
    expect(metodoPagoLabel("qr")).toBe("QR");
    expect(metodoPagoLabel("cheque")).toBe("Cheque");
  });
});

describe("saldo y avance", () => {
  it("usa los derivados del backend", () => {
    expect(cuentaSaldo(CUENTA)).toBe(400);
    expect(cuentaTotalPagado(CUENTA)).toBe(600);
    expect(cuentaPagosCount(CUENTA)).toBe(2);
    expect(cuentaProgreso(CUENTA)).toBe(60);
  });

  it("estima saldo y pagado si faltan los derivados", () => {
    const incompleta = {
      monto_total: 500,
      saldo: undefined as unknown as number,
      total_pagado: undefined as unknown as number,
      pagos_count: undefined as unknown as number,
      pagos: [pago(), pago({ id: 11, anulado: true })],
    };

    expect(cuentaSaldo(incompleta)).toBe(500);
    expect(cuentaPagosCount(incompleta)).toBe(1);
    expect(cuentaProgreso(incompleta)).toBe(0);
  });

  it("no divide por cero al calcular el progreso", () => {
    expect(cuentaProgreso({ ...CUENTA, monto_total: 0 })).toBe(0);
  });
});

describe("vencimiento y aging", () => {
  it("respeta la bandera vencida del backend", () => {
    expect(cuentaEstaVencida(CUENTA)).toBe(true);
    expect(
      cuentaEstaVencida({ ...CUENTA, vencida: false, saldo: 100 }),
    ).toBe(false);
  });

  it("calcula el vencimiento si el backend no lo informa", () => {
    const sinFlag = {
      ...CUENTA,
      vencida: undefined as unknown as boolean,
      dias_vencida: 0,
      fecha_vencimiento: "2026-10-01",
    };

    expect(
      cuentaEstaVencida(sinFlag, "2026-10-11"),
    ).toBe(true);
    expect(
      cuentaEstaVencida(sinFlag, "2026-09-30"),
    ).toBe(false);
    expect(cuentaDiasVencida(sinFlag, "2026-10-11")).toBe(10);
  });

  it("una cuenta sin saldo nunca está vencida", () => {
    expect(cuentaEstaVencida({ ...CUENTA, saldo: 0 })).toBe(false);
  });

  it("clasifica la antigüedad por bandas", () => {
    expect(cuentaAging({ ...CUENTA, dias_vencida: 0, vencida: false }).bucket).toBe(
      "corriente",
    );
    expect(cuentaAging({ ...CUENTA, dias_vencida: 10 }).bucket).toBe("1_30");
    expect(cuentaAging({ ...CUENTA, dias_vencida: 45 }).bucket).toBe("31_60");
    expect(cuentaAging({ ...CUENTA, dias_vencida: 75 }).bucket).toBe("61_90");
    expect(cuentaAging({ ...CUENTA, dias_vencida: 120 }).bucket).toBe("90_mas");
  });
});

describe("pagos", () => {
  it("separa pagos vigentes de anulados", () => {
    const pagos = [
      pago(),
      pago({ id: 11, monto: 300 }),
      pago({ id: 12, monto: 900, anulado: true }),
    ];

    expect(pagosVigentes(pagos)).toHaveLength(2);
    expect(montoPagadoVigente(pagos)).toBe(500);
  });

  it("solo permite anular pagos vigentes, con permiso", () => {
    expect(puedeAnularPago(pago())).toBe(true);
    expect(puedeAnularPago(pago(), false)).toBe(false);
    expect(puedeAnularPago(pago({ anulado: true }))).toBe(false);
    expect(puedeAnularPago(pago({ puede_anular: false }))).toBe(false);
  });
});

describe("acciones de la cuenta", () => {
  it("filtra pagar cuando no queda saldo", () => {
    const acciones = accionesCuenta({
      ...CUENTA,
      estado_cobro: "PAGADA",
      saldo: 0,
    });

    expect(acciones.has("ver")).toBe(true);
    expect(acciones.has("pagar")).toBe(false);
  });

  it("respeta un listado vacío del backend", () => {
    expect(
      accionesCuenta({ ...CUENTA, acciones_disponibles: [] }).size,
    ).toBe(0);
  });

  it("usa un fallback conservador sin acciones_disponibles", () => {
    const acciones = accionesCuenta({
      ...CUENTA,
      acciones_disponibles: undefined,
    });

    expect(acciones.has("pagar")).toBe(true);
    expect(puedeRegistrarPago({ ...CUENTA, acciones_disponibles: undefined })).toBe(
      true,
    );
  });

  it("oculta pagar sin permiso de UI", () => {
    expect(puedeRegistrarPago(CUENTA, false)).toBe(false);
  });
});

describe("URL del listado", () => {
  it("serializa filtros y omite la página 1", () => {
    expect(
      cobrosHref({
        search: "  andina ",
        estado: "PARCIAL",
        vencida: false,
        clienteId: 3,
        desde: "2026-09-01",
        hasta: "2026-09-30",
        page: 1,
      }),
    ).toBe(
      "/cobros?search=andina&estado_cobro=PARCIAL&cliente_id=3&desde=2026-09-01&hasta=2026-09-30",
    );
  });

  it("marca vencidas y conserva la paginación", () => {
    expect(
      cobrosHref({
        search: "",
        estado: "",
        vencida: true,
        clienteId: "",
        desde: "",
        hasta: "",
        page: 3,
      }),
    ).toBe("/cobros?vencida=1&page=3");
  });
});
