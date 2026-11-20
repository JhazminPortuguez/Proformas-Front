import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AvisoCambioDeDia,
  INTERVALO_CAMBIO_DE_DIA_MS,
  seActualizaSola,
} from "@/components/layout/aviso-cambio-de-dia";

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn(), replace: vi.fn() }),
  usePathname: () => mocks.pathname,
}));

/**
 * D-02: la pantalla queda abierta y cambia el día (y el mes) en Bolivia.
 * 31/10/2026 23:59 en La Paz son las 03:59 UTC del 1/11.
 */
describe("AvisoCambioDeDia (D-02)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-11-01T03:59:00Z"));
    mocks.refresh.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function pasarMedianoche() {
    act(() => {
      vi.setSystemTime(new Date("2026-11-01T04:00:30Z"));
      vi.advanceTimersByTime(INTERVALO_CAMBIO_DE_DIA_MS);
    });
  }

  it("mientras sea el mismo día no hace nada", () => {
    // 23:50: tres minutos después sigue siendo 31/10.
    vi.setSystemTime(new Date("2026-11-01T03:50:00Z"));
    mocks.pathname = "/dashboard";
    render(<AvisoCambioDeDia />);

    act(() => {
      vi.advanceTimersByTime(INTERVALO_CAMBIO_DE_DIA_MS * 3);
    });

    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("en el dashboard actualiza solo al pasar la medianoche, sin aviso", () => {
    mocks.pathname = "/dashboard";
    render(<AvisoCambioDeDia />);

    pasarMedianoche();

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Empezó un mes nuevo")).toBeNull();

    // Ya tomó el día nuevo: el siguiente minuto no vuelve a actualizar.
    act(() => {
      vi.advanceTimersByTime(INTERVALO_CAMBIO_DE_DIA_MS);
    });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("en un formulario avisa y actualiza solo cuando la persona lo pide", () => {
    mocks.pathname = "/proformas/nueva";
    render(<AvisoCambioDeDia />);

    pasarMedianoche();

    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByText("Empezó un mes nuevo")).toBeInTheDocument();
    expect(
      screen.getByText(/se cargó el 31\/10\/2026 y ya es 01\/11\/2026/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Empezó un mes nuevo")).toBeNull();
  });

  it("también revisa al volver a la pestaña, sin esperar el minuto", () => {
    mocks.pathname = "/cobros";
    render(<AvisoCambioDeDia />);

    act(() => {
      vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
      fireEvent(document, new Event("visibilitychange"));
    });

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("decide qué pantallas se actualizan solas", () => {
    expect(seActualizaSola("/dashboard", "")).toBe(true);
    expect(seActualizaSola("/cobros", "?estado=pendiente")).toBe(true);
    expect(seActualizaSola("/inventario", "")).toBe(true);
    expect(seActualizaSola("/reportes", "?tab=cobros")).toBe(true);
    // Un rango elegido a mano no depende de "hoy".
    expect(seActualizaSola("/reportes", "?desde=2026-10-01&hasta=2026-10-31")).toBe(false);
    expect(seActualizaSola("/cobros/1", "")).toBe(false);
    expect(seActualizaSola("/proformas/nueva", "")).toBe(false);
  });
});
