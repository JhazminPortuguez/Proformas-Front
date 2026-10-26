import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProformaForm } from "@/components/proformas/proforma-form";
import type { Cliente, Producto, Servicio } from "@/lib/api/types";

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
  id: 1,
  nombre_razon: "Constructora Andina",
  nit_ci: "123456789",
  telefono: null,
  email: null,
  direccion: null,
  estado: "activo",
};

const SERVICIO: Servicio = {
  id: 10,
  nombre: "Instalación eléctrica",
  descripcion: null,
  precio_base: 500,
  duracion_estimada_min: 120,
  categoria: "Eléctrico",
  activo: true,
  visible_catalogo: true,
};

const PRODUCTO: Producto = {
  id: 20,
  nombre: "Cable 12 AWG",
  descripcion: null,
  precio_unitario: 12.5,
  unidad_medida: "metro",
  activo: true,
  stock_actual: 100,
  stock_minimo: 10,
  costo_promedio: 8,
};

function renderForm() {
  return render(
    <ProformaForm
      proforma={null}
      clientes={[CLIENTE]}
      servicios={[SERVICIO]}
      productos={[PRODUCTO]}
      today="2026-10-25"
    />,
  );
}

describe("ProformaForm", () => {
  it("renderiza los datos generales y las acciones de guardado", () => {
    renderForm();

    expect(
      screen.getByRole("heading", { name: "Nueva proforma" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar y enviar/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Cliente/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Emisión/)).toHaveValue("2026-10-25");
  });

  it("detecta cliente e ítems faltantes antes de llamar al backend", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(
      screen.getByRole("button", { name: /Guardar borrador/i }),
    );

    expect(screen.getByText("Revisa 2 campos")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Cliente/ })).toHaveFocus();
  });

  it("agrega una línea libre y muestra su formulario", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /Línea libre/i }));

    expect(screen.getByText("Ítem 1")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /Precio unitario/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /^Descripción/ }),
    ).toBeInTheDocument();
  });
});
