import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { ClienteEstadoChip } from "@/components/ui/status-chip";

describe("estados de UI", () => {
  it("muestra título, descripción y acción en el estado vacío", () => {
    render(
      <EmptyState
        title="Todavía no hay clientes"
        description="Crea el primero para empezar."
        action={<button type="button">Nuevo cliente</button>}
      />,
    );

    expect(screen.getByText("Todavía no hay clientes")).toBeInTheDocument();
    expect(screen.getByText("Crea el primero para empezar.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Nuevo cliente" }),
    ).toBeInTheDocument();
  });

  it("anuncia la carga con aria-busy y texto para lectores de pantalla", () => {
    const { container } = render(<TableSkeleton rows={2} />);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText("Cargando resultados…")).toBeInTheDocument();
  });

  it("traduce el estado del cliente a una etiqueta legible", () => {
    render(<ClienteEstadoChip estado="prospecto" />);

    expect(screen.getByText("Prospecto")).toBeInTheDocument();
  });
});
