import { describe, expect, it } from "vitest";
import { etiquetaMoneda, formatMoney } from "@/lib/utils";

/** Mismo formato en pantallas, portal y PDF: "Bs 1.250,75". */
describe("formato de montos", () => {
  const sinNbsp = (texto: string) => texto.replace(/ /g, " ");

  it("bolivianos con punto de miles y coma decimal", () => {
    expect(sinNbsp(formatMoney(1250.75))).toBe("Bs 1.250,75");
    expect(sinNbsp(formatMoney(144307.78, "BOB"))).toBe("Bs 144.307,78");
    expect(sinNbsp(formatMoney(0))).toBe("Bs 0,00");
  });

  it("otras monedas con su código, como el PDF", () => {
    expect(sinNbsp(formatMoney(1250.75, "USD"))).toBe("USD 1.250,75");
  });

  it("la moneda se nombra para personas, sin repetir el código", () => {
    expect(etiquetaMoneda("BOB")).toBe("Bolivianos (Bs)");
    expect(etiquetaMoneda(null)).toBe("Bolivianos (Bs)");
    expect(etiquetaMoneda("usd")).toBe("Dólares (USD)");
  });
});
