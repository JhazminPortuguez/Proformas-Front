import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PagosTable } from "@/components/cobros/pagos-table";
import { RegistrarPagoDialog } from "@/components/cobros/registrar-pago-dialog";
import { ApiError } from "@/lib/api/types";
import type { CuentaPorCobrar, PagoCuenta } from "@/lib/api/types";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  registrarPago: vi.fn(),
  anular: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
    refresh: mocks.refresh,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api/client", () => ({
  cuentas: { registrarPago: mocks.registrarPago },
  pagos: { anular: mocks.anular },
}));

const CUENTA: Pick<
  CuentaPorCobrar,
  "id" | "numero" | "saldo" | "monto_total" | "total_pagado" | "moneda"
> = {
  id: 7,
  numero: "CXC-000007",
  saldo: 400,
  monto_total: 1000,
  total_pagado: 600,
  moneda: "BOB",
};

const PAGO: PagoCuenta = {
  id: 33,
  cuenta_id: 7,
  monto: 200,
  metodo: "TRANSFERENCIA",
  fecha_pago: "2026-09-15",
  referencia: "TRF-9981",
  observaciones: null,
  anulado: false,
  anulado_at: null,
  motivo_anulacion: null,
  created_at: "2026-09-15T14:30:00-04:00",
  usuario: {
    id: 1,
    name: "Ana Admin",
    email: "ana@example.com",
    rol: "admin",
    activo: true,
    cliente_id: null,
    empresa_id: 1,
  },
};

function renderDialog(onOpenChange = vi.fn()) {
  render(
    <RegistrarPagoDialog
      isOpen
      onOpenChange={onOpenChange}
      cuenta={CUENTA}
    />,
  );

  return { onOpenChange };
}

describe("RegistrarPagoDialog", () => {
  beforeEach(() => {
    mocks.registrarPago.mockReset();
    mocks.refresh.mockReset();
  });

  it("exige un monto mayor a cero sin llamar a la API", async () => {
    const user = userEvent.setup();
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: "Registrar pago" });

    await user.click(
      within(dialog).getByRole("button", { name: "Registrar pago" }),
    );

    expect(screen.getByText("Indica un monto mayor a cero.")).toBeInTheDocument();
    expect(mocks.registrarPago).not.toHaveBeenCalled();
  });

  it("no permite superar el saldo pendiente", async () => {
    const user = userEvent.setup();
    renderDialog();

    fireEvent.change(screen.getByLabelText("Monto"), {
      target: { value: "450" },
    });

    const dialog = screen.getByRole("dialog", { name: "Registrar pago" });

    await user.click(
      within(dialog).getByRole("button", { name: "Registrar pago" }),
    );

    expect(
      screen.getByText(/no puede superar el saldo pendiente/),
    ).toBeInTheDocument();
    expect(mocks.registrarPago).not.toHaveBeenCalled();
  });

  it("registra el pago con monto, método, fecha y referencia", async () => {
    mocks.registrarPago.mockResolvedValue({});
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText("Monto"), {
      target: { value: "150,50" },
    });
    fireEvent.change(screen.getByLabelText("Fecha del pago"), {
      target: { value: "2026-10-20" },
    });
    fireEvent.change(screen.getByLabelText("Referencia (opcional)"), {
      target: { value: "TRF-1" },
    });
    fireEvent.change(screen.getByLabelText("Observaciones (opcional)"), {
      target: { value: "Abono acordado" },
    });

    const dialog = screen.getByRole("dialog", { name: "Registrar pago" });

    await user.click(
      within(dialog).getByRole("button", { name: "Registrar pago" }),
    );

    await waitFor(() => {
      expect(mocks.registrarPago).toHaveBeenCalledWith(7, {
        monto: 150.5,
        metodo: "EFECTIVO",
        fecha_pago: "2026-10-20",
        referencia: "TRF-1",
        observaciones: "Abono acordado",
      });
    });

    expect(mocks.refresh).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("muestra el 422 junto al monto y enfoca el campo", async () => {
    mocks.registrarPago.mockRejectedValueOnce(
      new ApiError("Revisa los datos", 422, {
        monto: ["El monto supera el saldo pendiente."],
      }),
    );
    const user = userEvent.setup();
    renderDialog();

    fireEvent.change(screen.getByLabelText("Monto"), {
      target: { value: "50" },
    });

    const dialog = screen.getByRole("dialog", { name: "Registrar pago" });

    await user.click(
      within(dialog).getByRole("button", { name: "Registrar pago" }),
    );

    expect(
      (await screen.findAllByText("El monto supera el saldo pendiente.")).length,
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText("Monto")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

describe("PagosTable · anulación", () => {
  beforeEach(() => {
    mocks.anular.mockReset();
    mocks.refresh.mockReset();
  });

  it("no ofrece anular a quien no es admin", () => {
    render(<PagosTable pagos={[PAGO]} canAnular={false} />);

    expect(
      screen.queryByRole("button", { name: /^Anular pago de / }),
    ).not.toBeInTheDocument();
  });

  it("exige motivo y anula el pago", async () => {
    mocks.anular.mockResolvedValue({});
    const user = userEvent.setup();

    render(<PagosTable pagos={[PAGO]} canAnular />);

    await user.click(
      screen.getAllByRole("button", { name: /^Anular pago de / })[0],
    );

    const dialog = screen.getByRole("alertdialog", { name: "Anular pago" });

    const confirm = within(dialog).getByRole("button", {
      name: "Anular pago",
    });

    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Motivo de la anulación/), {
      target: { value: "Depósito duplicado" },
    });

    await user.click(confirm);

    await waitFor(() => {
      expect(mocks.anular).toHaveBeenCalledWith(33, "Depósito duplicado");
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("muestra los pagos anulados con su motivo", () => {
    render(
      <PagosTable
        pagos={[
          {
            ...PAGO,
            anulado: true,
            anulado_at: "2026-09-20T10:00:00-04:00",
            motivo_anulacion: "Depósito duplicado",
            puede_anular: false,
          },
        ]}
        canAnular
      />,
    );

    const table = screen.getByRole("grid", { name: "Pagos de la cuenta" });

    expect(within(table).getAllByText("Anulado").length).toBeGreaterThan(0);
    expect(within(table).getByText("Depósito duplicado")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Anular pago de / }),
    ).not.toBeInTheDocument();
  });
});
