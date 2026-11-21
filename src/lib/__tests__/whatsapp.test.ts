import { describe, expect, it } from "vitest";
import {
  enlaceWhatsApp,
  MOTIVO_SIN_TELEFONO,
  MOTIVO_TELEFONO_INVALIDO,
  numeroWhatsApp,
} from "@/lib/whatsapp";

const DATOS = {
  telefono: "71234567",
  numero: "PR-2026-000042",
  total: 1250.75,
  moneda: "BOB",
  fechaValidez: "2026-11-30",
  enlacePortal: "https://proformas.test/portal/proformas/42",
};

describe("numeroWhatsApp", () => {
  it.each([
    ["71234567", "59171234567"],
    ["712-34-567", "59171234567"],
    ["+591 71234567", "59171234567"],
    ["591 712 34567", "59171234567"],
    ["0059171234567", "59171234567"],
  ])("%s → %s", (entrada, esperado) => {
    expect(numeroWhatsApp(entrada)).toBe(esperado);
  });

  it.each(["", "1234", "4-123456", "+54 11 1234 5678", null])("%s no es un número válido", (entrada) => {
    expect(numeroWhatsApp(entrada)).toBeNull();
  });
});

describe("enlaceWhatsApp", () => {
  it("arma https://wa.me/591… con el mensaje escrito y codificado", () => {
    const { url, motivo } = enlaceWhatsApp(DATOS);

    expect(motivo).toBeNull();
    expect(url).toMatch(/^https:\/\/wa\.me\/59171234567\?text=/);

    const enlace = new URL(url!);
    const texto = enlace.searchParams.get("text");

    expect(enlace.searchParams.size).toBe(1);
    expect(texto).toBe(
      "Hola, le compartimos la proforma PR-2026-000042 por un total de Bs 1.250,75, válida hasta el 30/11/2026.\n" +
        "Puede verla, descargarla y aceptarla en su portal: https://proformas.test/portal/proformas/42",
    );
    // Sin espacios duros ni caracteres sin codificar en la URL.
    expect(url).not.toMatch(/[\s ]/);
    expect(url).toContain("%0A");
  });

  it("sin validez, el mensaje no la menciona", () => {
    const texto = new URL(enlaceWhatsApp({ ...DATOS, fechaValidez: null }).url!).searchParams.get("text");

    expect(texto).toContain("por un total de Bs 1.250,75.\n");
    expect(texto).not.toContain("válida");
  });

  it("sin teléfono o con uno inválido, no hay enlace y explica por qué", () => {
    expect(enlaceWhatsApp({ ...DATOS, telefono: null })).toEqual({ url: null, motivo: MOTIVO_SIN_TELEFONO });
    expect(enlaceWhatsApp({ ...DATOS, telefono: "   " })).toEqual({ url: null, motivo: MOTIVO_SIN_TELEFONO });
    expect(enlaceWhatsApp({ ...DATOS, telefono: "4-4123" })).toEqual({ url: null, motivo: MOTIVO_TELEFONO_INVALIDO });
  });
});
