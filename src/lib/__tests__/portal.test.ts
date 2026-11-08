import { describe, expect, it } from "vitest";
import {
  PORTAL_NAV,
  PROFORMA_FILTROS,
  SOLICITUD_FILTROS,
  formatDuracion,
  parseFiltro,
  portalListHref,
  portalNavActivo,
  resumenItems,
  solicitarHref,
  telHref,
} from "@/lib/portal";

describe("portal: filtros", () => {
  it("las proformas nunca ofrecen Borrador", () => {
    expect(PROFORMA_FILTROS.map((f) => f.label)).toEqual([
      "Todas",
      "Por revisar",
      "Aceptadas",
      "Rechazadas",
    ]);
    expect(PROFORMA_FILTROS.map((f) => f.estado)).not.toContain("BORRADOR");
    expect(parseFiltro(PROFORMA_FILTROS, "por-revisar").estado).toBe("ENVIADA");
  });

  it("las solicitudes solo filtran Pendiente y Atendida", () => {
    expect(SOLICITUD_FILTROS.map((f) => f.label)).toEqual([
      "Todas",
      "Pendiente",
      "Atendida",
    ]);
  });

  it("un filtro desconocido vuelve a Todas", () => {
    expect(parseFiltro(PROFORMA_FILTROS, "borrador").key).toBe("todas");
    expect(parseFiltro(SOLICITUD_FILTROS, "").key).toBe("todas");
  });

  it("arma el href sin parámetros vacíos", () => {
    expect(portalListHref("/portal/proformas", { filtro: "todas", page: 1 })).toBe(
      "/portal/proformas",
    );
    expect(
      portalListHref("/portal/proformas", { filtro: "aceptadas", page: 2, perPage: 25 }),
    ).toBe("/portal/proformas?filtro=aceptadas&page=2&per_page=25");
  });
});

describe("portal: menú", () => {
  it("marca el enlace activo; Inicio solo en /portal", () => {
    const [inicio, servicios, proformas] = PORTAL_NAV;

    expect(portalNavActivo("/portal", inicio)).toBe(true);
    expect(portalNavActivo("/portal/proformas", inicio)).toBe(false);
    expect(portalNavActivo("/portal/proformas/3", proformas)).toBe(true);
    expect(portalNavActivo("/portal/proformas", servicios)).toBe(false);
  });
});

describe("portal: formatos", () => {
  it("resume los ítems con el primero y '+N más'", () => {
    expect(resumenItems("Instalación", 1)).toBe("Instalación");
    expect(resumenItems("Instalación", 3)).toBe("Instalación +2 más");
    expect(resumenItems(null, 0)).toBe("—");
  });

  it("muestra la duración en horas y minutos", () => {
    expect(formatDuracion(45)).toBe("45 min");
    expect(formatDuracion(120)).toBe("2 h");
    expect(formatDuracion(90)).toBe("1 h 30 min");
    expect(formatDuracion(null)).toBe("—");
    expect(formatDuracion(0)).toBe("—");
  });

  it("arma enlaces de teléfono y de solicitud", () => {
    expect(telHref("(+591) 4-4412345")).toBe("tel:+59144412345");
    expect(solicitarHref(7)).toBe("/portal/solicitar?servicio=7");
    expect(solicitarHref()).toBe("/portal/solicitar");
  });
});
