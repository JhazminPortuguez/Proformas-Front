import { describe, expect, it } from "vitest";
import {
  alcanceTexto,
  descuentoPromocion,
  promocionAplica,
  validarPromocion,
  type PromocionFormState,
} from "@/lib/promociones";
import { computeProformaTotals } from "@/lib/proformas";
import { mensajeWhatsApp } from "@/lib/whatsapp";

const BASE: PromocionFormState = {
  nombre: "Verano",
  tipo: "PORCENTAJE",
  valor: "10",
  aplica_a: "CUALQUIERA",
  servicio_id: "",
  producto_id: "",
  vigente_desde: "2026-11-26",
  vigente_hasta: "2026-12-31",
  activa: true,
};

describe("descuento de una promoción (ronda C, igual que el back)", () => {
  it("porcentaje sobre el importe de la línea", () => {
    expect(descuentoPromocion("PORCENTAJE", 15, 2, 200)).toBe(60);
    expect(descuentoPromocion("PORCENTAJE", 100, 1, 80)).toBe(80);
  });

  it("PR-04: el 2x1 con cantidad 1 no descuenta y con 3 cobra 2", () => {
    expect(descuentoPromocion("DOS_POR_UNO", null, 1, 50)).toBe(0);
    expect(descuentoPromocion("DOS_POR_UNO", null, 2, 50)).toBe(50);
    expect(descuentoPromocion("DOS_POR_UNO", null, 3, 50)).toBe(50);
    expect(descuentoPromocion("DOS_POR_UNO", null, 4, 50)).toBe(100);
  });

  it("PR-07: un monto fijo mayor que la línea la deja en Bs 0, nunca en negativo", () => {
    expect(descuentoPromocion("MONTO_FIJO", 500, 1, 120)).toBe(120);
    expect(descuentoPromocion("MONTO_FIJO", 30, 2, 100)).toBe(30);
    expect(descuentoPromocion("MONTO_FIJO", 50, 1, 0)).toBe(0);
  });

  it("los totales de la proforma restan la promoción de cada línea", () => {
    const totales = computeProformaTotals({
      items: [
        { cantidad: 2, precio_unitario: 200, descuento_promocion: 60 },
        { cantidad: 1, precio_unitario: 100 },
      ],
      descuento: 0,
      impuestoTasa: 0,
    });

    expect(totales.subtotal).toBe(440);
    expect(totales.descuento_promocion).toBe(60);
    expect(totales.total).toBe(440);
  });
});

describe("a qué ítem se aplica", () => {
  it("un servicio, un producto o cualquier ítem", () => {
    const servicio = { aplica_a: "SERVICIO" as const, servicio_id: 7, producto_id: null };
    const producto = { aplica_a: "PRODUCTO" as const, servicio_id: null, producto_id: 9 };
    const cualquiera = { aplica_a: "CUALQUIERA" as const, servicio_id: null, producto_id: null };

    expect(promocionAplica(servicio, "SERVICIO", "7")).toBe(true);
    expect(promocionAplica(servicio, "SERVICIO", "8")).toBe(false);
    expect(promocionAplica(servicio, "MATERIAL", "7")).toBe(false);
    expect(promocionAplica(producto, "MATERIAL", 9)).toBe(true);
    expect(promocionAplica(producto, "LIBRE", "")).toBe(false);
    expect(promocionAplica(cualquiera, "LIBRE", "")).toBe(true);
    expect(alcanceTexto({ aplica_a: "SERVICIO", servicio: { id: 7, nombre: "Pintura" }, producto: null })).toBe(
      "Servicio: Pintura",
    );
  });
});

describe("validación del formulario de promoción", () => {
  it("PR-05: el porcentaje solo va de 1 a 100", () => {
    for (const valor of ["0", "0,5", "100,01", "150"]) {
      expect(validarPromocion({ ...BASE, valor }).valor).toEqual(["El porcentaje debe estar entre 1 y 100."]);
    }

    expect(validarPromocion({ ...BASE, valor: "1" })).toEqual({});
    expect(validarPromocion({ ...BASE, valor: "100" })).toEqual({});
    expect(validarPromocion({ ...BASE, valor: "" }).valor).toEqual(["Escribe el porcentaje (de 1 a 100)."]);
  });

  it("PR-06: la fecha hasta no puede ser anterior a desde", () => {
    expect(validarPromocion({ ...BASE, vigente_desde: "2026-12-10", vigente_hasta: "2026-12-09" }).vigente_hasta).toEqual([
      'La fecha "hasta" no puede ser anterior a la fecha "desde".',
    ]);
    expect(validarPromocion({ ...BASE, vigente_desde: "2026-12-10", vigente_hasta: "2026-12-10" })).toEqual({});
  });

  it("monto fijo mayor a 0, el 2x1 sin valor y el servicio o producto obligatorio", () => {
    expect(validarPromocion({ ...BASE, tipo: "MONTO_FIJO", valor: "0" }).valor).toEqual(["El monto debe ser mayor a Bs 0."]);
    expect(validarPromocion({ ...BASE, tipo: "DOS_POR_UNO", valor: "" })).toEqual({});
    expect(validarPromocion({ ...BASE, aplica_a: "SERVICIO" }).servicio_id).toEqual(["Elige el servicio de la promoción."]);
    expect(validarPromocion({ ...BASE, aplica_a: "PRODUCTO" }).producto_id).toEqual(["Elige el producto de la promoción."]);
    expect(validarPromocion({ ...BASE, nombre: "  " }).nombre).toEqual(["Escribe el nombre de la promoción."]);
  });
});

describe("WhatsApp con promoción", () => {
  it("el mensaje dice el descuento cuando el total lo tiene", () => {
    const datos = { telefono: "71234567", numero: "PR-1", total: 90, enlacePortal: "https://x/portal/proformas/1" };

    expect(mensajeWhatsApp({ ...datos, descuentoPromocion: 10 })).toContain("de descuento por promoción");
    expect(mensajeWhatsApp(datos)).not.toContain("promoción");
  });
});
