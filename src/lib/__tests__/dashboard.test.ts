import { describe, expect, it } from "vitest";
import type { DashboardData } from "@/lib/api/types";
import {
  dashboardActividad,
  dashboardAgingSlices,
  dashboardCotizadoMes,
  dashboardKpis,
  dashboardOrdenesActivas,
  dashboardOrdenesPipeline,
  dashboardPipelineTotal,
  dashboardProformasPipeline,
  dashboardSaldoPorCobrar,
  dashboardServiciosTop,
  dashboardVencido,
  normalizarActividadTipo,
  primerNombre,
} from "@/lib/dashboard";
import { movimientosDeProductoHref } from "@/lib/inventario";

const DATA: DashboardData = {
  clientes: 4,
  servicios: 4,
  proformas: 3,
  proformas_por_estado: {
    BORRADOR: 1,
    ENVIADA: 1,
    ACEPTADA: 1,
    RECHAZADA: 0,
  },
  monto_proformas_mes: 0,
  monto_cotizado_mes: 0,
  monto_aceptado_mes: 0,
  ordenes_pendientes: 2,
  saldo_por_cobrar: 265,
  ordenes: {
    total: 3,
    activas: 2,
    pendientes: 1,
    asignadas: 1,
    en_proceso: 0,
    finalizadas: 1,
    canceladas: 1,
    por_estado: {
      PENDIENTE: 1,
      ASIGNADA: 1,
      EN_PROCESO: 0,
      FINALIZADA: 1,
      CANCELADA: 1,
    },
    finalizadas_mes: 1,
    cerradas_mes: 1,
  },
  inventario: {
    productos: 6,
    stock_bajo: 1,
    valor_inventario: 8470,
    movimientos_mes: 7,
    productos_bajo_stock: [
      {
        id: 10,
        nombre: "Ventilador de reemplazo",
        stock_actual: 7,
        stock_minimo: 10,
        unidad_medida: "unidad",
      },
    ],
  },
  cobros: {
    cuentas: 1,
    pendientes: 1,
    vencidas: 0,
    saldo: 265,
    monto_vencido: 0,
    cobrado_mes: 265,
    monto_total: 530,
    aging: {
      al_dia: 265,
      d1_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90_plus: 0,
    },
  },
  ingresos_mes: 265,
  servicios_mas_solicitados: [
    {
      servicio_id: 1,
      nombre: "Instalación básica",
      cantidad: 3,
      total: 1050,
    },
    {
      servicio_id: 2,
      nombre: "Mantenimiento",
      cantidad: 1,
      total: 400,
    },
  ],
  actividad_reciente: [
    {
      id: 10,
      tipo: "pago",
      descripcion: "Pago CXC-2026-000001",
      estado: null,
      monto: 265,
      cuenta_id: 1,
      fecha: "2026-10-24T15:00:00.000000Z",
      usuario: "Pepito Tilcayo",
    },
    {
      id: 4,
      tipo: "orden",
      descripcion: "OS-2026-000003",
      estado: "FINALIZADA",
      monto: null,
      fecha: "2026-10-24T14:00:00.000000Z",
    },
    {
      id: 1,
      tipo: "movimiento",
      descripcion: "CONSUMO Ventilador de reemplazo",
      producto_id: 10,
      monto: 55,
      fecha: "2026-10-24T13:00:00.000000Z",
      usuario: "Pepito Tilcayo",
    },
    {
      id: 3,
      tipo: "proforma",
      descripcion: "PR-2026-000003",
      estado: "ACEPTADA",
      monto: 530,
      fecha: "2026-10-24T12:00:00.000000Z",
      usuario: "Pepito Tilcayo",
    },
  ],
};

const LEGACY: DashboardData = {
  clientes: 2,
  servicios: 1,
  proformas: 1,
  proformas_por_estado: { BORRADOR: 1 },
  monto_proformas_mes: 500,
  actividad_reciente: [],
  ordenes_pendientes: null,
  saldo_por_cobrar: null,
};

