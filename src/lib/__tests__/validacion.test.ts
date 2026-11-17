import { describe, expect, it } from "vitest";
import { validarCliente } from "@/lib/clientes";
import {
  decimalesDe,
  esCorreo,
  largo,
  mensajeLargoMaximo,
  validarLargos,
} from "@/lib/validacion";

describe("decimalesDe", () => {
  it("cuenta los decimales con punto o con coma", () => {
    expect(decimalesDe("10")).toBe(0);
    expect(decimalesDe("10.5")).toBe(1);
    expect(decimalesDe("10,25")).toBe(2);
    expect(decimalesDe("1.234")).toBe(3);
    expect(decimalesDe(" 1,2345 ")).toBe(4);
  });

  it("con coma, los puntos son de miles", () => {
    expect(decimalesDe("1.250,50")).toBe(2);
  });
});

describe("largo", () => {
  it("cuenta caracteres, no unidades UTF-16 (igual que mb_strlen)", () => {
    expect(largo("ñandú")).toBe(5);
    expect(largo("🔧🔧")).toBe(2);
  });
});

describe("esCorreo", () => {
  it("acepta correos con dominio y rechaza los incompletos", () => {
    expect(esCorreo("ana@empresa.bo")).toBe(true);
    expect(esCorreo("ana@empresa")).toBe(false);
    expect(esCorreo("ana empresa.bo")).toBe(false);
    expect(esCorreo("@empresa.bo")).toBe(false);
  });
});

describe("validarLargos", () => {
  it("usa el texto del back y no pisa un error anterior", () => {
    const errores = validarLargos({ b: ["Otro error."] }, [
      ["a", "nombre", "x".repeat(4), 3],
      ["b", "nombre", "x".repeat(4), 3],
      ["c", "nombre", "xyz", 3],
    ]);

    expect(errores).toEqual({
      a: ["El campo nombre no debe tener más de 3 caracteres."],
      b: ["Otro error."],
    });
    expect(mensajeLargoMaximo("dirección", 255)).toBe(
      "El campo dirección no debe tener más de 255 caracteres.",
    );
  });
});

describe("validarCliente", () => {
  const VALIDO = {
    nombre_razon: "Constructora Andina",
    nit_ci: "123456",
    telefono: "70011223",
    email: "compras@andina.bo",
    direccion: "Av. Blanco Galindo 123",
  };

  it("un cliente completo y correcto no tiene errores", () => {
    expect(validarCliente(VALIDO)).toEqual({});
    expect(
      validarCliente({ ...VALIDO, nit_ci: "", telefono: "", email: "", direccion: "" }),
    ).toEqual({});
  });

  it("exige el nombre", () => {
    expect(validarCliente({ ...VALIDO, nombre_razon: "   " })).toEqual({
      nombre_razon: ["El nombre o razón social es obligatorio."],
    });
  });

  it("revisa el formato del correo", () => {
    expect(validarCliente({ ...VALIDO, email: "compras@" })).toEqual({
      email: ["El campo correo electrónico debe ser una dirección de correo válida."],
    });
  });

  it("aplica los mismos largos que StoreClienteRequest", () => {
    expect(
      validarCliente({
        nombre_razon: "n".repeat(201),
        nit_ci: "1".repeat(31),
        telefono: "7".repeat(31),
        email: `${"a".repeat(140)}@empresa.bo`,
        direccion: "d".repeat(256),
      }),
    ).toEqual({
      nombre_razon: ["El campo nombre o razón social no debe tener más de 200 caracteres."],
      nit_ci: ["El campo NIT/CI no debe tener más de 30 caracteres."],
      telefono: ["El campo teléfono no debe tener más de 30 caracteres."],
      email: ["El campo correo electrónico no debe tener más de 150 caracteres."],
      direccion: ["El campo dirección no debe tener más de 255 caracteres."],
    });

    // Justo en el límite pasa.
    expect(
      validarCliente({ ...VALIDO, nombre_razon: "n".repeat(200), nit_ci: "1".repeat(30) }),
    ).toEqual({});
  });
});
