import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOTIVO_SIN_EMAIL, ProformaCompartir } from "@/components/proformas/proforma-compartir";
import { MOTIVO_SIN_TELEFONO } from "@/lib/whatsapp";

const mocks = vi.hoisted(() => ({ reenviarCorreo: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: mocks.refresh, prefetch: vi.fn() }),
}));

vi.mock("@/lib/api/client", () => ({
  proformas: { reenviarCorreo: mocks.reenviarCorreo },
}));

const BASE = {
  proformaId: 42,
  numero: "PR-2026-000042",
  total: 1250.75,
  moneda: "BOB",
  fechaValidez: "2026-11-30",
  email: "ana@correo.bo",
  telefono: "71234567",
  puedeReenviar: true,
};

beforeEach(() => vi.clearAllMocks());

describe("ProformaCompartir (ronda A, parte 2)", () => {
  it("WhatsApp abre wa.me en una pestaña nueva con el enlace al portal", () => {
    render(<ProformaCompartir {...BASE} />);

    const enlace = screen.getByRole("link", { name: /Compartir la proforma PR-2026-000042 por WhatsApp/ });
    const url = new URL(enlace.getAttribute("href")!);

    expect(url.origin + url.pathname).toBe("https://wa.me/59171234567");
    expect(url.searchParams.get("text")).toContain(`${window.location.origin}/portal/proformas/42`);
    expect(enlace).toHaveAttribute("target", "_blank");
    expect(enlace).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("sin teléfono ni correo, los botones quedan deshabilitados y dicen por qué", () => {
    render(<ProformaCompartir {...BASE} telefono={null} email={null} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compartir por WhatsApp" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Reenviar por correo" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(MOTIVO_SIN_TELEFONO)).toBeInTheDocument();
    expect(screen.getByText(MOTIVO_SIN_EMAIL)).toBeInTheDocument();
  });

  it("reenviar por correo muestra el resultado", async () => {
    const user = userEvent.setup();
    mocks.reenviarCorreo.mockResolvedValue({ correo: { enviado: true, mensaje: "Correo enviado a ana@correo.bo." } });

    render(<ProformaCompartir {...BASE} />);
    await user.click(screen.getByRole("button", { name: "Reenviar la proforma PR-2026-000042 por correo a ana@correo.bo" }));

    await waitFor(() => expect(mocks.reenviarCorreo).toHaveBeenCalledWith(42));
    expect(await screen.findByRole("status")).toHaveTextContent("Correo enviado a ana@correo.bo.");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("sin permiso de reenviar, solo queda WhatsApp", () => {
    render(<ProformaCompartir {...BASE} puedeReenviar={false} />);

    expect(screen.queryByRole("button", { name: /Reenviar/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toBeInTheDocument();
  });
});
