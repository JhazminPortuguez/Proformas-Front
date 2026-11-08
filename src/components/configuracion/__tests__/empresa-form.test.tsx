import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmpresaForm } from "@/components/configuracion/empresa-form";
import { navItemsFor } from "@/components/layout/nav";
import { ApiError } from "@/lib/api/types";
import type { Empresa } from "@/lib/api/types";
import { LOGO_MAX_BYTES, empresaPayload, validarLogo } from "@/lib/configuracion";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
  subirLogo: vi.fn(),
  eliminarLogo: vi.fn(),
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
  empresa: {
    update: mocks.update,
    subirLogo: mocks.subirLogo,
    eliminarLogo: mocks.eliminarLogo,
  },
}));

const EMPRESA: Empresa = {
  id: 1,
  nombre: "Empresa Demo",
  nit: null,
  telefono: null,
  email: null,
  direccion: null,
  condiciones: null,
  logo_url: null,
  updated_at: null,
};

function archivo(nombre: string, tipo: string, bytes: number): File {
  const file = new File(["x"], nombre, { type: tipo });
  Object.defineProperty(file, "size", { value: bytes });

  return file;
}

beforeEach(() => {
  mocks.update.mockReset();
  mocks.subirLogo.mockReset();
  mocks.eliminarLogo.mockReset();
  globalThis.URL.createObjectURL = vi.fn(() => "blob:previa");
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe("configuración: utilidades", () => {
  it("valida tipo y tamaño del logo como el back", () => {
    expect(validarLogo({ type: "image/png", size: 1000 })).toBeNull();
    expect(validarLogo({ type: "image/jpeg", size: LOGO_MAX_BYTES })).toBeNull();
    expect(validarLogo({ type: "image/gif", size: 1000 })).toBe("El logo debe ser una imagen PNG o JPG.");
    expect(validarLogo({ type: "application/pdf", size: 1000 })).toBe("El logo debe ser una imagen PNG o JPG.");
    expect(validarLogo({ type: "image/png", size: LOGO_MAX_BYTES + 1 })).toBe("El logo no puede pesar más de 1 MB.");
  });

  it("los campos vacíos viajan como null", () => {
    expect(
      empresaPayload({ nombre: " Empresa ", nit: "", telefono: " 444 ", email: "", direccion: "", condiciones: "" }),
    ).toEqual({ nombre: "Empresa", nit: null, telefono: "444", email: null, direccion: null, condiciones: null });
  });

  it("Configuración ya no está marcada como Pronto y es solo del admin", () => {
    const item = navItemsFor("admin").flatMap((g) => g.items).find((i) => i.href === "/configuracion");

    expect(item?.ready).toBe(true);
    expect(navItemsFor("operario").flatMap((g) => g.items).some((i) => i.href === "/configuracion")).toBe(false);
  });
});

describe("EmpresaForm", () => {
  it("guarda los datos con los campos reales", async () => {
    const user = userEvent.setup();
    mocks.update.mockResolvedValue({ ...EMPRESA, telefono: "44412345", email: "ventas@empresa.test" });

    render(<EmpresaForm empresa={EMPRESA} />);

    const guardar = screen.getByRole("button", { name: "Guardar cambios" });
    expect(guardar).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /^Teléfono/ }), "44412345");
    await user.type(screen.getByRole("textbox", { name: /^Correo/ }), "ventas@empresa.test");
    await user.click(guardar);

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update).toHaveBeenCalledWith({
      nombre: "Empresa Demo",
      nit: null,
      telefono: "44412345",
      email: "ventas@empresa.test",
      direccion: null,
      condiciones: null,
    });
    expect(await screen.findByText("Datos guardados.")).toBeInTheDocument();
  }, 20_000);

  it("muestra los errores del servidor junto al campo", async () => {
    const user = userEvent.setup();
    mocks.update.mockRejectedValue(new ApiError("Datos inválidos", 422, { email: ["El correo no es válido."] }));

    render(<EmpresaForm empresa={EMPRESA} />);

    await user.type(screen.getByRole("textbox", { name: /^Correo/ }), "x");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("El correo no es válido.")).toBeInTheDocument();
  }, 20_000);

  it("rechaza en el navegador un logo que no es PNG/JPG o pesa más de 1 MB", async () => {
    render(<EmpresaForm empresa={EMPRESA} />);

    const input = screen.getByLabelText("Elegir imagen");

    fireEvent.change(input, { target: { files: [archivo("logo.gif", "image/gif", 2000)] } });
    expect(screen.getByRole("alert")).toHaveTextContent("El logo debe ser una imagen PNG o JPG.");
    expect(screen.getByRole("button", { name: "Subir logo" })).toBeDisabled();

    fireEvent.change(input, { target: { files: [archivo("logo.png", "image/png", LOGO_MAX_BYTES + 1)] } });
    expect(screen.getByRole("alert")).toHaveTextContent("El logo no puede pesar más de 1 MB.");
    expect(mocks.subirLogo).not.toHaveBeenCalled();
  });

  it("muestra la vista previa y sube el logo", async () => {
    const user = userEvent.setup();
    mocks.subirLogo.mockResolvedValue({ ...EMPRESA, logo_url: "/api/v1/empresa/logo?v=abc" });

    render(<EmpresaForm empresa={EMPRESA} />);

    expect(screen.getByText("Sin logo")).toBeInTheDocument();

    const logo = archivo("logo.png", "image/png", 5000);
    fireEvent.change(screen.getByLabelText("Elegir imagen"), { target: { files: [logo] } });

    expect(screen.getByRole("img", { name: "Vista previa del logo nuevo" })).toHaveAttribute("src", "blob:previa");

    await user.click(screen.getByRole("button", { name: "Subir logo" }));

    await waitFor(() => expect(mocks.subirLogo).toHaveBeenCalledWith(logo));
    expect(await screen.findByRole("img", { name: "Logo actual de la empresa" })).toHaveAttribute(
      "src",
      "/api/v1/empresa/logo?v=abc",
    );
    expect(screen.getByRole("button", { name: "Quitar logo" })).toBeInTheDocument();
  }, 20_000);

  it("muestra el error del servidor al subir el logo", async () => {
    const user = userEvent.setup();
    mocks.subirLogo.mockRejectedValue(
      new ApiError("Datos inválidos", 422, { logo: ["El logo debe ser una imagen PNG o JPG."] }),
    );

    render(<EmpresaForm empresa={EMPRESA} />);

    fireEvent.change(screen.getByLabelText("Elegir imagen"), {
      target: { files: [archivo("logo.png", "image/png", 5000)] },
    });
    await user.click(screen.getByRole("button", { name: "Subir logo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El logo debe ser una imagen PNG o JPG.");
  }, 20_000);

  it("quita el logo después de confirmar", async () => {
    const user = userEvent.setup();
    mocks.eliminarLogo.mockResolvedValue({ ...EMPRESA, logo_url: null });

    render(<EmpresaForm empresa={{ ...EMPRESA, logo_url: "/api/v1/empresa/logo?v=abc" }} />);

    await user.click(screen.getByRole("button", { name: "Quitar logo" }));
    await user.click(await screen.findByRole("button", { name: "Quitar logo", hidden: false }));

    await waitFor(() => expect(mocks.eliminarLogo).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Sin logo")).toBeInTheDocument();
  }, 20_000);
});