describe("KPIs del dashboard", () => {
  it("deriva los seis indicadores del contrato nuevo", () => {
    const kpis = dashboardKpis(DATA);
    const porClave = Object.fromEntries(kpis.map((kpi) => [kpi.key, kpi]));

    expect(kpis).toHaveLength(6);
    expect(porClave.clientes.value).toBe(4);
    expect(porClave.ordenes.value).toBe(2);
    expect(porClave.ordenes.hint).toContain("1 pendiente");
    expect(porClave.saldo.value).toBe(265);
    expect(porClave.saldo.hint).toContain("1 cuenta pendiente");
    expect(porClave.stock.value).toBe(1);
    expect(porClave.stock.hint).toContain("6 productos");
    expect(porClave.cobrado.value).toBe(265);
    expect(porClave.cotizado.value).toBe(0);
    expect(porClave.cotizado.hint).toContain("Aceptado");
  });

  it("tolera la respuesta antigua sin objetos nuevos", () => {
    const kpis = Object.fromEntries(
      dashboardKpis(LEGACY).map((kpi) => [kpi.key, kpi]),
    );

    expect(kpis.ordenes.value).toBeNull();
    expect(kpis.saldo.value).toBeNull();
    expect(kpis.cobrado.value).toBeNull();
    expect(kpis.stock.value).toBeNull();
    expect(kpis.cotizado.value).toBe(500);
    expect(kpis.saldo.hint).toBe("Sin datos de cartera");
  });

  it("usa el agregado de órdenes y calcula activas si falta `activas`", () => {
    expect(dashboardOrdenesActivas(DATA)).toBe(2);
    expect(
      dashboardOrdenesActivas({
        ...DATA,
        ordenes: { ...DATA.ordenes!, activas: undefined as unknown as number },
      }),
    ).toBe(2);
  });

  it("prefiere el saldo del objeto de cobros y cae al legacy", () => {
    expect(dashboardSaldoPorCobrar(DATA)).toBe(265);
    expect(dashboardSaldoPorCobrar({ ...LEGACY, saldo_por_cobrar: 99 })).toBe(
      99,
    );
  });

  it("suma las bandas vencidas cuando falta `monto_vencido`", () => {
    expect(
      dashboardVencido({
        ...DATA,
        cobros: {
          ...DATA.cobros!,
          monto_vencido: undefined,
          aging: { al_dia: 100, d1_30: 50, d31_60: 25, d61_90: 10, d90_plus: 5 },
        },
      }),
    ).toBe(90);
  });

  it("cae al monto histórico de proformas si falta `monto_cotizado_mes`", () => {
    expect(
      dashboardCotizadoMes({ ...LEGACY, monto_cotizado_mes: undefined }),
    ).toBe(500);
  });
});

describe("pipeline", () => {
  it("ordena los estados de proforma y enlaza el filtro", () => {
    const items = dashboardProformasPipeline(DATA);

    expect(items.map((item) => item.key)).toEqual([
      "BORRADOR",
      "ENVIADA",
      "ACEPTADA",
      "RECHAZADA",
    ]);
    expect(items[0]).toMatchObject({
      label: "Borrador",
      count: 1,
      href: "/proformas?estado=BORRADOR",
    });
    expect(dashboardPipelineTotal(items)).toBe(3);
  });

  it("arma las órdenes por estado desde `por_estado`", () => {
    const items = dashboardOrdenesPipeline(DATA);

    expect(items).toHaveLength(5);
    expect(items.find((item) => item.key === "FINALIZADA")).toMatchObject({
      count: 1,
      href: "/ordenes?estado=FINALIZADA",
    });
    // El total visible suma las filas del pipeline (no el agregado `total`,
    // que en este contrato no coincide con `por_estado`).
    expect(dashboardPipelineTotal(items)).toBe(4);
  });

  it("cae a los conteos planos si falta `por_estado`", () => {
    const items = dashboardOrdenesPipeline({
      ...DATA,
      ordenes: { ...DATA.ordenes!, por_estado: undefined },
    });

    expect(dashboardPipelineTotal(items)).toBe(4);
  });

  it("devuelve vacío cuando el backend no envía los agregados", () => {
    expect(dashboardOrdenesPipeline(LEGACY)).toEqual([]);
    expect(
      dashboardProformasPipeline({
        ...LEGACY,
        proformas_por_estado: undefined as unknown as Record<string, number>,
      }),
    ).toEqual([]);
  });
});

