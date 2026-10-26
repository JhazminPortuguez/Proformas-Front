import { describe, expect, it } from "vitest";
import {
  apiErrorFromResponse,
  apiErrorMessage,
  isTechnicalMessage,
  NETWORK_ERROR_MESSAGE,
  normalizeFieldErrors,
  statusFallback,
} from "@/lib/api/errors";
import { ApiError } from "@/lib/api/types";

describe("mapeo de errores de API", () => {
  it("mapea 422 por campo y usa un mensaje de resumen en español", () => {
    const error = apiErrorFromResponse(422, {
      message: "The given data was invalid.",
      errors: {
        nombre_razon: ["El nombre o razón social es obligatorio."],
        email: ["Ingresa un correo válido."],
      },
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.message).toBe("Revisa los datos ingresados.");
    expect(error.errors?.nombre_razon).toEqual([
      "El nombre o razón social es obligatorio.",
    ]);
  });

  it("ignora mensajes técnicos de Laravel y usa el fallback", () => {
    const error = apiErrorFromResponse(422, {
      errors: {
        nombre: ["SQLSTATE[23502]: Not null violation: column nombre"],
        telefono: ["<html>error</html>"],
      },
    });

    expect(error.errors).toEqual({
      nombre: ["Revisa este campo."],
      telefono: ["Revisa este campo."],
    });
  });

  it("usa fallback fijo en 403, 419 y 429", () => {
    expect(apiErrorFromResponse(403, { message: "Forbidden" }).message).toBe(
      "No tienes permisos para realizar esta acción.",
    );
    expect(apiErrorFromResponse(419, { message: "CSRF token mismatch" }).message)
      .toBe("Tu sesión expiró. Intenta nuevamente.");
    expect(apiErrorFromResponse(429, { message: "Too Many Requests" }).message)
      .toBe("Demasiados intentos. Espera un momento e intenta nuevamente.");
  });

  it("usa el mensaje de dominio en un 409 cuando es legible", () => {
    const error = apiErrorFromResponse(409, {
      message: "El cliente tiene proformas asociadas.",
    });

    expect(error.message).toBe("El cliente tiene proformas asociadas.");
  });

  it("centraliza el mensaje de red", () => {
    expect(apiErrorFromResponse(0, null).message).toBe(NETWORK_ERROR_MESSAGE);
    expect(statusFallback(0)).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("no deja pasar mensajes técnicos a la interfaz", () => {
    expect(isTechnicalMessage("SQLSTATE[42P01]: undefined table")).toBe(true);
    expect(isTechnicalMessage("El cliente tiene proformas asociadas.")).toBe(
      false,
    );

    expect(
      apiErrorMessage(
        new ApiError("SQLSTATE[42P01]: undefined table", 500),
        "No pudimos cargar los clientes.",
      ),
    ).toBe("Ocurrió un error en el servidor. Intenta nuevamente.");

    expect(
      apiErrorMessage(new Error("TypeError: x is not a function"), "Fallback."),
    ).toBe("Fallback.");
  });

  it("normaliza y deduplica errores por campo", () => {
    expect(
      normalizeFieldErrors({
        email: ["Ingresa un correo válido.", "Ingresa un correo válido."],
        nombre: [],
        telefono: ["SQLSTATE error"],
      }),
    ).toEqual({
      email: ["Ingresa un correo válido."],
      telefono: ["Revisa este campo."],
    });
  });
});
