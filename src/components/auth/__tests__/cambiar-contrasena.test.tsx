import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CambiarContrasena, validarCambioContrasena } from "@/components/auth/cambiar-contrasena";
import { apiErrorFromResponse } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  cambiarContrasena: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mocks.replace,
    refresh: mocks.refresh,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api/client", () => ({
  auth: { cambiarContrasena: mocks.cambiarContrasena },
}));

beforeEach(() => vi.clearAllMocks());

const LENTA = 20_000;

describe("Cambiar contraseña (ronda B, parte 3)", () => {
  it("valida igual que el back", () => {
    expect(validarCambioContrasena({ actual: "", nueva: "", confirmacion: "" })).toEqual({
      password_actual: ["Escribe tu contraseña actual."],
      password: ["Escribe la contraseña nueva."],
    });
    expect(validarCambioContrasena({ actual: "a", nueva: "corta1", confirmacion: "corta1" }).password?.[0]).toMatch(/8 caracteres/);
    expect(validarCambioContrasena({ actual: "a", nueva: "12345678", confirmacion: "12345678" }).password?.[0]).toMatch(/una letra/);
    expect(validarCambioContrasena({ actual: "a", nueva: "solotexto", confirmacion: "solotexto" }).password?.[0]).toMatch(/un número/);
    expect(validarCambioContrasena({ actual: "Clave1234", nueva: "Clave1234", confirmacion: "Clave1234" }).password?.[0]).toMatch(/distinta/);
    expect(validarCambioContrasena({ actual: "a", nueva: "Clave1234", confirmacion: "Clave9999" })).toHaveProperty("password_confirmation");
    expect(validarCambioContrasena({ actual: "Temporal1", nueva: "Ñandú2026x", confirmacion: "Ñandú2026x" })).toEqual({});
  });

  it("cambia la contraseña y avisa que se cerraron las otras sesiones", async () => {
    const user = userEvent.setup();
    const mensaje = "Tu contraseña se cambió. Las otras sesiones abiertas con tu cuenta se cerraron.";
    mocks.cambiarContrasena.mockResolvedValue({ message: mensaje });

    render(<CambiarContrasena isOpen onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText(/^Contraseña actual/), "Temporal123");
    await user.type(screen.getByLabelText(/^Contraseña nueva/), "NuevaClave2026");
    await user.type(screen.getByLabelText(/^Repite la contraseña nueva/), "NuevaClave2026");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await waitFor(() =>
      expect(mocks.cambiarContrasena).toHaveBeenCalledWith({
        password_actual: "Temporal123",
        password: "NuevaClave2026",
        password_confirmation: "NuevaClave2026",
      }),
    );
    expect(await screen.findByText(mensaje)).toBeInTheDocument();
  }, LENTA);

  it("muestra el error de la contraseña actual en su campo", async () => {
    const user = userEvent.setup();
    const mensaje = "La contraseña actual no es correcta.";
    mocks.cambiarContrasena.mockRejectedValue(
      apiErrorFromResponse(422, { message: mensaje, errors: { password_actual: [mensaje] } }),
    );

    render(<CambiarContrasena isOpen onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText(/^Contraseña actual/), "equivocada1");
    await user.type(screen.getByLabelText(/^Contraseña nueva/), "NuevaClave2026");
    await user.type(screen.getByLabelText(/^Repite la contraseña nueva/), "NuevaClave2026");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect((await screen.findAllByText(mensaje)).length).toBeGreaterThan(0);
  }, LENTA);
});
