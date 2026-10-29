import { describe, expect, it } from "vitest";
import type { ProformaItem } from "@/lib/api/types";
import {
  accionesProforma,
  computeProformaTotals,
  formatDiaMes,
  isValidDateOnly,
  normalizarAccionProforma,
  normalizarBusqueda,
  parseCantidad,
  proformaExpirada,
  proformaItemSubtotal,
  proformaItemTitle,
  proformaItemsCount,
  todayDateOnly,
} from "@/lib/proformas";
import { formatMoney } from "@/lib/utils";

describe("cálculo estimado de proforma", () => {
  it("suma líneas, aplica descuento e impuesto sobre la base", () => {
    const totals = computeProformaTotals({
      items: [
        { cantidad: 2, precio_unitario: 100 },
        { cantidad: 1, precio_unitario: 50 },
      ],
      descuento: 25,
      impuestoTasa: 13,
    });

    expect(totals).toEqual({
      subtotal: 250,
      descuento: 25,
      base: 225,
      impuesto: 29.25,
      total: 254.25,
    });
  });

  it("no permite que el descuento supere el subtotal", () => {
    const totals = computeProformaTotals({
      items: [{ cantidad: 1, precio_unitario: 100 }],
      descuento: 500,
      impuestoTasa: 13,
    });

    expect(totals.descuento).toBe(100);
    expect(totals.base).toBe(0);
    expect(totals.impuesto).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("ignora cantidades y precios inválidos sin romper el total", () => {
    const totals = computeProformaTotals({
      items: [
        { cantidad: Number.NaN, precio_unitario: 100 },
        { cantidad: 1, precio_unitario: Number.NaN },
        { cantidad: 1, precio_unitario: 10 },
      ],
      descuento: Number.NaN,
      impuestoTasa: Number.NaN,
    });

    expect(totals.subtotal).toBe(10);
    expect(totals.descuento).toBe(0);
    expect(totals.total).toBe(10);
  });

  it("redondea a dos decimales", () => {
    const totals = computeProformaTotals({
      items: [{ cantidad: 3, precio_unitario: 0.335 }],
      descuento: 0,
      impuestoTasa: 13,
    });

    expect(totals.subtotal).toBe(1.01);
    expect(totals.impuesto).toBe(0.13);
    expect(totals.total).toBe(1.14);
  });
});

describe("cantidades y fechas date-only", () => {
  it("acepta coma o punto decimal", () => {
    expect(parseCantidad("1,5")).toBe(1.5);
    expect(parseCantidad("1.5")).toBe(1.5);
    expect(parseCantidad("1.234,5")).toBe(1234.5);
    expect(Number.isNaN(parseCantidad(""))).toBe(true);
    expect(Number.isNaN(parseCantidad("abc"))).toBe(true);
  });

  it("valida fechas existentes y rechaza días imposibles", () => {
    expect(isValidDateOnly("2024-02-29")).toBe(true);
    expect(isValidDateOnly("2026-02-29")).toBe(false);
    expect(isValidDateOnly("2026-2-01")).toBe(false);
    expect(isValidDateOnly("2026-13-01")).toBe(false);
  });

  it("calcula el día de la operación en America/La_Paz", () => {
    expect(
      todayDateOnly(
        "America/La_Paz",
        new Date("2026-01-01T02:00:00.000Z"),
      ),
    ).toBe("2025-12-31");
  });
});

describe("acciones disponibles de una proforma", () => {
  it("normaliza aliases del backend y descarta acciones desconocidas", () => {
    expect(normalizarAccionProforma("Enviar")).toBe("enviar");
    expect(normalizarAccionProforma("download_pdf")).toBe("pdf");
    expect(normalizarAccionProforma("crear orden")).toBe("crear_orden");
    expect(normalizarAccionProforma("create_order")).toBe("crear_orden");
    expect(normalizarAccionProforma("archivar")).toBeNull();
  });

  it("respeta la lista del backend", () => {
    const acciones = accionesProforma({
      estado: "ENVIADA",
      acciones_disponibles: ["ver", "aceptar", "rechazar", "pdf"],
    });

    expect([...acciones]).toEqual(["ver", "aceptar", "rechazar", "pdf"]);
  });

  it("respeta una lista vacía como ausencia de acciones", () => {
    const acciones = accionesProforma({
      estado: "ACEPTADA",
      acciones_disponibles: [],
    });

    expect(acciones.size).toBe(0);
  });

  it("usa un fallback conservador por estado cuando el campo no viene", () => {
    const borrador = accionesProforma(
      { estado: "BORRADOR", acciones_disponibles: undefined },
      { canDelete: false },
    );

    expect(borrador.has("editar")).toBe(true);
    expect(borrador.has("enviar")).toBe(true);
    expect(borrador.has("eliminar")).toBe(false);

    const enviada = accionesProforma({
      estado: "ENVIADA",
      acciones_disponibles: undefined,
    });

    expect(enviada.has("aceptar")).toBe(true);
    expect(enviada.has("editar")).toBe(false);
  });

  it("oculta eliminar cuando el usuario no puede eliminar", () => {
    const acciones = accionesProforma(
      {
        estado: "BORRADOR",
        acciones_disponibles: ["ver", "eliminar"],
      },
      { canDelete: false },
    );

    expect(acciones.has("eliminar")).toBe(false);
  });

  it("ofrece crear orden en una proforma aceptada sin orden vigente", () => {
    const aceptada = accionesProforma({
      estado: "ACEPTADA",
      acciones_disponibles: undefined,
      orden_id: null,
    });

    expect(aceptada.has("crear_orden")).toBe(true);

    const conOrden = accionesProforma({
      estado: "ACEPTADA",
      acciones_disponibles: undefined,
      orden_id: 9,
    });

    expect(conOrden.has("crear_orden")).toBe(false);

    const sinPermiso = accionesProforma(
      { estado: "ACEPTADA", acciones_disponibles: ["ver", "crear_orden"] },
      { canCreate: false },
    );

    expect(sinPermiso.has("crear_orden")).toBe(false);
  });
});

describe("normalización de búsqueda", () => {
  it("ignora mayúsculas, acentos y la ñ", () => {
    expect(normalizarBusqueda("  ÑANDÚ  ")).toBe("nandu");
    expect(normalizarBusqueda("Mantenimiento eléctrico")).toBe(
      "mantenimiento electrico",
    );
  });
});

describe("presentación de ítems", () => {
  const item: ProformaItem = {
    id: 1,
    tipo: "MATERIAL",
    servicio_id: null,
    producto_id: 5,
    descripcion: null,
    cantidad: 2,
    precio_unitario: 12.5,
    total_linea: 25,
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

  it("usa el nombre del catálogo cuando no hay descripción", () => {
    expect(proformaItemTitle(item)).toBe("Cable 12 AWG");
  });

  it("calcula el subtotal cuando el backend no lo envía", () => {
    expect(proformaItemSubtotal(item)).toBe(25);
  });

  it("prefiere items_count sobre el largo del array", () => {
    expect(proformaItemsCount({ items_count: 4, items: [item] })).toBe(4);
    expect(proformaItemsCount({ items: [item] })).toBe(1);
  });
});

describe("aviso de validez expirada", () => {
  const base = { estado: "ENVIADA" as const, fecha_validez: "2026-10-20" };

  it("solo avisa en proformas enviadas con la validez ya pasada", () => {
    expect(proformaExpirada(base, "2026-10-21")).toBe(true);
    expect(proformaExpirada(base, "2026-10-20")).toBe(false);
    expect(proformaExpirada({ ...base, estado: "BORRADOR" }, "2026-10-21")).toBe(
      false,
    );
    expect(proformaExpirada({ ...base, fecha_validez: null }, "2026-10-21")).toBe(
      false,
    );
  });

  it("formatea la fecha como dd/mm", () => {
    expect(formatDiaMes("2026-10-05")).toBe("05/10");
  });
});

describe("formatMoney con moneda", () => {
  it("usa Bs por defecto y la moneda real sin convertir el monto", () => {
    expect(formatMoney(565)).toMatch(/Bs\s?565,00/);
    expect(formatMoney(565, "BOB")).toMatch(/Bs\s?565,00/);
    expect(formatMoney(565, "USD")).toMatch(/USD\s?565,00/);
    expect(formatMoney(565, "EUR")).toMatch(/EUR\s?565,00/);
    expect(formatMoney(565, "XX")).toMatch(/Bs\s?565,00/);
  });
});
