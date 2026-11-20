import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnularCuentaAction } from "@/components/cobros/anular-cuenta-action";
import { EstadoCobroChip, VencidaChip } from "@/components/cobros/chips";
import { apiErrorFromResponse } from "@/lib/api/errors";
import { estadoCobroMeta } from "@/lib/cobros";

/** X-11: anular una cuenta por cobrar (admin, sin pagos vigentes, con motivo). */

const mocks = vi.hoisted(() => ({ anular: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: mocks.refresh,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api/client", () => ({
  cuentas: { anular: mocks.anular },
}));

describe("AnularCuentaAction", { timeout: 15_000 }, () => {
  beforeEach(() => {
    mocks.anular.mockReset();
  });

  it("exige el motivo y anula la cuenta", async () => {
    const user = userEvent.setup();
    mocks.anular.mockResolvedValue({ id: 3 });

    render(<AnularCuentaAction cuentaId={3} numero="CXC-2026-000003" />);

    await user.click(screen.getByRole("button", { name: "Anular cuenta" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Anular cuenta por cobrar" });
    expect(dialog).toHaveTextContent("dejará de sumar en el panel y en los reportes");

    const confirmar = screen.getAllByRole("button", { name: "Anular cuenta" }).at(-1)!;
    expect(confirmar).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /Motivo de la anulación/ }), "Se emitió por error.");
    await user.click(confirmar);

    await waitFor(() => expect(mocks.anular).toHaveBeenCalledWith(3, "Se emitió por error."));
  });

  it("muestra el motivo del back si la cuenta tiene pagos", async () => {
    const user = userEvent.setup();
    const mensaje = "La cuenta tiene pagos vigentes. Anula primero los pagos y luego la cuenta.";
    mocks.anular.mockRejectedValue(
      apiErrorFromResponse(422, { message: mensaje, errors: { estado: [mensaje] } }),
    );

    render(<AnularCuentaAction cuentaId={3} numero="CXC-2026-000003" />);

    await user.click(screen.getByRole("button", { name: "Anular cuenta" }));
    await user.type(await screen.findByRole("textbox", { name: /Motivo de la anulación/ }), "Error");
    await user.click(screen.getAllByRole("button", { name: "Anular cuenta" }).at(-1)!);

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
  });
});

describe("Cuenta anulada en los chips", () => {
  it("muestra «Anulada» y no muestra mora ni «Al día»", () => {
    expect(estadoCobroMeta("ANULADA").label).toBe("Anulada");

    const { container } = render(
      <>
        <EstadoCobroChip estado="ANULADA" />
        <VencidaChip
          cuenta={{
            estado_cobro: "ANULADA",
            vencida: false,
            dias_vencida: 0,
            saldo: 0,
            monto_total: 300,
            total_pagado: 0,
            fecha_vencimiento: "2026-10-01",
          }}
        />
      </>,
    );

    expect(screen.getByText("Anulada")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("Al día");
    expect(container).not.toHaveTextContent(/Vencida/);
  });
});
