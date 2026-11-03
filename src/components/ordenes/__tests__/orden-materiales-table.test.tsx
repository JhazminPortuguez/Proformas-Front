import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrdenMaterialesTable } from "@/components/ordenes/orden-materiales-table";
import type { Orden, OrdenItem, Producto } from "@/lib/api/types";
import { formatDateOnly } from "@/lib/utils";

const PRODUCTO: Producto = {
  id: 5,
  nombre: "Cable 12 AWG",
  descripcion: null,
  precio_unitario: 12.5,
  unidad_medida: "metro",
  activo: true,
  stock_actual: 100,
  stock_minimo: 10,
  costo_promedio: 8,
};

const CONSUMIDO: OrdenItem = {
  id: 1,
  orden_id: 9,
  tipo: "MATERIAL",
  servicio_id: null,
  producto_id: 5,
  descripcion: "Cable para tablero",
  unidad_medida: "metro",
  cantidad: 20,
  precio_unitario: 12.5,
  total_linea: 250,
  cantidad_consumida: 20,
  cantidad_pendiente: 0,
  consumido: true,
  consumido_at: "2026-10-29T01:47:00.000000Z",
  producto: PRODUCTO,
};

const PARCIAL: OrdenItem = {
  ...CONSUMIDO,
  id: 2,
  descripcion: "Cable de reserva",
  cantidad: 10,
  cantidad_consumida: 4,
  cantidad_pendiente: 6,
  consumido: false,
  consumido_at: null,
};

function orden(items: OrdenItem[]): Orden {
  return {
    id: 9,
    empresa_id: 1,
    numero: "ORD-000009",
    proforma_id: 12,
    cliente_id: 3,
    operario_id: 2,
    estado: "EN_PROCESO",
    fecha_programada: null,
    fecha_inicio: null,
    fecha_fin: null,
    observaciones: null,
    motivo_cancelacion: null,
    cancelada_at: null,
    cerrada_at: null,
    cerrada_por: null,
    created_by: 1,
    updated_by: 1,
    items,
  };
}

describe("OrdenMaterialesTable", () => {
  it("usa las columnas del diseño y conserva el stock actual", () => {
    render(<OrdenMaterialesTable orden={orden([CONSUMIDO])} />);

    const table = screen.getByRole("table", {
      name: "Materiales de la orden ORD-000009",
    });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);

    expect(headers).toEqual([
      "Ítem",
      "Unidad",
      "Cantidad prevista",
      "Cantidad consumida",
      "Fecha de consumo",
      "Stock actual",
    ]);
  });

  it("no muestra chip de estado ni costo promedio", () => {
    render(<OrdenMaterialesTable orden={orden([CONSUMIDO, PARCIAL])} />);

    expect(screen.queryByText("Consumido")).not.toBeInTheDocument();
    expect(screen.queryByText("Pendiente")).not.toBeInTheDocument();
    expect(screen.queryByText(/Costo prom/)).not.toBeInTheDocument();
  });

  it("muestra la fecha de consumo en Bolivia y guion si falta consumir", () => {
    render(<OrdenMaterialesTable orden={orden([CONSUMIDO, PARCIAL])} />);

    const table = screen.getByRole("table", {
      name: "Materiales de la orden ORD-000009",
    });
    const [, consumido, parcial] = within(table).getAllByRole("row");

    // 01:47 UTC del 29/10 todavía es 28/10 en America/La_Paz.
    expect(
      within(consumido).getByText(formatDateOnly("2026-10-28")),
    ).toBeInTheDocument();
    expect(within(parcial).getByText("—")).toBeInTheDocument();
    expect(within(parcial).getByText("4")).toBeInTheDocument();
  });
});
