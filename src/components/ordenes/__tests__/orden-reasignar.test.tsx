import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrdenActions } from "@/components/ordenes/orden-actions";
import type { User } from "@/lib/api/types";
import { canAccionOrden } from "@/lib/permissions";

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

const asignar = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ordenes: { asignar: (...args: unknown[]) => asignar(...args) },
}));

function operario(id: number, name: string): User {
  return { id, name, email: `${id}@example.com`, rol: "operario", activo: true, cliente_id: null, empresa_id: 1 };
}

const ROSA = operario(1, "Rosa Quispe");
const LUIS = operario(2, "Luis Mamani");

describe("OrdenActions · reasignar (O-04)", () => {
  beforeEach(() => {
    asignar.mockReset();
  });

  it("cambia el operario de una orden Asignada a otro", async () => {
    const user = userEvent.setup();
    asignar.mockResolvedValue({ id: 9 });

    render(
      <OrdenActions
        ordenId={9}
        numero="OS-2026-000009"
        acciones={["ver", "reasignar", "iniciar"]}
        operarios={[ROSA, LUIS]}
        operarioActual={ROSA}
        display="detail"
        hideVer
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reasignar OS-2026-000009" }));

    const dialog = screen.getByRole("dialog", { name: "Reasignar orden" });
    expect(dialog).toHaveTextContent("está asignada a Rosa Quispe");
    expect(dialog).toHaveTextContent("queda en el historial");

    await user.click(within(dialog).getByRole("button", { name: /Operario/ }));
    const opciones = (await screen.findAllByRole("option")).map((opcion) => opcion.textContent);
    expect(opciones).toContain("Luis Mamani");
    expect(opciones).not.toContain("Rosa Quispe");

    await user.click(screen.getByRole("option", { name: "Luis Mamani" }));
    await user.click(within(dialog).getByRole("button", { name: "Reasignar" }));

    await waitFor(() => expect(asignar).toHaveBeenCalledWith(9, 2));
  });

  it("sin otro operario disponible no ofrece reasignar", () => {
    render(
      <OrdenActions
        ordenId={9}
        numero="OS-2026-000009"
        acciones={["ver", "reasignar"]}
        operarios={[ROSA]}
        operarioActual={ROSA}
      />,
    );

    expect(screen.queryByRole("button", { name: /Reasignar/ })).not.toBeInTheDocument();
  });

  it("solo el admin tiene el permiso de reasignar", () => {
    expect(canAccionOrden({ rol: "admin" }, "reasignar")).toBe(true);
    expect(canAccionOrden({ rol: "operario" }, "reasignar")).toBe(false);
  });
});
