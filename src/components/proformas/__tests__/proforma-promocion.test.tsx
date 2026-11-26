import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProformaForm } from "@/components/proformas/proforma-form";
import { ProformaItemsTable } from "@/components/proformas/proforma-items-table";
import type { Cliente, Promocion, Proforma } from "@/lib/api/types";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));

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

vi.mock("@/lib/api/client", () => ({
  proformas: { create: mocks.create, update: mocks.update, enviar: vi.fn() },
  clientes: { buscar: vi.fn().mockResolvedValue([]) },
  servicios: { buscar: vi.fn().mockResolvedValue([]) },
  productos: { buscar: vi.fn().mockResolvedValue([]) },
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

const DIEZ: Promocion = {
  id: 5,
  nombre: "Aniversario",
  tipo: "PORCENTAJE",
  tipo_etiqueta: "Porcentaje",
  valor: 10,
  etiqueta: "10 %",
  aplica_a: "CUALQUIERA",
  aplica_a_etiqueta: "Cualquier ítem",
  servicio_id: null,
  producto_id: null,
  vigente_desde: "2026-11-01",
  vigente_hasta: "2026-12-31",
  activa: true,
  estado: "VIGENTE",
  vigente: true,
};

const LENTA = 20_000;

function renderForm(proforma: Proforma | null = null, promociones: Promocion[] = [DIEZ]) {
  return render(
    <ProformaForm
      proforma={proforma}
      clientes={[CLIENTE]}
      servicios={[]}
      productos={[]}
      today="2026-11-26"
      promociones={promociones}
    />,
  );
}

async function lineaLibre(user: ReturnType<typeof userEvent.setup>, precio: string) {
  await user.click(screen.getByRole("button", { name: /Línea libre/i }));
  fireEvent.change(screen.getByRole("textbox", { name: /^Descripción/ }), { target: { value: "Ajuste de tablero" } });
  fireEvent.change(screen.getByRole("textbox", { name: /^Precio unitario/i }), { target: { value: precio } });
}

async function elegirPromocion(user: ReturnType<typeof userEvent.setup>, nombre: RegExp) {
  await user.click(screen.getByRole("button", { name: /Promoción/ }));
  await user.click(await screen.findByRole("option", { name: nombre }));
}

beforeEach(() => {
  mocks.create.mockReset();
  mocks.update.mockReset();
});

describe("Proforma con promoción (ronda C)", () => {
  it("la línea muestra el precio, el descuento y el total, y se envía la promoción", async () => {
    const user = userEvent.setup();
    mocks.create.mockResolvedValue({ id: 9, numero: "PR-9" });
    renderForm();

    await lineaLibre(user, "200");
    await elegirPromocion(user, /Aniversario · 10 %/);

    const linea = within(screen.getByLabelText("Importe de la línea"));

    expect(linea.getByText(/^Bs\s200,00$/)).toBeInTheDocument();
    expect(linea.getByText(/− Bs\s20,00/)).toBeInTheDocument();
    expect(linea.getByText(/Bs\s180,00/)).toBeInTheDocument();
    expect(screen.getByText(/Incluye Bs\s20,00 de descuento por promociones/)).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: /Cliente/ }));
    await user.click(await screen.findByRole("option", { name: /Constructora Andina/ }));
    await user.click(screen.getByRole("button", { name: /Guardar borrador/i }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(mocks.create.mock.calls[0][0].items[0]).toMatchObject({ tipo: "LIBRE", promocion_id: 5 });
  }, LENTA);

  it("PR-08: una línea de cortesía (Bs 0) no permite elegir promoción", async () => {
    const user = userEvent.setup();
    renderForm();

    await lineaLibre(user, "0");

    expect(screen.getByText("Una línea de cortesía (Bs 0) no lleva promoción.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Promoción/ })).toBeDisabled();
  }, LENTA);

  it("PR-02: una promoción guardada que ya no está vigente no deja guardar", async () => {
    const user = userEvent.setup();
    const proforma = {
      id: 3,
      numero: "PR-3",
      cliente_id: 1,
      cliente: CLIENTE,
      fecha_emision: "2026-11-20",
      fecha_validez: null,
      estado: "BORRADOR",
      moneda: "BOB",
      impuesto_tasa: 0,
      subtotal: 90,
      descuento: 0,
      descuento_promocion: 10,
      impuesto: 0,
      total: 90,
      observaciones: null,
      items: [
        {
          id: 1,
          tipo: "LIBRE",
          servicio_id: null,
          producto_id: null,
          descripcion: "Ajuste",
          cantidad: 1,
          precio_unitario: 100,
          total_linea: 90,
          promocion_id: 77,
          promocion: { nombre: "Fin de mes", tipo: "PORCENTAJE", valor: 10, etiqueta: "10 %" },
          descuento_promocion: 10,
          importe_bruto: 100,
        },
      ],
    } as unknown as Proforma;

    renderForm(proforma, []);

    expect(screen.getByRole("button", { name: /Promoción/ })).toHaveTextContent("Fin de mes · 10 % (ya no vigente)");

    await user.click(screen.getByRole("button", { name: /Guardar borrador/i }));

    expect(
      screen.getAllByText('La promoción "Fin de mes" ya no está vigente. Quítala de la línea para guardar.').length,
    ).toBeGreaterThan(0);
    expect(mocks.update).not.toHaveBeenCalled();
  }, LENTA);

  it("el detalle muestra la promoción copiada en la línea", () => {
    render(
      <ProformaItemsTable
        proforma={
          {
            numero: "PR-3",
            items: [
              {
                id: 1,
                tipo: "LIBRE",
                servicio_id: null,
                producto_id: null,
                descripcion: "Ajuste",
                cantidad: 3,
                precio_unitario: 50,
                total_linea: 100,
                promocion: { nombre: "Dos por uno", tipo: "DOS_POR_UNO", valor: null, etiqueta: "2x1" },
                descuento_promocion: 50,
                importe_bruto: 150,
              },
            ],
          } as unknown as Proforma
        }
      />,
    );

    expect(screen.getByText(/Promoción: Dos por uno \(2x1\)/)).toHaveTextContent(/Precio Bs\s150,00 · Descuento − Bs\s50,00/);
  });
});
