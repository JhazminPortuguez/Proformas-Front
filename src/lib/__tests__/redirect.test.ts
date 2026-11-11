import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/redirect";

const ORIGEN = "http://localhost:3000";

describe("safeNextPath (A-07)", () => {
  it("acepta rutas internas con query y hash", () => {
    expect(safeNextPath("/proformas", ORIGEN)).toBe("/proformas");
    expect(safeNextPath("/proformas?estado=ENVIADA#lista", ORIGEN)).toBe(
      "/proformas?estado=ENVIADA#lista",
    );
    expect(safeNextPath("/ordenes/5?tab=historial", ORIGEN)).toBe("/ordenes/5?tab=historial");
  });

  it("rechaza destinos externos o maliciosos", () => {
    for (const malo of [
      "https://evil.example/robar",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "javascript:alert(1)",
      "data:text/html,hola",
      "evil.example",
      "http://localhost:3000.evil.example/",
      "  //evil.example",
    ]) {
      expect(safeNextPath(malo, ORIGEN), JSON.stringify(malo)).toBeNull();
    }
  });

  it("no lleva a la API, a sanctum ni de vuelta al login", () => {
    expect(safeNextPath("/api/v1/users", ORIGEN)).toBeNull();
    expect(safeNextPath("/sanctum/csrf-cookie", ORIGEN)).toBeNull();
    expect(safeNextPath("/login", ORIGEN)).toBeNull();
    expect(safeNextPath("/registro?x=1", ORIGEN)).toBeNull();
  });

  it("sin valor no hay destino", () => {
    expect(safeNextPath(null, ORIGEN)).toBeNull();
    expect(safeNextPath("", ORIGEN)).toBeNull();
  });
});
