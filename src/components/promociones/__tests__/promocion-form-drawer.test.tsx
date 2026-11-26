import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromocionFormDrawer } from "@/components/promociones/promocion-form-drawer";
import { apiErrorFromResponse } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/lib/api/client", () => ({
  promociones: { create: mocks.create, update: mocks.update },
  servicios: { buscar: vi.fn().mockResolvedValue([]) },
  productos: { buscar: vi.fn().mockResolvedValue([]) },
}));

const LENTA = 20_000;

function renderDrawer(onSaved = vi.fn()) {
  render(
    <PromocionFormDrawer
      isOpen
      onOpenChange={vi.fn()}
      promocion={null}
      servicios={[]}
      productos={[]}
      hoy="2026-11-26"
      onSaved={onSaved}
    />,
  );

  return onSaved;
}

beforeEach(() => {
  mocks.create.mockReset();
});

describe("Formulario de promoción (ronda C)", () => {
  it("PR-05 y PR-06: valida el porcentaje y las fechas antes de enviar", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.type(screen.getByRole("textbox", { name: /^Nombre/ }), "Verano");
    await user.type(screen.getByRole("textbox", { name: /Porcentaje/ }), "150");
    fireEvent.change(screen.getByLabelText(/^Vigente hasta/), { target: { value: "2026-11-01" } });
    await user.click(screen.getByRole("button", { name: "Crear promoción" }));

    expect(screen.getAllByText("El porcentaje debe estar entre 1 y 100.").length).toBeGreaterThan(0);
    expect(screen.getAllByText('La fecha "hasta" no puede ser anterior a la fecha "desde".').length).toBeGreaterThan(0);
    expect(mocks.create).not.toHaveBeenCalled();
  }, LENTA);

  it("crea un 2x1 sin valor y muestra los errores del servidor junto al campo", async () => {
    const user = userEvent.setup();
    const onSaved = renderDrawer();

    await user.type(screen.getByRole("textbox", { name: /^Nombre/ }), "Lleva dos");
    await user.click(screen.getByRole("button", { name: /Tipo/ }));
    await user.click(await screen.findByRole("option", { name: /2x1/ }));

    expect(screen.queryByRole("textbox", { name: /Porcentaje|Monto/ })).not.toBeInTheDocument();

    mocks.create.mockRejectedValueOnce(
      apiErrorFromResponse(422, { message: "Revisa", errors: { nombre: ["El nombre ya existe."] } }),
    );
    await user.click(screen.getByRole("button", { name: "Crear promoción" }));
    expect((await screen.findAllByText("El nombre ya existe.")).length).toBeGreaterThan(0);

    mocks.create.mockResolvedValueOnce({ id: 1 });
    await user.click(screen.getByRole("button", { name: "Crear promoción" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mocks.create.mock.calls[1][0]).toMatchObject({
      nombre: "Lleva dos",
      tipo: "DOS_POR_UNO",
      valor: null,
      aplica_a: "CUALQUIERA",
      vigente_desde: "2026-11-26",
      vigente_hasta: "2026-12-26",
      activa: true,
    });
  }, LENTA);
});
