import { describe, expect, it } from "vitest";
import {
  esOrdenTerminal,
  esProformaTerminal,
  ordenEstadoMeta,
  parseOrdenEstado,
  parseProformaEstado,
  proformaEstadoMeta,
  puedeTransicionarOrden,
  puedeTransicionarProforma,
  siguientesOrdenEstados,
} from "@/lib/estados";

describe("estados de proforma", () => {
  it("normaliza mayúsculas y minúsculas", () => {
    expect(parseProformaEstado("borrador")).toBe("BORRADOR");
    expect(parseProformaEstado(" Enviada ")).toBe("ENVIADA");
    expect(parseProformaEstado("desconocida")).toBeNull();
  });

  it("devuelve etiqueta y tono para la UI", () => {
    expect(proformaEstadoMeta("aceptada")).toMatchObject({
      label: "Aceptada",
      tone: "success",
    });
    expect(proformaEstadoMeta("vencida").tone).toBe("neutral");
  });

  it("solo permite transiciones legales", () => {
    expect(puedeTransicionarProforma("BORRADOR", "ENVIADA")).toBe(true);
    expect(puedeTransicionarProforma("ENVIADA", "ACEPTADA")).toBe(true);
    expect(puedeTransicionarProforma("BORRADOR", "ACEPTADA")).toBe(false);
    expect(esProformaTerminal("ACEPTADA")).toBe(true);
    expect(esProformaTerminal("ENVIADA")).toBe(false);
  });

  it("no rompe con un estado desconocido del backend", () => {
    expect(proformaEstadoMeta("EN_REVISION")).toEqual({
      label: "En revision",
      tone: "neutral",
      description: "Estado sin descripción registrada.",
    });
  });
});

describe("estados de orden", () => {
  it("respeta el flujo pendiente → asignada → en proceso → finalizada", () => {
    expect(siguientesOrdenEstados("PENDIENTE")).toEqual([
      "ASIGNADA",
      "CANCELADA",
    ]);
    expect(puedeTransicionarOrden("ASIGNADA", "EN_PROCESO")).toBe(true);
    expect(puedeTransicionarOrden("PENDIENTE", "FINALIZADA")).toBe(false);
    expect(esOrdenTerminal("FINALIZADA")).toBe(true);
  });

  it("normaliza separadores con espacio o guion", () => {
    expect(parseOrdenEstado("en proceso")).toBe("EN_PROCESO");
    expect(parseOrdenEstado("EN-PROCESO")).toBe("EN_PROCESO");
    expect(ordenEstadoMeta("en proceso").label).toBe("En proceso");
  });
});
