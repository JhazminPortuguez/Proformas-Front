import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/ui/announcer";
import { UsuariosTable } from "@/components/usuarios/usuarios-table";
import { apiErrorFromResponse } from "@/lib/api/errors";
import type { User } from "@/lib/api/types";

const mocks = vi.hoisted(() => ({ update: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: mocks.refresh,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api/client", () => ({
  usuarios: { update: mocks.update, remove: vi.fn(), create: vi.fn() },
}));

const ADMIN: User = {
  id: 1,
  name: "Ana Admin",
  email: "ana@example.com",
  rol: "admin",
  activo: true,
  cliente_id: null,
  empresa_id: 1,
};

const OPERARIO: User = {
  id: 2,
  name: "Rosa Quispe",
  email: "rosa@example.com",
  rol: "operario",
  activo: true,
  cliente_id: null,
  empresa_id: 1,
};

const MENSAJE =
  "No se puede desactivar a Rosa Quispe porque tiene 2 órdenes asignadas o en proceso: OS-2026-000007, OS-2026-000012. Termínalas o cancélalas primero.";

describe("UsuariosTable · operario con órdenes activas", () => {
  beforeEach(() => {
    mocks.update.mockReset();
  });

  it("muestra el mensaje con los números de orden y el operario sigue activo", async () => {
    const user = userEvent.setup();
    // Igual que el cliente real: un 422 conserva los errores por campo, no el `message`.
    mocks.update.mockRejectedValue(
      apiErrorFromResponse(422, { message: MENSAJE, errors: { activo: [MENSAJE] } }),
    );

    render(
      <AnnouncerProvider>
        <UsuariosTable
          usuarios={[ADMIN, OPERARIO]}
          meta={{ current_page: 1, per_page: 15, total: 2, last_page: 1 }}
          query={{ search: "", page: 1 }}
          currentUserId={ADMIN.id}
        />
      </AnnouncerProvider>,
    );

    const interruptor = screen.getByRole("switch", { name: "Activo: Rosa Quispe" });
    await user.click(interruptor);

    const alerta = await screen.findByRole("alert");
    expect(within(alerta).getByText(MENSAJE)).toBeInTheDocument();
    expect(mocks.update).toHaveBeenCalledWith(2, { activo: false });

    // Al fallar, el interruptor vuelve a "activo".
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Activo: Rosa Quispe" })).toBeChecked(),
    );
  }, 15_000);
});
