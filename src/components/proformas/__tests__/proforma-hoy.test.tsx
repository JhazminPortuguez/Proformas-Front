import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProformaForm } from "@/components/proformas/proforma-form";
import { avisarCambioDeDia } from "@/lib/hooks/use-hoy";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api/client", () => ({
  clientes: { buscar: vi.fn().mockResolvedValue([]) },
  servicios: { buscar: vi.fn().mockResolvedValue([]) },
  productos: { buscar: vi.fn().mockResolvedValue([]) },
  proformas: { enviar: vi.fn(), create: vi.fn(), update: vi.fn() },
  proformaPdfUrl: (id: number) => `/api/v1/proformas/${id}/pdf`,
}));

function renderizar() {
  render(
    <ProformaForm proforma={null} clientes={[]} servicios={[]} productos={[]} today="2026-10-31" />,
  );

  return screen.getByLabelText(/Emisión/) as HTMLInputElement;
}

/** 01/11/2026 00:01 en Bolivia (UTC-4). */
function pasarLaMedianoche() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-01T04:01:00Z"));
  act(() => avisarCambioDeDia());
}

afterEach(() => {
  vi.useRealTimers();
});

describe("propuesta 13: 'hoy' en un formulario abierto", () => {
  it("al cambiar el día, una Emisión sin tocar pasa a hoy y el máximo también", () => {
    const emision = renderizar();

    expect(emision.value).toBe("2026-10-31");
    expect(emision.max).toBe("2026-10-31");

    pasarLaMedianoche();

    expect(emision.value).toBe("2026-11-01");
    expect(emision.max).toBe("2026-11-01");
  });

  it("si la persona eligió otra fecha, se respeta; el máximo igual se mueve", () => {
    const emision = renderizar();

    fireEvent.change(emision, { target: { value: "2026-10-20" } });
    expect(emision.value).toBe("2026-10-20");

    pasarLaMedianoche();

    expect(emision.value).toBe("2026-10-20");
    expect(emision.max).toBe("2026-11-01");
  });
});

describe("ronda B: parámetros del sistema en una proforma nueva", () => {
  function conParametros() {
    render(
      <ProformaForm
        proforma={null}
        clientes={[]}
        servicios={[]}
        productos={[]}
        today="2026-10-31"
        parametros={{ impuesto_por_defecto: "15.00", dias_validez_por_defecto: 15 }}
      />,
    );

    return {
      validez: screen.getByLabelText(/Validez/) as HTMLInputElement,
      impuesto: screen.getByLabelText(/Impuesto/) as HTMLInputElement,
    };
  }

  it("empieza con el impuesto y la validez de los parámetros", () => {
    const { validez, impuesto } = conParametros();

    expect(impuesto.value).toBe("15");
    expect(validez.value).toBe("2026-11-15");
  });

  it("al cambiar el día, la validez sin tocar se mueve con la emisión", () => {
    const { validez } = conParametros();

    pasarLaMedianoche();

    expect(validez.value).toBe("2026-11-16");
  });
});
