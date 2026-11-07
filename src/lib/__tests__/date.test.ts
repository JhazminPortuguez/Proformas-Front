import { describe, expect, it } from "vitest";
import {
  formatDateNumeric,
  formatDateOnly,
  formatDateTimeNumeric,
} from "@/lib/utils";

const utcDate = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function expected(year: number, month: number, day: number): string {
  return utcDate.format(new Date(Date.UTC(year, month - 1, day)));
}

describe("formatDateOnly", () => {
  it("no resta un día a 2026-01-01 en America/La_Paz", () => {
    const result = formatDateOnly("2026-01-01");

    expect(result).toBe(expected(2026, 1, 1));
    expect(result).not.toBe(expected(2025, 12, 31));
  });

  it("formatea 2026-10-25 como fecha calendario", () => {
    expect(formatDateOnly("2026-10-25")).toBe(expected(2026, 10, 25));
  });

  it("formatea 2026-12-31 sin desbordar el año", () => {
    const result = formatDateOnly("2026-12-31");

    expect(result).toBe(expected(2026, 12, 31));
    expect(result).not.toBe(expected(2027, 1, 1));
  });

  it("acepta marcas de tiempo ISO tomando la parte date-only", () => {
    expect(formatDateOnly("2026-10-25T23:59:59-04:00")).toBe(
      expected(2026, 10, 25),
    );
  });

  it("muestra un instante UTC con el día de Bolivia, no el de UTC", () => {
    // 28/10 a las 21:47 en America/La_Paz es 29/10 01:47 en UTC.
    expect(formatDateOnly("2026-10-29T01:47:00Z")).toBe(
      expected(2026, 10, 28),
    );
    expect(formatDateOnly("2026-10-29T01:47:00.000000Z")).toBe(
      expected(2026, 10, 28),
    );
  });

  it("una fecha sin hora sigue mostrando el mismo día", () => {
    expect(formatDateOnly("2026-10-28")).toBe(expected(2026, 10, 28));
  });

  it("no reescribe fechas inexistentes ni valores vacíos", () => {
    expect(formatDateOnly("2026-02-30")).toBe("2026-02-30");
    expect(formatDateOnly("")).toBe("—");
    expect(formatDateOnly(null)).toBe("—");
  });
});

describe("formatDateNumeric", () => {
  it("muestra dd/mm/aaaa del día en Bolivia", () => {
    expect(formatDateNumeric("2026-10-29T01:47:00.000000Z")).toBe(
      "28/10/2026",
    );
    expect(formatDateNumeric("2026-10-29T15:00:00Z")).toBe("29/10/2026");
  });

  it("reordena una fecha sin hora y tolera vacíos", () => {
    expect(formatDateNumeric("2026-01-05")).toBe("05/01/2026");
    expect(formatDateNumeric(null)).toBe("—");
  });
});

describe("formatDateTimeNumeric", () => {
  it("muestra dd/mm/aaaa HH:mm en 24 horas y hora de Bolivia", () => {
    // 04:39 UTC = 00:39 en La Paz.
    expect(formatDateTimeNumeric("2026-11-02T04:39:00.000000Z")).toBe(
      "02/11/2026 00:39",
    );
    expect(formatDateTimeNumeric("2026-10-26T15:57:00Z")).toBe(
      "26/10/2026 11:57",
    );
    // Tarde: 16:30, no "4:30 p. m.".
    expect(formatDateTimeNumeric("2026-10-26T20:30:00Z")).toBe(
      "26/10/2026 16:30",
    );
    // Cambio de día: 02:00 UTC del 1 de enero es 31/12 a las 22:00.
    expect(formatDateTimeNumeric("2027-01-01T02:00:00Z")).toBe(
      "31/12/2026 22:00",
    );
  });

  it("tolera vacíos y textos que no son fecha", () => {
    expect(formatDateTimeNumeric(null)).toBe("—");
    expect(formatDateTimeNumeric("")).toBe("—");
    expect(formatDateTimeNumeric("no es fecha")).toBe("no es fecha");
  });
});
