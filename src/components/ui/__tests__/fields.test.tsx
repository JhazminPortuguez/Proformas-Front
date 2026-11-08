import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextFieldControl } from "@/components/ui/fields";

describe("campos de formulario", () => {
  it("marca el campo inválido y enlaza el mensaje con aria-describedby", () => {
    render(
      <TextFieldControl
        name="nombre_razon"
        label="Nombre o razón social"
        value=""
        onChange={() => {}}
        error="El nombre o razón social es obligatorio."
        isRequired
      />,
    );

    const input = screen.getByLabelText(/Nombre o razón social/);
    const alert = screen.getByRole("alert");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(alert).toHaveTextContent(
      "El nombre o razón social es obligatorio.",
    );

    const describedBy = input.getAttribute("aria-describedby");

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? "")).toHaveTextContent(
      "El nombre o razón social es obligatorio.",
    );
  });

  it("un campo obligatorio no repite el asterisco: lo pone HeroUI por CSS", () => {
    render(
      <TextFieldControl
        name="nombre_razon"
        label="Nombre o razón social"
        value=""
        onChange={() => {}}
        isRequired
      />,
    );

    const input = screen.getByLabelText("Nombre o razón social");

    expect(input).toBeRequired();
    // La etiqueta no trae un "*" propio; HeroUI agrega uno con ::after.
    expect(document.querySelector("label")?.textContent).toBe("Nombre o razón social");
  });

  it("expone el nombre del campo con data-field para el foco automático", () => {
    const { container } = render(
      <TextFieldControl
        name="email"
        label="Correo"
        value=""
        onChange={() => {}}
      />,
    );

    expect(container.querySelector('[data-field="email"]')).not.toBeNull();
  });
});
