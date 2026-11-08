import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrearOrdenDialog } from "@/components/proformas/crear-orden-dialog";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  create: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
    refresh: mocks.refresh,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api/client", () => ({
  ordenes: { create: mocks.create },
}));

describe("CrearOrdenDialog", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
    mocks.create.mockReset();
  });

  it("crea la orden con fecha y observaciones y navega al detalle", async () => {
    mocks.create.mockResolvedValue({ id: 9, numero: "ORD-000009", operario_id: null });

    const user = userEvent.setup();

    render(
      <CrearOrdenDialog
        proformaId={12}
        proformaNumero="PRF-000012"
        usuario={{ id: 1, rol: "admin" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Crear orden" }));

    const dialog = screen.getByRole("dialog", {
      name: "Crear orden de servicio",
    });

    fireEvent.change(screen.getByLabelText("Fecha programada"), {
      target: { value: "2026-11-05" },
    });
    fireEvent.change(screen.getByLabelText("Observaciones"), {
      target: { value: "Coordinar acceso con portería" },
    });

    await user.click(
      within(dialog).getByRole("button", { name: "Crear orden" }),
    );

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith({
        proforma_id: 12,
        fecha_programada: "2026-11-05",
        observaciones: "Coordinar acceso con portería",
      });
    });

    expect(mocks.push).toHaveBeenCalledWith("/ordenes/9");
  });

  it("un operario que crea una orden sin asignar se queda en la proforma", async () => {
    mocks.push.mockClear();
    mocks.create.mockResolvedValue({ id: 10, numero: "OS-2026-000010", operario_id: null });

    const user = userEvent.setup();

    render(
      <CrearOrdenDialog
        proformaId={12}
        proformaNumero="PRF-000012"
        usuario={{ id: 2, rol: "operario" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Crear orden" }));
    const dialog = screen.getByRole("dialog", { name: "Crear orden de servicio" });
    await user.click(within(dialog).getByRole("button", { name: "Crear orden" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    // No navega a una orden que respondería "sin permisos".
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
