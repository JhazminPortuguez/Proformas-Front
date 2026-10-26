import { describe, expect, it } from "vitest";
import type { Orden, OrdenEvento, OrdenItem } from "@/lib/api/types";
import {
  accionesOrden,
  eventoFecha,
  eventoOrdenMeta,
  eventoOrdenTransicion,
  normalizarAccionOrden,
  ordenActualizadaEn,
  ordenClienteNombre,
  ordenCreadaEn,
  ordenEstaActiva,
  ordenEstaCerrada,
  ordenFechaProgramadaTexto,
  ordenItemTitle,
  ordenItemTotal,
  ordenItemUnidad,
  ordenItemsCount,
  ordenOperarioNombre,
  ordenProformaNumero,
  ordenesHref,
  parseTipoEventoOrden,
  puedeAccionOrden,
  tipoOrdenItemLabel,
} from "@/lib/ordenes";

function buildOrden(overrides: Partial<Orden> = {}): Orden {
  return {
    id: 9,
    empresa_id: 1,
    numero: "ORD-000009",
    proforma_id: 12,
    cliente_id: 3,
    operario_id: null,
    estado: "PENDIENTE",
    fecha_programada: null,
    fecha_inicio: null,
    fecha_fin: null,
    observaciones: null,
    motivo_cancelacion: null,
    cancelada_at: null,
    cerrada_at: null,
    cerrada_por: null,
    created_by: 1,
    updated_by: 1,
    ...overrides,
  };
}

const ITEM: OrdenItem = {
  id: 1,
  orden_id: 9,
  tipo: "MATERIAL",
  servicio_id: null,
  producto_id: 5,
  descripcion: null,
  unidad_medida: null,
  cantidad: 3,
  precio_unitario: 12.5,
  total_linea: 37.5,
  producto: {
    id: 5,
    nombre: "Cable 12 AWG",
    descripcion: null,
    precio_unitario: 12.5,
    unidad_medida: "metro",
    activo: true,
    stock_actual: 100,
    stock_minimo: 10,
    costo_promedio: 8,
  },
};

const EVENTO: OrdenEvento = {
  id: 4,
  orden_id: 9,
  tipo: "INICIO",
  descripcion: "Se inició el trabajo en sitio.",
  estado_anterior: "ASIGNADA",
  estado_nuevo: "EN_PROCESO",
  user_id: 2,
  created_at: "2026-10-25T14:30:00Z",
  usuario: {
    id: 2,
    name: "Pedro Operario",
    email: "pedro@example.com",
    rol: "operario",
    activo: true,
    cliente_id: null,
    empresa_id: 1,
  },
};

describe("acciones de una orden", () => {
  it("normaliza alias del backend y descarta desconocidas", () => {
    expect(normalizarAccionOrden("Asignar operario")).toBe("asignar");
    expect(normalizarAccionOrden("start")).toBe("iniciar");
    expect(normalizarAccionOrden("cerrar")).toBe("cerrar");
    expect(normalizarAccionOrden("consumir materiales")).toBe("consumir");
    expect(normalizarAccionOrden("archivar")).toBeNull();
  });

  it("respeta la lista del backend y los permisos de UI", () => {
    const acciones = accionesOrden(
      {
        estado: "PENDIENTE",
        acciones_disponibles: ["ver", "asignar", "cancelar", "cerrar"],
      },
      { canCancel: false, canClose: false },
    );

    expect([...acciones]).toEqual(["ver", "asignar"]);
  });

  it("respeta una lista vacía como ausencia de acciones", () => {
    expect(
      accionesOrden({ estado: "ASIGNADA", acciones_disponibles: [] }).size,
    ).toBe(0);
  });

  it("usa un fallback por estado cuando el campo no viene", () => {
    expect([...accionesOrden(buildOrden())]).toEqual([
      "ver",
      "asignar",
      "cancelar",
    ]);

    expect(
      [...accionesOrden(buildOrden({ estado: "ASIGNADA" }))],
    ).toEqual(["ver", "iniciar", "cancelar"]);

    expect(
      [...accionesOrden(buildOrden({ estado: "EN_PROCESO" }))],
    ).toEqual(["ver", "finalizar", "cancelar"]);

    expect(
      [...accionesOrden(buildOrden({ estado: "FINALIZADA" }))],
    ).toEqual(["ver", "cerrar"]);

    expect(
      [
        ...accionesOrden(
          buildOrden({
            estado: "FINALIZADA",
            cerrada_at: "2026-10-25T18:00:00Z",
          }),
        ),
      ],
    ).toEqual(["ver"]);

    expect([...accionesOrden(buildOrden({ estado: "CANCELADA" }))]).toEqual([
      "ver",
    ]);
  });

  it("puedeAccionOrden consulta el mismo set", () => {
    const orden = buildOrden({ estado: "ASIGNADA" });

    expect(puedeAccionOrden(orden, "iniciar")).toBe(true);
    expect(puedeAccionOrden(orden, "cerrar")).toBe(false);
  });
});

describe("estado y ciclo de vida de la orden", () => {
  it("considera cerrada solo con cerrada_at", () => {
    expect(ordenEstaCerrada(buildOrden())).toBe(false);
    expect(ordenEstaCerrada(buildOrden({ cerrada_at: "2026-10-25T18:00:00Z" }))).toBe(true);
  });

  it("una orden finalizada sigue activa hasta el cierre", () => {
    expect(ordenEstaActiva(buildOrden({ estado: "FINALIZADA" }))).toBe(true);
    expect(
      ordenEstaActiva(
        buildOrden({
          estado: "FINALIZADA",
          cerrada_at: "2026-10-25T18:00:00Z",
        }),
      ),
    ).toBe(false);
    expect(ordenEstaActiva(buildOrden({ estado: "CANCELADA" }))).toBe(false);
  });
});

