import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrarPagoDialog } from "@/components/cobros/registrar-pago-dialog";
import { ApiError } from "@/lib/api/types";

const mocks = vi.hoisted(() => ({ registrarPago: vi.fn() }));

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
  cuentas: { registrarPago: mocks.registrarPago },
}));

const CUENTA = {
  id: 7,
  numero: "CXC-2026-000007",
  saldo: 400,
  monto_total: 400,
  total_pagado: 0,
  moneda: "BOB",
  fecha_emision: "2026-11-03",
};

function campoFecha(): HTMLInputElement {
  return screen.getByLabelText("Fecha del pago", { selector: "input" }) as HTMLInputElement;
}

async function registrar(fecha: string) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

  render(<RegistrarPagoDialog isOpen onOpenChange={vi.fn()} cuenta={CUENTA} />);

  await user.type(screen.getByLabelText("Monto", { selector: "input" }), "100");
  fireEvent.change(campoFecha(), { target: { value: fecha } });
  await user.click(screen.getByRole("button", { name: "Registrar pago" }));
}

describe("RegistrarPagoDialog · fecha del pago", () => {
  beforeEach(() => {
    mocks.registrarPago.mockReset();
    // 8/11/2026 a las 21:00 en Bolivia: en UTC ya es 9/11.
    vi.useFakeTimers({ now: new Date("2026-11-09T01:00:00Z"), shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("propone hoy en Bolivia y limita el campo entre la emisión y hoy", () => {
    render(<RegistrarPagoDialog isOpen onOpenChange={vi.fn()} cuenta={CUENTA} />);

    expect(campoFecha()).toHaveValue("2026-11-08");
    expect(campoFecha()).toHaveAttribute("min", "2026-11-03");
    expect(campoFecha()).toHaveAttribute("max", "2026-11-08");
  });

  it("no envía una fecha futura", async () => {
    await registrar("2026-11-09");

    expect(
      await screen.findByText("La fecha de pago no puede ser futura (hoy es 08/11/2026)."),
    ).toBeInTheDocument();
    expect(mocks.registrarPago).not.toHaveBeenCalled();
  });

  it("no envía una fecha anterior a la emisión de la cuenta", async () => {
    await registrar("2026-11-02");

    expect(
      await screen.findByText(
        "La fecha de pago no puede ser anterior a la emisión de la cuenta (03/11/2026).",
      ),
    ).toBeInTheDocument();
    expect(mocks.registrarPago).not.toHaveBeenCalled();
  });

  it("envía una fecha válida y muestra en el campo el error del back", async () => {
    mocks.registrarPago.mockRejectedValue(
      new ApiError("Datos inválidos", 422, {
        fecha_pago: ["La fecha de pago no puede ser futura (hoy es 08/11/2026)."],
      }),
    );

    await registrar("2026-11-05");

    expect(mocks.registrarPago).toHaveBeenCalledWith(7, {
      monto: 100,
      metodo: "EFECTIVO",
      fecha_pago: "2026-11-05",
    });
    expect(
      await screen.findAllByText("La fecha de pago no puede ser futura (hoy es 08/11/2026)."),
    ).not.toHaveLength(0);
  });
});
