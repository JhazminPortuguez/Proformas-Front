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
    mocks.create.mockResolvedValue({ id: 9, numero: "ORD-000009" });

    const user = userEvent.setup();

    render(
      <CrearOrdenDialog proformaId={12} proformaNumero="PRF-000012" />,
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
});
