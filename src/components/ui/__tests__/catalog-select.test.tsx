import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatalogSelect } from "@/components/ui/catalog-select";

const OPTIONS = [
  { id: 1, label: "Instalación eléctrica", description: "Bs 500,00" },
  { id: 2, label: "Mantenimiento", description: "Bs 250,00" },
];

describe("CatalogSelect", () => {
  it("expone un combobox con la etiqueta y el valor seleccionado", () => {
    render(
      <CatalogSelect
        name="servicio_id"
        label="Servicio"
        value="1"
        onChange={() => {}}
        options={OPTIONS}
        isRequired
      />,
    );

    const combobox = screen.getByRole("combobox", { name: /Servicio/ });

    expect(combobox).toHaveValue("Instalación eléctrica");
  });

  it("muestra el placeholder cuando no hay selección", () => {
    render(
      <CatalogSelect
        name="producto_id"
        label="Material"
        value=""
        onChange={() => {}}
        options={OPTIONS}
        placeholder="Buscar material…"
      />,
    );

    expect(
      screen.getByPlaceholderText("Buscar material…"),
    ).toBeInTheDocument();
  });

  it("anuncia el error y deja el campo inválido", () => {
    render(
      <CatalogSelect
        name="cliente_id"
        label="Cliente"
        value=""
        onChange={() => {}}
        options={OPTIONS}
        error="Selecciona un cliente."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Selecciona un cliente.",
    );
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
