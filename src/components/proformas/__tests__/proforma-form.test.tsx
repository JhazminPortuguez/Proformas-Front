import { fireEvent, render, screen } from "@testing-library/react";
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

describe("ProformaForm · decimales, máximos y largos", () => {
  async function lineaLibre(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: /Línea libre/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /^Descripción/ }), {
      target: { value: "Ajuste de tablero" },
    });
  }

  it("rechaza más de 3 decimales en la cantidad y más de 2 en el precio", async () => {
    const user = userEvent.setup();
    renderForm();
    await lineaLibre(user);

    fireEvent.change(screen.getByRole("textbox", { name: /^Cantidad/ }), {
      target: { value: "1,2345" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Precio unitario/i }), {
      target: { value: "10.555" },
    });
    await user.click(screen.getByRole("button", { name: /Guardar borrador/i }));

    expect(screen.getByText("La cantidad admite como máximo 3 decimales.")).toBeInTheDocument();
    expect(
      screen.getByText("El precio unitario admite como máximo 2 decimales."),
    ).toBeInTheDocument();
  });

  it("rechaza una cantidad mayor a 100000 y textos más largos que en el back", async () => {
    const user = userEvent.setup();
    renderForm();
    await lineaLibre(user);

    fireEvent.change(screen.getByRole("textbox", { name: /^Cantidad/ }), {
      target: { value: "100001" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Descripción/ }), {
      target: { value: "d".repeat(501) },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Unidad/ }), {
      target: { value: "u".repeat(31) },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Observaciones/ }), {
      target: { value: "o".repeat(2001) },
    });
    await user.click(screen.getByRole("button", { name: /Guardar borrador/i }));

    expect(screen.getByText("La cantidad no puede superar 100000.")).toBeInTheDocument();
    expect(
      screen.getByText("El campo descripción no debe tener más de 500 caracteres."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El campo unidad de medida no debe tener más de 30 caracteres."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El campo observaciones no debe tener más de 2000 caracteres."),
    ).toBeInTheDocument();
  });

  it("rechaza descuento e impuesto con más de 2 decimales", async () => {
    const user = userEvent.setup();
    renderForm();
    await lineaLibre(user);

    fireEvent.change(screen.getByRole("textbox", { name: /^Precio unitario/i }), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Descuento/ }), {
      target: { value: "1,234" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Impuesto/ }), {
      target: { value: "13.555" },
    });
    await user.click(screen.getByRole("button", { name: /Guardar borrador/i }));

    expect(screen.getByText("El descuento admite como máximo 2 decimales.")).toBeInTheDocument();
    expect(screen.getByText("El impuesto admite como máximo 2 decimales.")).toBeInTheDocument();
  });
});
