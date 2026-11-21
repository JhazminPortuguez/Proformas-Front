import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  estadoVerificacion,
  VerificarCorreoResultado,
} from "@/components/portal/verificar-correo-resultado";
import { AvisoVerificarCorreo } from "@/components/portal/aviso-verificar-correo";
import { MENSAJE_LIMITE_ENLACES, ReenviarEnlace } from "@/components/portal/reenviar-enlace";
import { ApiError } from "@/lib/api/types";

const mocks = vi.hoisted(() => ({ reenviarVerificacion: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  auth: { reenviarVerificacion: mocks.reenviarVerificacion },
}));

beforeEach(() => vi.clearAllMocks());

async function pagina(estado?: string) {
  render(<VerificarCorreoResultado estado={estadoVerificacion(estado)} />);
}

describe("/verificar-correo (ronda A, parte 3)", () => {
  it("verificado: lo dice y ofrece ir al portal", async () => {
    await pagina("verificado");

    expect(screen.getByRole("heading", { level: 1, name: "Tu correo fue verificado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a mi portal" })).toHaveAttribute("href", "/portal");
    expect(screen.queryByRole("button", { name: "Reenviar enlace" })).not.toBeInTheDocument();
  });

  it("vencido: explica y ofrece reenviar", async () => {
    await pagina("vencido");

    expect(screen.getByRole("heading", { level: 1, name: "El enlace venció" })).toBeInTheDocument();
    expect(screen.getByText(/dura 60 minutos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar enlace" })).toBeInTheDocument();
  });

  it("un estado desconocido o ausente se trata como enlace no válido", async () => {
    await pagina("constructor");
    expect(screen.getByRole("heading", { level: 1, name: "El enlace no es válido" })).toBeInTheDocument();
  });
});

describe("ReenviarEnlace", () => {
  it("muestra el mensaje del back al reenviar", async () => {
    const user = userEvent.setup();
    mocks.reenviarVerificacion.mockResolvedValue({
      message: "Te enviamos un enlace nuevo a ana@correo.bo. Vence en 60 minutos.",
      enviado: true,
    });

    render(<ReenviarEnlace />);
    await user.click(screen.getByRole("button", { name: "Reenviar enlace" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Te enviamos un enlace nuevo a ana@correo.bo.");
  });

  it("con el límite de envíos, explica que espere", async () => {
    const user = userEvent.setup();
    mocks.reenviarVerificacion.mockRejectedValue(new ApiError("Demasiados intentos.", 429));

    render(<ReenviarEnlace />);
    await user.click(screen.getByRole("button", { name: "Reenviar enlace" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAJE_LIMITE_ENLACES);
  });

  it("sin sesión, ofrece iniciarla", async () => {
    const user = userEvent.setup();
    mocks.reenviarVerificacion.mockRejectedValue(new ApiError("No autenticado.", 401));

    render(<ReenviarEnlace />);
    await user.click(screen.getByRole("button", { name: "Reenviar enlace" }));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "inicia sesión" })).toHaveAttribute("href", "/login?next=%2Fportal"),
    );
  });
});

describe("AvisoVerificarCorreo", () => {
  it("dice a qué correo se envió y qué no puede hacer todavía", () => {
    render(<AvisoVerificarCorreo email="ana@correo.bo" />);

    expect(screen.getByText("Verifica tu correo")).toBeInTheDocument();
    expect(screen.getByText("ana@correo.bo")).toBeInTheDocument();
    expect(screen.getByText(/no enviar solicitudes ni aceptar o rechazar proformas/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar enlace" })).toBeInTheDocument();
  });
});
