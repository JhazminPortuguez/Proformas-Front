import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProformasTable } from "@/components/proformas/proformas-table";
import type { Cliente, Proforma } from "@/lib/api/types";

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

const CLIENTE: Cliente = {
  id: 3,
  nombre_razon: "Constructora Andina",
  nit_ci: "123456789",
  telefono: null,
  email: null,
  direccion: null,
  estado: "activo",
};

const PROFORMA: Proforma = {
  id: 12,
  numero: "PRF-000012",
  cliente_id: 3,
  fecha_emision: "2026-10-25",
  fecha_validez: "2026-11-10",
  estado: "BORRADOR",
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
  cliente: CLIENTE,
  acciones_disponibles: ["ver", "editar", "enviar", "eliminar", "pdf"],
};

const META = {
  current_page: 1,
  per_page: 15,
  total: 1,
  last_page: 1,
};

function renderTable(proforma: Proforma = PROFORMA, hoy = "2026-10-28") {
  return render(
    <ProformasTable
      hoy={hoy}
      proformas={[proforma]}
      meta={META}
      query={{
        search: "",
        estado: "",
        clienteId: "",
        desde: "",
        hasta: "",
        page: 1,
      }}
      clientes={[CLIENTE]}
      canDelete
    />,
  );
}

describe("ProformasTable", () => {
  it("muestra la proforma con número, cliente, estado y total", () => {
    renderTable();

    const table = screen.getByRole("grid", { name: "Proformas" });

    expect(
      within(table).getByRole("link", { name: "PRF-000012" }),
    ).toBeInTheDocument();
    expect(within(table).getByText("Constructora Andina")).toBeInTheDocument();
    expect(within(table).getByText("Borrador")).toBeInTheDocument();
    expect(within(table).getByText(/565,00/)).toBeInTheDocument();
    expect(within(table).getByText("NIT/CI 123456789")).toBeInTheDocument();
  });

  it("avisa que una proforma enviada expiró sin cambiar su estado", () => {
    renderTable({ ...PROFORMA, estado: "ENVIADA", fecha_validez: "2026-10-20" });

    const table = screen.getByRole("grid", { name: "Proformas" });

    expect(within(table).getByText("Aviso: Expiró 20/10")).toBeInTheDocument();
    expect(within(table).getByText("Enviada")).toBeInTheDocument();
  });

  it("no avisa si la validez sigue vigente o la proforma no está enviada", () => {
    const { unmount } = renderTable({ ...PROFORMA, estado: "ENVIADA" });

    expect(screen.queryByText(/Expiró/)).not.toBeInTheDocument();
    unmount();

    renderTable({ ...PROFORMA, fecha_validez: "2026-10-20" });

    expect(screen.queryByText(/Expiró/)).not.toBeInTheDocument();
  });

  it("muestra la moneda real si no es Bs, sin convertir el monto", () => {
    renderTable({ ...PROFORMA, moneda: "USD" });

    const table = screen.getByRole("grid", { name: "Proformas" });

    expect(within(table).getByText(/USD\s?565,00/)).toBeInTheDocument();
  });

  it("pide confirmación antes de enviar", async () => {
    const user = userEvent.setup();
    renderTable();

    const table = screen.getByRole("grid", { name: "Proformas" });

    await user.click(
      within(table).getByRole("button", {
        name: "Enviar PRF-000012",
      }),
    );

    expect(
      screen.getByRole("alertdialog", { name: "Enviar proforma" }),
    ).toBeInTheDocument();
  });
});
