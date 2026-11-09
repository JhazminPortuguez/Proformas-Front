import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrdenesTable } from "@/components/ordenes/ordenes-table";
import type { Orden } from "@/lib/api/types";

const push = vi.fn();
const obtenerOrden = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ordenes: { get: (...args: unknown[]) => obtenerOrden(...args) },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const ORDEN: Orden = {
  id: 9,
  empresa_id: 1,
  numero: "ORD-000009",
  proforma_id: 12,
  cliente_id: 3,
  operario_id: 2,
  estado: "ASIGNADA",
  fecha_programada: "2026-11-01",
  fecha_inicio: null,
  fecha_fin: null,
  observaciones: null,
  motivo_cancelacion: null,
  cancelada_at: null,
  cerrada_at: null,
  cerrada_por: null,
  created_by: 1,
  updated_by: 1,
  items_count: 2,
  cliente: {
    id: 3,
    nombre_razon: "Constructora Andina",
    nit_ci: "123456789",
    telefono: null,
    email: null,
    direccion: null,
    estado: "activo",
  },
  proforma: {
    id: 12,
    numero: "PRF-000012",
    estado: "ACEPTADA",
    moneda: "BOB",
    total: 565,
  },
  operario: {
    id: 2,
    name: "Pedro Operario",
    email: "pedro@example.com",
    rol: "operario",
    activo: true,
    cliente_id: null,
    empresa_id: 1,
  },
  acciones_disponibles: ["ver", "iniciar", "cancelar"],
};

const META = {
  current_page: 1,
  per_page: 15,
  total: 1,
  last_page: 1,
};

const QUERY = {
  search: "",
  estado: "" as const,
  operarioId: "" as const,
  clienteId: "" as const,
  vista: "tabla" as const,
  page: 1,
};

function renderTable() {
  return render(
    <OrdenesTable
      ordenes={[ORDEN]}
      meta={META}
      query={{
        search: "",
        estado: "",
        operarioId: "",
        clienteId: "",
        vista: "tabla",
        page: 1,
      }}
      operarios={[]}
      permisos={{ canAssign: true, canCancel: true, canClose: true }}
    />,
  );
}

