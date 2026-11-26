import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistroForm } from "@/app/(auth)/registro/registro-form";

const mocks = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/lib/api/client", () => ({ auth: { register: mocks.register } }));

const LENTA = 20_000;

beforeEach(() => mocks.register.mockReset());

async function llenar(user: ReturnType<typeof userEvent.setup>, password: string) {
  await user.type(screen.getByRole("textbox", { name: /^Nombre/ }), "Ana Pérez");
  await user.type(screen.getByRole("textbox", { name: /^Correo/ }), "ana@example.com");
  await user.type(screen.getByLabelText(/^Contraseña/), password);
  await user.type(screen.getByLabelText(/^Confirmar contraseña/), password);
  await user.click(screen.getByRole("button", { name: /Crear/ }));
}

describe("Registro con letras y números (ronda C, parte 3)", () => {
  it("RC-01: rechaza una contraseña sin números antes de enviar", async () => {
    const user = userEvent.setup();
    render(<RegistroForm />);

    expect(screen.getByText("Al menos 8 caracteres, con letras y números.")).toBeInTheDocument();

    await llenar(user, "solotexto");

    expect(screen.getAllByText("La contraseña debe tener al menos un número.").length).toBeGreaterThan(0);
    expect(mocks.register).not.toHaveBeenCalled();
  }, LENTA);

  it("con letras y números envía el registro", async () => {
    const user = userEvent.setup();
    mocks.register.mockResolvedValue({ id: 1, rol: "cliente" });
    render(<RegistroForm />);

    await llenar(user, "Clave2026x");

    await waitFor(() => expect(mocks.register).toHaveBeenCalled());
    expect(mocks.register.mock.calls[0][0]).toMatchObject({ password: "Clave2026x", password_confirmation: "Clave2026x" });
  }, LENTA);
});
