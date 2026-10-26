import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useFormErrors } from "@/lib/hooks/use-form-errors";

function Harness() {
  const {
    formRef,
    fieldErrors,
    fieldErrorCount,
    message,
    applyFieldErrors,
  } = useFormErrors();

  return (
    <form ref={formRef}>
      <div data-field="nombre">
        <label htmlFor="nombre">Nombre</label>
        <input
          id="nombre"
          name="nombre"
          aria-invalid={Boolean(fieldErrors.nombre)}
        />
      </div>

      <div data-field="email">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          aria-invalid={Boolean(fieldErrors.email)}
        />
      </div>

      <output data-testid="count">{fieldErrorCount}</output>
      <output data-testid="message">{message}</output>

      <button
        type="button"
        onClick={() =>
          applyFieldErrors(
            {
              email: ["Ingresa un correo válido."],
              nombre: ["El nombre es obligatorio."],
            },
            "Revisa los datos ingresados.",
          )
        }
      >
        Validar
      </button>
    </form>
  );
}

describe("useFormErrors", () => {
  it("cuenta campos y enfoca el primero inválido en orden del DOM", async () => {
    const user = userEvent.setup();

    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Validar" }));

    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("message")).toHaveTextContent(
      "Revisa los datos ingresados.",
    );
    expect(screen.getByLabelText("Nombre")).toHaveFocus();
    expect(screen.getByLabelText("Nombre")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
