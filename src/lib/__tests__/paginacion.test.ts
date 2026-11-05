import { describe, expect, it } from "vitest";
import { clienteTabHref } from "@/lib/clientes";
import { COBROS_QUERY_VACIA, cobrosHref } from "@/lib/cobros";
import { existenciasHref, movimientosHref } from "@/lib/inventario";
import { ordenesHref, ordenesSinFiltros, type OrdenesQuery } from "@/lib/ordenes";
import {
  FILAS_POR_PAGINA,
  filasParam,
  parseFilasPorPagina,
} from "@/lib/paginacion";

describe("filas por página", () => {
  it("ofrece 15, 25 y 50 y cualquier otro valor vuelve a 15", () => {
    expect(FILAS_POR_PAGINA).toEqual([15, 25, 50]);
    expect(parseFilasPorPagina("25")).toBe(25);
    expect(parseFilasPorPagina("50")).toBe(50);
    expect(parseFilasPorPagina("100")).toBe(15);
    expect(parseFilasPorPagina("abc")).toBe(15);
    expect(parseFilasPorPagina(undefined)).toBe(15);
  });

  it("con 15 filas no agrega per_page a la URL", () => {
    expect(filasParam(15)).toBe("");
    expect(filasParam(undefined)).toBe("");
    expect(filasParam(50)).toBe(50);
  });
});

describe("las URLs de los listados conservan las filas por página", () => {
  const ORDENES: OrdenesQuery = {
    search: "cable",
    estado: "EN_PROCESO",
    operarioId: "",
    clienteId: 3,
    vista: "tablero",
    page: 2,
    perPage: 50,
  };

  it("órdenes, también al limpiar filtros", () => {
    expect(ordenesHref(ORDENES)).toBe(
      "/ordenes?search=cable&estado=EN_PROCESO&cliente_id=3&vista=tablero&per_page=50&page=2",
    );
    expect(ordenesHref(ordenesSinFiltros(ORDENES))).toBe(
      "/ordenes?estado=EN_PROCESO&vista=tablero&per_page=50",
    );
  });

  it("cuentas por cobrar", () => {
    expect(cobrosHref({ ...COBROS_QUERY_VACIA, vencida: true, perPage: 25 })).toBe(
      "/cobros?vencida=1&per_page=25",
    );
  });

  it("inventario: existencias y movimientos", () => {
    expect(
      existenciasHref({ search: "", bajoStock: true, activo: "", page: 1, perPage: 25 }),
    ).toBe("/inventario?tab=existencias&bajo_stock=1&per_page=25");
    expect(
      movimientosHref({
        search: "",
        tipo: "CONSUMO",
        productoId: "",
        desde: "",
        hasta: "",
        page: 3,
        perPage: 50,
      }),
    ).toBe("/inventario?tab=movimientos&tipo=CONSUMO&per_page=50&page=3");
  });

  it("pestañas de la ficha del cliente", () => {
    expect(clienteTabHref(5, "ordenes", 2, 25)).toBe(
      "/clientes/5?tab=ordenes&per_page=25&page=2",
    );
    expect(clienteTabHref(5, "ordenes", 1, 15)).toBe("/clientes/5?tab=ordenes");
  });
});