describe("OrdenesTable", () => {
  it("muestra número, cliente, proforma, operario y estado", () => {
    renderTable();

    const table = screen.getByRole("grid", { name: "Órdenes de servicio" });

    expect(
      within(table).getByRole("link", { name: "ORD-000009" }),
    ).toBeInTheDocument();
    expect(within(table).getByText("Constructora Andina")).toBeInTheDocument();
    expect(
      within(table).getByRole("link", { name: "PRF-000012" }),
    ).toBeInTheDocument();
    expect(within(table).getByText("Pedro Operario")).toBeInTheDocument();
    expect(within(table).getByText("Asignada")).toBeInTheDocument();
    expect(
      within(table).getByText("01/11/2026"),
    ).toBeInTheDocument();
    expect(within(table).getByText("NIT/CI 123456789")).toBeInTheDocument();
  });

  it("usa las columnas aprobadas, sin ítems ni servicio principal", () => {
    renderTable();

    const table = screen.getByRole("grid", { name: "Órdenes de servicio" });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.trim());

    expect(headers).toEqual([
      "Código",
      "Cliente",
      "Proforma",
      "Operario",
      "Fecha programada",
      "Estado",
      "Acciones",
    ]);
  });

  it("muestra el NIT/CI también en las tarjetas del celular", () => {
    renderTable();

    const lista = screen.getByRole("list", { name: "Órdenes de servicio" });

    expect(within(lista).getByText("NIT/CI 123456789")).toBeInTheDocument();
    expect(within(lista).queryByText("Ítems")).not.toBeInTheDocument();
  });

  it("limpiar filtros del estado vacío conserva la pestaña", async () => {
    const user = userEvent.setup();

    render(
      <OrdenesTable
        ordenes={[]}
        meta={{ ...META, total: 0 }}
        query={{
          search: "ORD-9",
          estado: "EN_PROCESO",
          operarioId: "",
          clienteId: 3,
          vista: "tabla",
          page: 1,
        }}
        operarios={[]}
        permisos={{ canAssign: true, canCancel: true, canClose: true }}
      />,
    );

    // La tabla de escritorio y la lista del celular muestran el mismo botón.
    await user.click(
      screen.getAllByRole("button", { name: "Limpiar filtros" })[0],
    );

    expect(push).toHaveBeenCalledWith("/ordenes?estado=EN_PROCESO&vista=tabla");
  });

  it("pide confirmación antes de iniciar la orden", async () => {
    const user = userEvent.setup();
    renderTable();

    const table = screen.getByRole("grid", { name: "Órdenes de servicio" });

    await user.click(
      within(table).getByRole("button", { name: "Iniciar ORD-000009" }),
    );

    expect(
      screen.getByRole("alertdialog", { name: "Iniciar orden" }),
    ).toBeInTheDocument();
  });

  it("exige motivo al cancelar", async () => {
    const user = userEvent.setup();
    obtenerOrden.mockResolvedValue({ ...ORDEN, items: [] });
    renderTable();

    const table = screen.getByRole("grid", { name: "Órdenes de servicio" });

    await user.click(
      within(table).getByRole("button", { name: "Cancelar ORD-000009" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Cancelar orden" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo de la cancelación/)).toBeInTheDocument();
    // Sin ítems cargados en la tabla, el diálogo los pide para ver los consumos.
    expect(obtenerOrden).toHaveBeenCalledWith(9);
  });

  it("abre el selector de operario al asignar", async () => {
    const user = userEvent.setup();

    render(
      <OrdenesTable
        ordenes={[{ ...ORDEN, acciones_disponibles: ["ver", "asignar"] }]}
        meta={META}
        query={{
          search: "",
          estado: "",
          operarioId: "",
          clienteId: "",
          vista: "tabla",
          page: 1,
        }}
        operarios={ORDEN.operario ? [ORDEN.operario] : []}
        permisos={{ canAssign: true, canCancel: true, canClose: true }}
      />,
    );

    const table = screen.getByRole("grid", { name: "Órdenes de servicio" });

    await user.click(
      within(table).getByRole("button", { name: "Asignar ORD-000009" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Asignar operario" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Operario")).toBeInTheDocument();
  });

  it("marca «Cerrada» junto a Finalizada solo si la orden tiene cerrada_at", () => {
    render(
      <OrdenesTable
        ordenes={[
          { ...ORDEN, estado: "FINALIZADA", cerrada_at: "2026-11-02T15:00:00Z", acciones_disponibles: ["ver"] },
          { ...ORDEN, id: 10, numero: "ORD-000010", estado: "FINALIZADA", cerrada_at: null, acciones_disponibles: ["ver"] },
        ]}
        meta={{ ...META, total: 2 }}
        query={QUERY}
        operarios={[]}
        permisos={{ canAssign: true, canCancel: true, canClose: true }}
      />,
    );

    const table = screen.getByRole("grid", { name: "Órdenes de servicio" });
    const filas = within(table).getAllByRole("row");

    expect(filas[1]).toHaveTextContent("ORD-000009");
    expect(within(filas[1]).getByText("Finalizada")).toBeInTheDocument();
    expect(within(filas[1]).getByText("Cerrada")).toBeInTheDocument();

    expect(filas[2]).toHaveTextContent("ORD-000010");
    expect(within(filas[2]).getByText("Finalizada")).toBeInTheDocument();
    expect(within(filas[2]).queryByText("Cerrada")).not.toBeInTheDocument();
  });

  it("el código y la fecha programada no se parten y la fecha es dd/mm/aaaa", () => {
    renderTable();

    const table = screen.getByRole("grid", { name: "Órdenes de servicio" });

    expect(within(table).getByRole("link", { name: "ORD-000009" })).toHaveClass(
      "whitespace-nowrap",
    );
    expect(within(table).getByText("01/11/2026")).toHaveClass("whitespace-nowrap");
  });

  describe("filas por página", () => {
    beforeEach(() => push.mockClear());

    it("ofrece 15, 25 y 50; al cambiar conserva los filtros y vuelve a la página 1", async () => {
      const user = userEvent.setup();

      render(
        <OrdenesTable
          ordenes={[ORDEN]}
          meta={{ current_page: 3, per_page: 15, total: 60, last_page: 4 }}
          query={{ ...QUERY, estado: "ASIGNADA", clienteId: 3, page: 3 }}
          operarios={[]}
          permisos={{ canAssign: true, canCancel: true, canClose: true }}
        />,
      );

      const [selector] = screen.getAllByRole("button", { name: /Filas por página/ });
      expect(selector).toHaveTextContent("15");

      await user.click(selector);

      const opciones = screen.getAllByRole("option").map((option) => option.textContent);
      expect(opciones).toEqual(["15", "25", "50"]);

      await user.click(screen.getByRole("option", { name: "25" }));

      expect(push).toHaveBeenCalledWith(
        "/ordenes?estado=ASIGNADA&cliente_id=3&vista=tabla&per_page=25",
      );
    });

    it("al pasar de página mantiene las filas elegidas", async () => {
      const user = userEvent.setup();

      render(
        <OrdenesTable
          ordenes={[ORDEN]}
          meta={{ current_page: 1, per_page: 25, total: 40, last_page: 2 }}
          query={{ ...QUERY, perPage: 25 }}
          operarios={[]}
          permisos={{ canAssign: true, canCancel: true, canClose: true }}
        />,
      );

      const [siguiente] = screen.getAllByRole("button", { name: "Página siguiente" });
      await user.click(siguiente);

      expect(push).toHaveBeenCalledWith("/ordenes?vista=tabla&per_page=25&page=2");
    });
  });
});