describe("aging", () => {
  it("calcula porcentajes sobre el saldo total", () => {
    const slices = dashboardAgingSlices(DATA.cobros?.aging, 265);

    expect(slices).toHaveLength(5);
    expect(slices[0]).toMatchObject({ key: "al_dia", amount: 265, percent: 100 });
    expect(slices[1]).toMatchObject({ key: "d1_30", amount: 0, percent: 0 });
  });

  it("usa la suma de bandas si no hay total y respeta las etiquetas", () => {
    const slices = dashboardAgingSlices(
      { al_dia: 100, d1_30: 100, d31_60: 0, d61_90: 0, d90_plus: 0 },
      null,
    );

    expect(slices[0].percent).toBe(50);
    expect(slices[1].label).toBe("1 a 30 días");
    expect(slices[4].label).toBe("Más de 90 días");
  });

  it("no divide por cero ni acepta negativos", () => {
    const slices = dashboardAgingSlices(null, 0);

    expect(slices.every((slice) => slice.percent === 0)).toBe(true);
    expect(slices.every((slice) => slice.amount === 0)).toBe(true);
  });
});

describe("servicios más solicitados", () => {
  it("ordena por cantidad y limita el top", () => {
    const top = dashboardServiciosTop(DATA, 1);

    expect(top).toHaveLength(1);
    expect(top[0]).toMatchObject({
      servicioId: 1,
      nombre: "Instalación básica",
      cantidad: 3,
      total: 1050,
    });
  });

  it("tolera listas ausentes", () => {
    expect(dashboardServiciosTop(LEGACY)).toEqual([]);
  });
});

describe("actividad reciente", () => {
  it("resuelve enlaces válidos por tipo", () => {
    const items = dashboardActividad(DATA);

    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({
      kind: "pago",
      href: "/cobros/1",
      monto: 265,
      usuario: "Pepito Tilcayo",
    });
    expect(items[1]).toMatchObject({ kind: "orden", href: "/ordenes/4" });
    expect(items[2]).toMatchObject({
      kind: "movimiento",
      href: movimientosDeProductoHref(10),
    });
    expect(items[3]).toMatchObject({
      kind: "proforma",
      href: "/proformas/3",
      estado: "ACEPTADA",
    });
  });

  it("enlaza clientes a su ficha y usa búsqueda sólo sin identificador", () => {
    const [cliente, sinId, desconocido] = dashboardActividad({
      ...DATA,
      actividad_reciente: [
        {
          id: 7,
          tipo: "cliente",
          descripcion: "Constructora Andina",
          fecha: "2026-10-24T10:00:00.000000Z",
        },
        { tipo: "cliente", descripcion: "Cliente sin id" },
        { id: 9, tipo: "sistema", descripcion: "Evento interno" },
      ],
    });

    expect(cliente.href).toBe("/clientes/7");
    expect(sinId.href).toBe("/clientes?search=Cliente+sin+id");
    expect(desconocido).toMatchObject({
      kind: "otro",
      tipoLabel: "Actividad",
      href: null,
    });
  });

  it("normaliza alias de tipo", () => {
    expect(normalizarActividadTipo("PROFORMA")).toBe("proforma");
    expect(normalizarActividadTipo("orden-servicio")).toBe("orden");
    expect(normalizarActividadTipo("cobro")).toBe("pago");
    expect(normalizarActividadTipo(undefined)).toBe("otro");
  });
});

describe("saludo", () => {
  it("toma solo el primer nombre", () => {
    expect(primerNombre("Pepito Tilcayo")).toBe("Pepito");
    expect(primerNombre("  Ana  María Pérez ")).toBe("Ana");
    expect(primerNombre("")).toBe("");
  });
});
