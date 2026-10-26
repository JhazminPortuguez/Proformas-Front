import { describe, expect, it } from "vitest";
import type { OrdenItem, Producto } from "@/lib/api/types";
import {
  existenciasHref,
  formatCantidadMovimiento,
  materialConsumidoCantidad,
  materialEstaConsumido,
  materialPendienteCantidad,
  materialStockInsuficiente,
  materialesPendientes,
  movimientoMeta,
  movimientoSigno,
  movimientosHref,
  ordenMateriales,
  parseTipoMovimiento,
  productoCatalogOptions,
  productoStockBajo,
  productoStockEstado,
  productoValorStock,
} from "@/lib/inventario";

const PRODUCTO: Producto = {
  id: 5,
  nombre: "Cable 12 AWG",
  descripcion: "Cable de cobre",
  precio_unitario: 12.5,
  unidad_medida: "metro",
  activo: true,
  stock_actual: 8,
  stock_minimo: 10,
  costo_promedio: 8,
};

function material(overrides: Partial<OrdenItem> = {}): OrdenItem {
  return {
    id: 1,
    orden_id: 9,
    tipo: "MATERIAL",
    servicio_id: null,
    producto_id: 5,
    descripcion: null,
    unidad_medida: null,
    cantidad: 5,
    precio_unitario: 12.5,
    total_linea: 62.5,
    producto: PRODUCTO,
    ...overrides,
  };
}

describe("movimientos de inventario", () => {
  it("normaliza el tipo y usa metadatos legibles", () => {
    expect(parseTipoMovimiento("entrada")).toBe("ENTRADA");
    expect(parseTipoMovimiento("Consumo")).toBe("CONSUMO");
    expect(parseTipoMovimiento("otro")).toBeNull();
    expect(movimientoMeta("SALIDA").tone).toBe("accent");
    expect(movimientoMeta("desconocido").label).toBe("Desconocido");
  });

  it("deriva el signo visible del tipo y formatea la cantidad", () => {
    expect(movimientoSigno("ENTRADA", 4)).toBe("+");
    expect(movimientoSigno("SALIDA", 4)).toBe("−");
    expect(movimientoSigno("CONSUMO", 4)).toBe("−");
    expect(movimientoSigno("AJUSTE", -2)).toBe("−");
    expect(movimientoSigno("AJUSTE", 2)).toBe("+");
    expect(formatCantidadMovimiento({ tipo: "ENTRADA", cantidad: 4 })).toBe(
      "+4",
    );
    expect(formatCantidadMovimiento({ tipo: "SALIDA", cantidad: 3 })).toBe(
      "−3",
    );
    expect(formatCantidadMovimiento({ tipo: "AJUSTE", cantidad: -1 })).toBe(
      "−1",
    );
  });
});

describe("stock de productos", () => {
  it("respeta stock_bajo del backend y cae a la comparación local", () => {
    expect(productoStockBajo(PRODUCTO)).toBe(true);
    expect(productoStockBajo({ ...PRODUCTO, stock_bajo: false })).toBe(false);
    expect(
      productoStockBajo({ stock_actual: 3, stock_minimo: 2 }),
    ).toBe(false);
  });

  it("calcula el valor de stock con fallback al costo promedio", () => {
    expect(productoValorStock(PRODUCTO)).toBe(64);
    expect(
      productoValorStock({ ...PRODUCTO, valor_stock: 99.5 }),
    ).toBe(99.5);
  });

  it("clasifica agotado, bajo y normal", () => {
    expect(
      productoStockEstado({ stock_actual: 0, stock_minimo: 5 }).estado,
    ).toBe("agotado");
    expect(
      productoStockEstado({ stock_actual: 4, stock_minimo: 5 }).estado,
    ).toBe("bajo");
    expect(
      productoStockEstado({ stock_actual: 8, stock_minimo: 5 }).estado,
    ).toBe("normal");
  });

  it("arma opciones de catálogo con stock y mínimo", () => {
    const [option] = productoCatalogOptions([PRODUCTO]);

    expect(option.id).toBe(5);
    expect(option.label).toBe("Cable 12 AWG");
    expect(option.description).toContain("Stock 8 metro");
    expect(option.description).toContain("mínimo 10 metro");
  });
});

