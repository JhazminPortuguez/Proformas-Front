import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OlvideContrasenaForm } from "@/components/auth/olvide-contrasena-form";
import { RestablecerContrasenaForm } from "@/components/auth/restablecer-contrasena-form";
import { apiErrorFromResponse } from "@/lib/api/errors";
import { errorContrasena, erroresContrasenaNueva } from "@/lib/contrasena";
import { LoginForm } from "@/app/(auth)/login/login-form";

const mocks = vi.hoisted(() => ({
  olvideContrasena: vi.fn(),
  restablecerContrasena: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/lib/api/client", () => ({
  auth: {
    olvideContrasena: mocks.olvideContrasena,
    restablecerContrasena: mocks.restablecerContrasena,
    login: vi.fn(),
  },
}));

const LENTA = 20_000;
const MENSAJE =
  "Si el correo está registrado, te enviamos un enlace para elegir una contraseña nueva. Vence en 60 minutos. Revisa también la carpeta de spam.";

beforeEach(() => vi.clearAllMocks());

describe("regla de contraseña (ronda C, igual que el back)", () => {
  it("8 caracteres, con letras y números", () => {
    expect(errorContrasena("")).toBe("Escribe la contraseña.");
    expect(errorContrasena("corta1")).toBe("La contraseña debe tener al menos 8 caracteres.");
    expect(errorContrasena("12345678")).toBe("La contraseña debe tener al menos una letra.");
    expect(errorContrasena("solotexto")).toBe("La contraseña debe tener al menos un número.");
    expect(errorContrasena("Ñandú2026")).toBeNull();
    expect(erroresContrasenaNueva("Clave2026", "Clave2027", "La contraseña nueva")).toEqual({
      password_confirmation: ["La confirmación no coincide con la contraseña nueva."],
    });
  });
});

describe("Olvidé mi contraseña (ronda C, parte 2)", () => {
  it("el login tiene el enlace", () => {
    render(<LoginForm />);

    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute("href", "/olvide-contrasena");
  });

  it("muestra el mismo mensaje que responde el back", async () => {
    const user = userEvent.setup();
    mocks.olvideContrasena.mockResolvedValue({ message: MENSAJE });
    render(<OlvideContrasenaForm />);

    await user.type(screen.getByRole("textbox", { name: /Correo/ }), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText(MENSAJE)).toBeInTheDocument();
    expect(mocks.olvideContrasena).toHaveBeenCalledWith("ana@example.com");
  }, LENTA);

  it("explica el límite de pedidos seguidos (429)", async () => {
    const user = userEvent.setup();
    mocks.olvideContrasena.mockRejectedValue(
      apiErrorFromResponse(429, { message: "Hiciste varios pedidos seguidos. Espera unos minutos." }),
    );
    render(<OlvideContrasenaForm />);

    await user.type(screen.getByRole("textbox", { name: /Correo/ }), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText(/varios pedidos seguidos/)).toBeInTheDocument();
  }, LENTA);
});

describe("Elegir una contraseña nueva", () => {
  it("valida la regla antes de enviar y luego confirma el cambio", async () => {
    const user = userEvent.setup();
    mocks.restablecerContrasena.mockResolvedValue({ message: "Tu contraseña se cambió." });
    render(<RestablecerContrasenaForm token="abc" email="ana@example.com" />);

    await user.type(screen.getByLabelText(/^Contraseña nueva/), "solotexto");
    await user.type(screen.getByLabelText(/^Repite la contraseña nueva/), "solotexto");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña nueva" }));

    expect(screen.getAllByText("La contraseña nueva debe tener al menos un número.").length).toBeGreaterThan(0);
    expect(mocks.restablecerContrasena).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/^Contraseña nueva/));
    await user.type(screen.getByLabelText(/^Contraseña nueva/), "Clave2026x");
    await user.clear(screen.getByLabelText(/^Repite la contraseña nueva/));
    await user.type(screen.getByLabelText(/^Repite la contraseña nueva/), "Clave2026x");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña nueva" }));

    await waitFor(() =>
      expect(mocks.restablecerContrasena).toHaveBeenCalledWith({
        token: "abc",
        email: "ana@example.com",
        password: "Clave2026x",
        password_confirmation: "Clave2026x",
      }),
    );
    expect(await screen.findByText("Contraseña cambiada")).toBeInTheDocument();
  }, LENTA);

  it("un enlace usado o vencido ofrece pedir otro", async () => {
    const user = userEvent.setup();
    const mensaje = 'El enlace no es válido, ya se usó o venció. Pide uno nuevo en "¿Olvidaste tu contraseña?".';
    mocks.restablecerContrasena.mockRejectedValue(
      apiErrorFromResponse(422, { message: mensaje, errors: { token: [mensaje] } }),
    );
    render(<RestablecerContrasenaForm token="usado" email="ana@example.com" />);

    await user.type(screen.getByLabelText(/^Contraseña nueva/), "Clave2026x");
    await user.type(screen.getByLabelText(/^Repite la contraseña nueva/), "Clave2026x");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña nueva" }));

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/olvide-contrasena");
  }, LENTA);

  it("sin token en el enlace no muestra el formulario", () => {
    render(<RestablecerContrasenaForm token="" email="" />);

    expect(screen.getByText(/El enlace está incompleto/)).toBeInTheDocument();
  });
});
