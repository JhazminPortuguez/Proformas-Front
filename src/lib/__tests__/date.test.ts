import { describe, expect, it } from "vitest";
import { formatDateOnly } from "@/lib/utils";

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