describe("materiales de una orden", () => {
  it("filtra solo líneas MATERIAL con producto", () => {
    const items: OrdenItem[] = [
      material(),
      material({
        id: 2,
        tipo: "SERVICIO",
        producto: null,
        producto_id: null,
      }),
      material({ id: 3, producto: null }),
      material({ id: 4, tipo: "LIBRE", producto: null, producto_id: null }),
    ];

    expect(ordenMateriales(items).map((item) => item.id)).toEqual([1]);
  });

  it("calcula consumido y pendiente con los campos del backend", () => {
    expect(
      materialPendienteCantidad(
        material({ cantidad: 5, cantidad_consumida: 2, cantidad_pendiente: 3 }),
      ),
    ).toBe(3);
    expect(
      materialConsumidoCantidad(
        material({ cantidad: 5, cantidad_consumida: 2, cantidad_pendiente: 3 }),
      ),
    ).toBe(2);
    expect(materialEstaConsumido(material({ consumido: false, cantidad_pendiente: 2 }))).toBe(
      false,
    );
    expect(materialEstaConsumido(material({ consumido: true }))).toBe(true);
    expect(materialPendienteCantidad(material({ consumido: true }))).toBe(0);
  });

  it("cae a los campos derivados cuando faltan los del backend", () => {
    expect(
      materialPendienteCantidad(material({ cantidad: 5, consumido: false })),
    ).toBe(5);
    expect(materialConsumidoCantidad(material({ cantidad: 5, consumido: true }))).toBe(
      5,
    );
  });

  it("detecta stock insuficiente solo si hay pendiente", () => {
    expect(
      materialStockInsuficiente(
        material({
          cantidad: 5,
          cantidad_pendiente: 4,
          producto: { ...PRODUCTO, stock_actual: 2 },
        }),
      ),
    ).toBe(true);
    expect(
      materialStockInsuficiente(
        material({
          cantidad: 5,
          cantidad_pendiente: 0,
          producto: { ...PRODUCTO, stock_actual: 2 },
        }),
      ),
    ).toBe(false);
  });

  it("lista los materiales con pendiente", () => {
    const items = [
      material({ id: 1, cantidad: 5, cantidad_pendiente: 2 }),
      material({ id: 2, cantidad: 5, cantidad_pendiente: 0 }),
    ];

    expect(materialesPendientes(items).map((item) => item.id)).toEqual([1]);
  });
});

describe("query de inventario", () => {
  it("serializa los filtros de existencias", () => {
    const href = existenciasHref({
      search: "cable",
      bajoStock: true,
      activo: "activo",
      page: 3,
    });
    const params = new URLSearchParams(href.split("?")[1]);

    expect(href.startsWith("/inventario?")).toBe(true);
    expect(params.get("tab")).toBe("existencias");
    expect(params.get("search")).toBe("cable");
    expect(params.get("bajo_stock")).toBe("1");
    expect(params.get("activo")).toBe("1");
    expect(params.get("page")).toBe("3");
  });

  it("omite filtros vacíos y la primera página", () => {
    expect(
      existenciasHref({
        search: "",
        bajoStock: false,
        activo: "",
        page: 1,
      }),
    ).toBe("/inventario?tab=existencias");
  });

  it("serializa los filtros de movimientos", () => {
    const href = movimientosHref({
      search: "consumo",
      tipo: "CONSUMO",
      productoId: 5,
      desde: "2026-10-01",
      hasta: "2026-10-31",
      page: 2,
    });
    const params = new URLSearchParams(href.split("?")[1]);

    expect(params.get("tab")).toBe("movimientos");
    expect(params.get("tipo")).toBe("CONSUMO");
    expect(params.get("producto_id")).toBe("5");
    expect(params.get("desde")).toBe("2026-10-01");
    expect(params.get("hasta")).toBe("2026-10-31");
    expect(params.get("page")).toBe("2");
  });
});