describe("fechas y presentación de la orden", () => {
  it("usa created_at con fallback a creado_en", () => {
    expect(ordenCreadaEn({ created_at: "a", creado_en: "b" })).toBe("a");
    expect(ordenCreadaEn({ creado_en: "b" })).toBe("b");
    expect(ordenCreadaEn({})).toBeNull();
    expect(ordenActualizadaEn({ actualizado_en: "c" })).toBe("c");
  });

  it("formatea la fecha programada como date-only", () => {
    expect(ordenFechaProgramadaTexto({ fecha_programada: null })).toBe("—");
    expect(
      ordenFechaProgramadaTexto({ fecha_programada: "2026-10-25" }),
    ).toContain("2026");
  });

  it("resuelve nombres con fallback al id", () => {
    const orden = buildOrden({
      cliente: {
        id: 3,
        nombre_razon: "Constructora Andina",
        nit_ci: null,
        telefono: null,
        email: null,
        direccion: null,
        estado: "activo",
      },
      proforma: {
        id: 12,
        numero: "PRF-000012",
        estado: "ACEPTADA",
        moneda: "BOB",
        total: 565,
      },
      operario: {
        id: 2,
        name: "Pedro Operario",
        email: "pedro@example.com",
        rol: "operario",
        activo: true,
        cliente_id: null,
        empresa_id: 1,
      },
    });

    expect(ordenClienteNombre(orden)).toBe("Constructora Andina");
    expect(ordenProformaNumero(orden)).toBe("PRF-000012");
    expect(ordenOperarioNombre(orden)).toBe("Pedro Operario");
    expect(ordenOperarioNombre(buildOrden())).toBe("Sin asignar");
    expect(ordenOperarioNombre(buildOrden({ operario_id: 8 }))).toBe(
      "Operario #8",
    );
  });

  it("prefiere items_count y tolera el arreglo", () => {
    expect(ordenItemsCount({ items_count: 4, items: [ITEM] })).toBe(4);
    expect(ordenItemsCount({ items: [ITEM] })).toBe(1);
    expect(ordenItemsCount({})).toBe(0);
  });

  it("presenta los ítems con catálogo y total de respaldo", () => {
    expect(tipoOrdenItemLabel("MATERIAL")).toBe("Material");
    expect(tipoOrdenItemLabel("OTRO")).toBe("OTRO");
    expect(ordenItemTitle(ITEM)).toBe("Cable 12 AWG");
    expect(ordenItemUnidad(ITEM)).toBe("metro");
    expect(ordenItemTotal(ITEM)).toBe(37.5);
    expect(
      ordenItemTotal({ ...ITEM, total_linea: undefined as unknown as number }),
    ).toBe(37.5);
  });
});

describe("historial de la orden", () => {
  it("normaliza el tipo de evento", () => {
    expect(parseTipoEventoOrden("creacion")).toBe("CREACION");
    expect(parseTipoEventoOrden("consumo")).toBe("CONSUMO");
    expect(parseTipoEventoOrden("en proceso")).toBeNull();
    expect(eventoOrdenMeta("FINALIZACION").tone).toBe("success");
    expect(eventoOrdenMeta("CONSUMO").tone).toBe("accent");
    expect(eventoOrdenMeta("otro").tone).toBe("neutral");
  });

  it("arma la transición anterior → nuevo", () => {
    expect(eventoOrdenTransicion(EVENTO)).toBe("Asignada → En proceso");
    expect(
      eventoOrdenTransicion({
        ...EVENTO,
        estado_anterior: null,
        estado_nuevo: "ASIGNADA",
      }),
    ).toBe("→ Asignada");
    expect(
      eventoOrdenTransicion({
        ...EVENTO,
        estado_anterior: null,
        estado_nuevo: null,
      }),
    ).toBeNull();
  });

  it("usa created_at o creado_en para la fecha del evento", () => {
    expect(eventoFecha(EVENTO)).toBe("2026-10-25T14:30:00Z");
    expect(eventoFecha({ ...EVENTO, created_at: null, creado_en: "2026-10-26" })).toBe(
      "2026-10-26",
    );
  });
});

describe("query del listado de órdenes", () => {
  it("serializa filtros, vista y página", () => {
    const href = ordenesHref({
      search: "cable",
      estado: "PENDIENTE",
      operarioId: 2,
      clienteId: 3,
      vista: "tablero",
      page: 4,
    });

    const params = new URLSearchParams(href.split("?")[1]);

    expect(href.startsWith("/ordenes?")).toBe(true);
    expect(params.get("search")).toBe("cable");
    expect(params.get("estado")).toBe("PENDIENTE");
    expect(params.get("operario_id")).toBe("2");
    expect(params.get("cliente_id")).toBe("3");
    expect(params.get("vista")).toBe("tablero");
    expect(params.get("page")).toBe("4");
  });

  it("omite la primera página para limpiar la URL", () => {
    const href = ordenesHref({
      search: "",
      estado: "",
      operarioId: "",
      clienteId: "",
      vista: "tabla",
      page: 1,
    });

    expect(href).toBe("/ordenes?vista=tabla");
  });
});
