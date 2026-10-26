import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClienteCobrosTab } from "@/components/clientes/cliente-cobros-tab";
import { ClienteOrdenesTab } from "@/components/clientes/cliente-ordenes-tab";
import { ClienteProformasTab } from "@/components/clientes/cliente-proformas-tab";
import { ClienteServiciosTab } from "@/components/clientes/cliente-servicios-tab";
import type {
  CuentaPorCobrar,
  HistorialServicio,
  Orden,
  Proforma,
} from "@/lib/api/types";
import { formatDateOnly, formatMoney } from "@/lib/utils";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const META = {
  current_page: 1,
  per_page: 15,
  total: 1,
  last_page: 2,
};

function money(value: number): string {
  return formatMoney(value).replace(/\s+/g, " ");
}

const PROFORMA: Proforma = {
  id: 12,
  numero: "PRF-000012",
  cliente_id: 5,
  fecha_emision: "2026-10-25",
  fecha_validez: "2026-11-10",
  estado: "ACEPTADA",
  moneda: "BOB",
  impuesto_tasa: 13,
  subtotal: 500,
  descuento: 0,
  impuesto: 65,
  total: 565,
  observaciones: null,
  origen: "MANUAL",
  solicitud_id: null,
  items_count: 2,
  enviada_at: null,
  aceptada_at: null,
  aceptada_por: null,
  rechazada_at: null,
  motivo_rechazo: null,
  created_by: 1,
  updated_by: 1,
};

const ORDEN: Orden = {
  id: 9,
  empresa_id: 1,
  numero: "OS-2026-000009",
  proforma_id: 12,
  cliente_id: 5,
  operario_id: 2,
  estado: "FINALIZADA",
  fecha_programada: "2026-10-28",
  fecha_inicio: "2026-10-28T09:00:00-04:00",
  fecha_fin: "2026-10-28T16:00:00-04:00",
  observaciones: null,
  motivo_cancelacion: null,
  cancelada_at: null,
  cerrada_at: "2026-10-29T10:15:00-04:00",
  cerrada_por: 1,
  created_by: 1,
  updated_by: 1,
  items_count: 3,
  operario: {
    id: 2,
    name: "Ana Operaria",
    email: "ana@example.com",
    rol: "operario",
    activo: true,
    cliente_id: null,
    empresa_id: 1,
  },
};

const CUENTA: CuentaPorCobrar = {
  id: 7,
  numero: "CXC-000007",
  orden_id: 9,
  cliente_id: 5,
  fecha_emision: "2026-10-29",
  fecha_vencimiento: "2026-11-30",
  moneda: "BOB",
  monto_total: 1000,
  saldo: 400,
  estado_cobro: "PARCIAL",
  vencida: true,
  dias_vencida: 12,
  total_pagado: 600,
  pagos_count: 2,
};

const SERVICIO: HistorialServicio = {
  id: 31,
  orden_id: 9,
  orden_numero: "OS-2026-000009",
  orden_estado: "FINALIZADA",
  fecha: "2026-10-28",
  servicio_id: 4,
  servicio_nombre: "Reparación de bomba",
  descripcion: null,
  cantidad: 2,
  total_linea: 700,
  operario_nombre: null,
};

describe("pestañas de la ficha del cliente", () => {
  it("muestra proformas en tabla y en tarjeta móvil", () => {
    render(
      <ClienteProformasTab
        clienteId={5}
        proformas={[PROFORMA]}
        meta={META}
      />,
    );

    const table = screen.getByRole("grid", { name: "Proformas del cliente" });

    expect(
      within(table).getByRole("link", { name: "PRF-000012" }),
    ).toHaveAttribute("href", "/proformas/12");
    expect(within(table).getByText("Aceptada")).toBeInTheDocument();
    expect(within(table).getByText(money(565))).toBeInTheDocument();
    expect(
      within(table).getByText(formatDateOnly("2026-10-25")),
    ).toBeInTheDocument();

    const mobile = screen.getByRole("list", {
      name: "Proformas del cliente (móvil)",
    });

    expect(
      within(mobile).getByRole("link", { name: "PRF-000012" }),
    ).toBeInTheDocument();
    expect(within(mobile).getByText("Aceptada")).toBeInTheDocument();
    expect(within(mobile).getByText(money(565))).toBeInTheDocument();
  });

  it("muestra órdenes con programada, operario y cierre", () => {
    render(
      <ClienteOrdenesTab clienteId={5} ordenes={[ORDEN]} meta={META} />,
    );

    const table = screen.getByRole("grid", { name: "Órdenes del cliente" });

    expect(
      within(table).getByRole("link", { name: "OS-2026-000009" }),
    ).toHaveAttribute("href", "/ordenes/9");
    expect(within(table).getByText("Finalizada")).toBeInTheDocument();
    expect(within(table).getByText("Ana Operaria")).toBeInTheDocument();
    expect(
      within(table).getByText(formatDateOnly("2026-10-28")),
    ).toBeInTheDocument();
  });

  it("muestra cobros con estado, mora y saldo", () => {
    render(<ClienteCobrosTab clienteId={5} cuentas={[CUENTA]} meta={META} />);

    const table = screen.getByRole("grid", {
      name: "Cuentas por cobrar del cliente",
    });

    expect(
      within(table).getByRole("link", { name: "CXC-000007" }),
    ).toHaveAttribute("href", "/cobros/7");
    expect(within(table).getByText("Parcial")).toBeInTheDocument();
    expect(within(table).getByText("Vencida 12 d")).toBeInTheDocument();
    expect(within(table).getByText(money(400))).toBeInTheDocument();
    expect(within(table).getByText(money(600))).toBeInTheDocument();
    expect(
      within(table).getByText(formatDateOnly("2026-11-30")),
    ).toBeInTheDocument();
  });

  it("muestra servicios con orden, operario y estado de la orden", () => {
    render(
      <ClienteServiciosTab
        clienteId={5}
        servicios={[SERVICIO]}
        meta={META}
      />,
    );

    const table = screen.getByRole("grid", {
      name: "Servicios realizados al cliente",
    });

    expect(within(table).getByText("Reparación de bomba")).toBeInTheDocument();
    expect(
      within(table).getByRole("link", { name: "OS-2026-000009" }),
    ).toHaveAttribute("href", "/ordenes/9");
    expect(within(table).getByText("Sin operario")).toBeInTheDocument();
    expect(within(table).getByText("Finalizada")).toBeInTheDocument();
  });

  it("pagina desde la tabla y desde las tarjetas usando la URL", async () => {
    const user = userEvent.setup();

    mocks.push.mockClear();

    render(
      <ClienteProformasTab
        clienteId={5}
        proformas={[PROFORMA]}
        meta={META}
      />,
    );

    const nextButtons = screen.getAllByRole("button", {
      name: "Página siguiente",
    });

    await user.click(nextButtons[0]);

    expect(mocks.push).toHaveBeenCalledWith(
      "/clientes/5?tab=proformas&page=2",
    );
  });

  it("ofrece un estado vacío claro y una acción real", () => {
    render(
      <ClienteProformasTab
        clienteId={5}
        proformas={[]}
        meta={{ ...META, total: 0, last_page: 1 }}
      />,
    );

    expect(screen.getAllByText("Sin proformas")[0]).toBeInTheDocument();

    const acciones = screen.getAllByRole("link", { name: "Nueva proforma" });

    expect(acciones[0]).toHaveAttribute("href", "/proformas/nueva");
  });
});
