import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm, mensajeLogin } from "@/app/(auth)/login/login-form";
import { RegistroForm } from "@/app/(auth)/registro/registro-form";
import { GOOGLE_REDIRECT, mensajeGoogle } from "@/components/auth/google-boton";
import { CompletarDatos, validarDatos } from "@/components/portal/completar-datos";
import { apiErrorFromResponse } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  completarDatos: vi.fn(),
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
  auth: { login: vi.fn(), register: vi.fn() },
  portal: { completarDatos: mocks.completarDatos },
}));

beforeEach(() => vi.clearAllMocks());

describe("Continuar con Google (ronda B, parte 2)", () => {
  it("el botón aparece solo si el back tiene las credenciales", () => {
    const { unmount } = render(<LoginForm />);
    expect(screen.queryByRole("link", { name: /Continuar con Google/ })).not.toBeInTheDocument();
    unmount();

    render(<LoginForm google />);
    expect(screen.getByRole("link", { name: /Continuar con Google/ })).toHaveAttribute("href", GOOGLE_REDIRECT);
  });

  it("el registro del portal también lo ofrece", () => {
    render(<RegistroForm google />);

    expect(screen.getByRole("link", { name: /Registrarme con Google/ })).toHaveAttribute("href", GOOGLE_REDIRECT);
  });

  it("explica por qué Google devolvió al login", () => {
    render(<LoginForm google errorGoogle={mensajeGoogle("superusuario")} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "El superusuario no puede entrar con Google. Ingresa con tu correo y tu contraseña.",
    );
  });

  it("cada motivo tiene su texto; uno desconocido usa el genérico", () => {
    expect(mensajeGoogle("inactivo")).toMatch(/desactivada/);
    expect(mensajeGoogle("cliente-existente")).toMatch(/Pide a la empresa tu acceso/);
    expect(mensajeGoogle("sin-verificar")).toMatch(/Google no confirmó/);
    expect(mensajeGoogle("cancelado")).toMatch(/Cancelaste/);
    expect(mensajeGoogle("constructor")).toBe(mensajeGoogle("error"));
    expect(mensajeGoogle(null)).toBeNull();
  });
});

describe("mensajes del login", () => {
  it("un 401 son credenciales equivocadas, no una sesión vencida; un 403, una cuenta desactivada", () => {
    expect(mensajeLogin(apiErrorFromResponse(401, { message: "Credenciales inválidas." }))).toBe(
      "Correo o contraseña incorrectos.",
    );
    expect(mensajeLogin(apiErrorFromResponse(403, { message: "Tu cuenta está desactivada." }))).toBe(
      "Tu cuenta está desactivada. Comunícate con la empresa.",
    );
    expect(mensajeLogin(apiErrorFromResponse(429, {}))).toMatch(/Demasiados intentos/);
  });
});

describe("Completa tus datos", () => {
  it("valida teléfono y NIT/CI", () => {
    expect(validarDatos("", "")).toEqual({
      telefono: ["Escribe tu teléfono."],
      nit_ci: ["Escribe tu NIT o CI."],
    });
    expect(validarDatos("abc", "12")).toHaveProperty("telefono");
    expect(validarDatos("abc", "12")).toHaveProperty("nit_ci");
    expect(validarDatos("+591 712-34567", "7654321 LP")).toEqual({});
  });

  it("guarda y refresca el portal", async () => {
    const user = userEvent.setup();
    mocks.completarDatos.mockResolvedValue({});

    render(<CompletarDatos />);

    await user.type(screen.getByRole("textbox", { name: /Teléfono/ }), "71234567");
    await user.type(screen.getByRole("textbox", { name: /NIT o CI/ }), "7654321");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mocks.completarDatos).toHaveBeenCalledWith({ telefono: "71234567", nit_ci: "7654321" }));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("muestra el error del back en el campo (NIT/CI repetido)", async () => {
    const user = userEvent.setup();
    const mensaje = "Ese NIT/CI ya está registrado con otro cliente. Comunícate con la empresa para vincular tu cuenta.";
    mocks.completarDatos.mockRejectedValue(apiErrorFromResponse(422, { message: mensaje, errors: { nit_ci: [mensaje] } }));

    render(<CompletarDatos />);

    await user.type(screen.getByRole("textbox", { name: /Teléfono/ }), "71234567");
    await user.type(screen.getByRole("textbox", { name: /NIT o CI/ }), "1234567");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
