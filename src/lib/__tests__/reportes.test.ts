import { describe, expect, it } from "vitest";
import {
  formatPorcentaje,
  mesActualBolivia,
  parseReportesQuery,
  reporteCsvHref,
  reportesHref,
  reportesPestanas,
} from "@/lib/reportes";
import { can } from "@/lib/permissions";
import { navItemsFor } from "@/components/layout/nav";
import type { User } from "@/lib/api/types";

describe("mesActualBolivia", () => {
  it("usa el mes de Bolivia aunque en UTC ya sea el mes siguiente", () => {
    // 1 de diciembre 02:00 UTC = 30 de noviembre 22:00 en La Paz.
    expect(mesActualBolivia(new Date("2026-12-01T02:00:00Z"))).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-30",
    });
  });

  it("calcula el último día de febrero", () => {
    expect(mesActualBolivia(new Date("2028-02-10T12:00:00Z")).hasta).toBe(
      "2028-02-29",
    );
  });
});

describe("parseReportesQuery", () => {
  const now = new Date("2026-11-15T16:00:00Z");

  it("sin parámetros es el mes actual en la pestaña de órdenes", () => {
    expect(parseReportesQuery({}, now)).toEqual({
      tab: "ordenes",
      desde: "2026-11-01",
      hasta: "2026-11-30",
      clienteId: "",
      operarioId: "",
    });
  });

  it("ignora fechas inválidas y filtros no numéricos", () => {
    expect(
      parseReportesQuery(
        { tab: "nada", desde: "10/11/2026", hasta: "2026-11-20", cliente_id: "abc", operario_id: "4" },
        now,
      ),
    ).toEqual({
      tab: "ordenes",
      desde: "2026-11-01",
      hasta: "2026-11-20",
      clienteId: "",
      operarioId: 4,
    });
  });
});

describe("enlaces", () => {
  const query = {
    tab: "ordenes" as const,
    desde: "2026-11-01",
    hasta: "2026-11-30",
    clienteId: 3 as const,
    operarioId: "" as const,
  };

  it("arma la URL de la pantalla y la del CSV con el mismo periodo", () => {
    expect(reportesHref(query)).toBe(
      "/reportes?desde=2026-11-01&hasta=2026-11-30&cliente_id=3",
    );
    expect(reporteCsvHref(query)).toBe(
      "/api/v1/reportes/ordenes?desde=2026-11-01&hasta=2026-11-30&cliente_id=3&formato=csv",
    );
  });

  it("las pestañas conservan el periodo y los filtros", () => {
    expect(reportesPestanas(query)[0]).toEqual({
      key: "ordenes",
      label: "Órdenes de servicio",
      href: "/reportes?desde=2026-11-01&hasta=2026-11-30&cliente_id=3",
    });
  });
});

describe("formatPorcentaje", () => {
  it("usa coma decimal y muestra guion sin dato", () => {
    expect(formatPorcentaje(66.7)).toBe("66,7 %");
    expect(formatPorcentaje(100)).toBe("100 %");
    expect(formatPorcentaje(null)).toBe("—");
  });
});

describe("acceso a Reportes", () => {
  const base: Omit<User, "rol"> = {
    id: 1,
    name: "Usuario",
    email: "u@example.com",
    activo: true,
    cliente_id: null,
    empresa_id: 1,
  };

  it("solo el administrador ve Reportes en el menú y tiene el permiso", () => {
    const hrefs = (rol: User["rol"]) =>
      navItemsFor(rol).flatMap((group) => group.items.map((item) => item.href));

    expect(hrefs("admin")).toContain("/reportes");
    expect(hrefs("operario")).not.toContain("/reportes");
    expect(can({ ...base, rol: "admin" }, "reportes.ver")).toBe(true);
    expect(can({ ...base, rol: "operario" }, "reportes.ver")).toBe(false);
  });

  it("Reportes ya no está marcado como pendiente", () => {
    const item = navItemsFor("admin")
      .flatMap((group) => group.items)
      .find((navItem) => navItem.href === "/reportes");

    expect(item?.ready).toBe(true);
  });
});
