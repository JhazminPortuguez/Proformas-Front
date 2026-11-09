import { describe, expect, it } from "vitest";
import { errorFechaPago, esCobroCancelacion } from "@/lib/cobros";
import { movimientoMeta, movimientoSigno } from "@/lib/inventario";
import {
  cobroCancelacion,
  errorDevolucion,
  materialesConsumidos,
} from "@/lib/ordenes";
import { avisoAceptarVencida, clientesParaProforma } from "@/lib/proformas";

describe("errorFechaPago", () => {
  const HOY = "2026-11-08";

  it("acepta hoy, la fecha de emisión y una fecha intermedia", () => {
    expect(errorFechaPago("2026-11-08", "2026-11-01", HOY)).toBeNull();
    expect(errorFechaPago("2026-11-01", "2026-11-01", HOY)).toBeNull();
    expect(errorFechaPago("2026-11-05", "2026-11-01", HOY)).toBeNull();
  });

  it("sin fecha no hay error: el back usa hoy", () => {
    expect(errorFechaPago("", "2026-11-01", HOY)).toBeNull();
  });

  it("rechaza una fecha futura con el día de hoy", () => {
    expect(errorFechaPago("2026-11-09", "2026-11-01", HOY)).toBe(
      "La fecha de pago no puede ser futura (hoy es 08/11/2026).",
    );
  });

  it("rechaza una fecha anterior a la emisión de la cuenta", () => {
    expect(errorFechaPago("2026-10-31", "2026-11-01", HOY)).toBe(
      "La fecha de pago no puede ser anterior a la emisión de la cuenta (01/11/2026).",
    );
  });

  it("rechaza una fecha que no existe", () => {
    expect(errorFechaPago("2026-02-30", null, HOY)).toBe("Escribe una fecha válida.");
  });
});

describe("avisoAceptarVencida", () => {
  it("avisa si la validez ya pasó", () => {
    expect(
      avisoAceptarVencida({ estado: "ENVIADA", fecha_validez: "2026-11-01" }, "2026-11-08"),
    ).toBe("Esta proforma venció el 01/11/2026.");
  });

  it("no avisa el mismo día de la validez, sin validez ni fuera de ENVIADA", () => {
    expect(
      avisoAceptarVencida({ estado: "ENVIADA", fecha_validez: "2026-11-08" }, "2026-11-08"),
    ).toBeNull();
    expect(
      avisoAceptarVencida({ estado: "ENVIADA", fecha_validez: null }, "2026-11-08"),
    ).toBeNull();
    expect(
      avisoAceptarVencida({ estado: "ACEPTADA", fecha_validez: "2026-11-01" }, "2026-11-08"),
    ).toBeNull();
  });
});

describe("clientesParaProforma", () => {
  const CLIENTES = [
    { id: 1, estado: "activo" as const },
    { id: 2, estado: "prospecto" as const },
    { id: 3, estado: "inactivo" as const },
  ];

  it("oculta los inactivos en una proforma nueva", () => {
    expect(clientesParaProforma(CLIENTES).map((c) => c.id)).toEqual([1, 2]);
  });

  it("conserva el cliente actual de la proforma aunque esté inactivo", () => {
    expect(clientesParaProforma(CLIENTES, 3).map((c) => c.id)).toEqual([1, 2, 3]);
  });
});

describe("cancelar una orden con materiales consumidos", () => {
  const ITEMS = [
    { id: 1, orden_id: 31, tipo: "MATERIAL" as const, servicio_id: null, producto_id: 10, descripcion: "Memoria RAM 8 GB", unidad_medida: "unidad", cantidad: 2, precio_unitario: 150, total_linea: 300, cantidad_consumida: 2 },
    { id: 2, orden_id: 31, tipo: "MATERIAL" as const, servicio_id: null, producto_id: 20, descripcion: "Disco SSD", unidad_medida: "unidad", cantidad: 1, precio_unitario: 280.5, total_linea: 280.5, cantidad_consumida: 1 },
    { id: 3, orden_id: 31, tipo: "MATERIAL" as const, servicio_id: null, producto_id: 30, descripcion: "Fuente", unidad_medida: "unidad", cantidad: 1, precio_unitario: 300, total_linea: 300, cantidad_consumida: 0 },
    { id: 4, orden_id: 31, tipo: "SERVICIO" as const, servicio_id: 7, producto_id: null, descripcion: "Armado", unidad_medida: "servicio", cantidad: 1, precio_unitario: 200, total_linea: 200 },
  ];

  it("solo lista los materiales con algo consumido", () => {
    expect(materialesConsumidos(ITEMS).map((m) => m.ordenItemId)).toEqual([1, 2]);
  });

  it("valida la cantidad a devolver: de 0 a lo consumido", () => {
    expect(errorDevolucion("", 2)).toBeNull();
    expect(errorDevolucion("0", 2)).toBeNull();
    expect(errorDevolucion("1,5", 2)).toBeNull();
    expect(errorDevolucion("2", 2)).toBeNull();
    expect(errorDevolucion("2.001", 2)).toBe("No puede superar lo consumido (2).");
    expect(errorDevolucion("-1", 2)).toBe("No puede ser negativa.");
    expect(errorDevolucion("abc", 2)).toBe("Escribe un número.");
  });

  it("cobra precio de la línea × lo no devuelto, sin descuento ni impuesto", () => {
    const materiales = materialesConsumidos(ITEMS);

    expect(cobroCancelacion(materiales, {}).total).toBe(580.5);
    expect(cobroCancelacion(materiales, { 1: "1" }).total).toBe(430.5);
    expect(cobroCancelacion(materiales, { 1: "2", 2: "1" }).total).toBe(0);
    // Una cantidad inválida cuenta como 0 devuelto.
    expect(cobroCancelacion(materiales, { 1: "9" }).total).toBe(580.5);
  });

  it("la devolución es una entrada al stock con su etiqueta", () => {
    expect(movimientoMeta("DEVOLUCION").label).toBe("Devolución");
    expect(movimientoSigno("DEVOLUCION", 1)).toBe("+");
  });

  it("reconoce los cobros por cancelación", () => {
    expect(esCobroCancelacion({ concepto: "CANCELACION" })).toBe(true);
    expect(esCobroCancelacion({ concepto: "SERVICIO" })).toBe(false);
    expect(esCobroCancelacion({})).toBe(false);
  });
});
