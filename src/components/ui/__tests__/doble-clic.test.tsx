import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClienteFormDrawer } from "@/components/clientes/cliente-form-drawer";
import { RegistrarPagoDialog } from "@/components/cobros/registrar-pago-dialog";
import { CancelarOrdenDialog } from "@/components/ordenes/cancelar-orden-dialog";
import { SolicitarForm } from "@/components/portal/solicitar-form";
import { ProformaDetailActions } from "@/components/proformas/proforma-detail-actions";

/**
 * T-07 / D-04: un doble clic en guardar, pagar, confirmar o cancelar hace una
 * sola petición y el botón queda deshabilitado mientras está en curso.
 */

const mocks = vi.hoisted(() => ({
  registrarPago: vi.fn(),
  cancelar: vi.fn(),
  crearCliente: vi.fn(),
  crearSolicitud: vi.fn(),
  aceptar: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api/client", () => ({
  cuentas: { registrarPago: mocks.registrarPago },
  ordenes: { cancelar: mocks.cancelar, get: vi.fn() },
  clientes: { create: mocks.crearCliente, update: vi.fn(), remove: vi.fn(), enCurso: vi.fn() },
  portal: { crearSolicitud: mocks.crearSolicitud },
  proformas: { aceptar: mocks.aceptar, enviar: vi.fn(), rechazar: vi.fn(), remove: vi.fn() },
  proformaPdfUrl: (id: number) => `/api/v1/proformas/${id}/pdf`,
}));

/** Una petición que no termina: el botón queda en "pendiente". */
const colgada = () => new Promise(() => {});

describe("Doble clic (T-07, D-04)", { timeout: 20_000 }, () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
      mock.mockImplementation(colgada);
    }
  });

  it("registrar pago: una sola petición", async () => {
    const user = userEvent.setup();
    render(
      <RegistrarPagoDialog
        isOpen
        onOpenChange={vi.fn()}
        cuenta={{ id: 7, numero: "CXC-1", saldo: 400, monto_total: 400, total_pagado: 0, moneda: "BOB" }}
      />,
    );

    await user.type(screen.getByLabelText("Monto", { selector: "input" }), "100");
    const boton = screen.getByRole("button", { name: "Registrar pago" });
    await user.dblClick(boton);

    await waitFor(() => expect(mocks.registrarPago).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Registrando…" })).toBeDisabled();
  });

  it("cancelar orden: una sola petición", async () => {
    const user = userEvent.setup();
    render(
      <CancelarOrdenDialog
        isOpen
        onOpenChange={vi.fn()}
        ordenId={31}
        numero="OS-1"
        items={[]}
        onCancelled={vi.fn()}
        onUnauthorized={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Motivo de la cancelación", { selector: "textarea" }), "Cliente canceló.");
    await user.dblClick(screen.getByRole("button", { name: "Cancelar orden" }));

    await waitFor(() => expect(mocks.cancelar).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Cancelando…" })).toBeDisabled();
  });

  it("crear cliente: una sola petición", async () => {
    const user = userEvent.setup();
    render(<ClienteFormDrawer isOpen onOpenChange={vi.fn()} cliente={null} onSaved={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Nombre o razón social/), "Nueva SRL");
    await user.dblClick(within(dialog).getByRole("button", { name: "Crear cliente" }));

    await waitFor(() => expect(mocks.crearCliente).toHaveBeenCalledTimes(1));
  });

  it("enviar solicitud del portal: una sola petición", async () => {
    const user = userEvent.setup();
    render(<SolicitarForm />);

    await user.type(screen.getByRole("textbox", { name: /¿Qué necesitas\?/ }), "Necesito pintar");
    await user.type(screen.getByRole("textbox", { name: /^Descripción/ }), "Pintura de sala");
    await user.dblClick(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() => expect(mocks.crearSolicitud).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
  });

  it("confirmar aceptar proforma: una sola petición", async () => {
    const user = userEvent.setup();
    render(
      <ProformaDetailActions
        proformaId={9}
        numero="PR-1"
        acciones={["ver", "aceptar"]}
        canDelete={false}
        total={100}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    const confirmar = (await screen.findAllByRole("button", { name: "Aceptar" })).at(-1)!;
    await user.dblClick(confirmar);

    await waitFor(() => expect(mocks.aceptar).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Aceptando…" })).toBeDisabled();
  });
});
