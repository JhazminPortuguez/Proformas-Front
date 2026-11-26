import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParametrosForm, validarParametros } from "@/components/configuracion/parametros-form";
import { EstadoSistemaView } from "@/components/sistema/estado-sistema";
import { apiErrorFromResponse } from "@/lib/api/errors";
import type { EstadoSistema } from "@/lib/api/types";
import { sumarDias, valoresIniciales } from "@/lib/proformas";
import { homePathFor, rolesQueAsigna, rolesQueGestiona } from "@/lib/roles";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  updateParametros: vi.fn(),
  correoPrueba: vi.fn(),
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
  parametros: { update: mocks.updateParametros },
  sistema: { correoPrueba: mocks.correoPrueba },
}));

beforeEach(() => vi.clearAllMocks());

describe("roles (ronda B)", () => {
  it("el superusuario empieza en Configuración y no en el Panel", () => {
    expect(homePathFor("superusuario")).toBe("/configuracion");
    expect(homePathFor("admin")).toBe("/dashboard");
    expect(homePathFor("cliente")).toBe("/portal");
  });

  it("cada rol gestiona y asigna roles distintos; nadie da el de superusuario", () => {
    expect(rolesQueGestiona("superusuario")).toEqual(["superusuario", "admin", "operario"]);
    expect(rolesQueAsigna("superusuario")).toEqual(["admin", "operario"]);
    expect(rolesQueGestiona("admin")).toEqual(["operario", "cliente"]);
    expect(rolesQueAsigna("admin")).toEqual(["operario", "cliente"]);
    expect(rolesQueGestiona("operario")).toEqual([]);
  });
});

describe("valores iniciales de una proforma nueva", () => {
  it("suma días a una fecha sin hora, también al cambiar de mes y de año", () => {
    expect(sumarDias("2026-11-23", 15)).toBe("2026-12-08");
    expect(sumarDias("2026-12-20", 15)).toBe("2027-01-04");
    expect(sumarDias("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("usa los parámetros; sin ellos, 13 % y validez en blanco", () => {
    expect(valoresIniciales({ impuesto_por_defecto: "15.50", dias_validez_por_defecto: 30 }, "2026-11-23")).toEqual({
      impuesto_tasa: "15.5",
      fecha_validez: "2026-12-23",
    });
    expect(valoresIniciales({ impuesto_por_defecto: "0.00", dias_validez_por_defecto: null }, "2026-11-23")).toEqual({
      impuesto_tasa: "0",
      fecha_validez: "",
    });
    expect(valoresIniciales(null, "2026-11-23")).toEqual({ impuesto_tasa: "13", fecha_validez: "" });
  });
});

describe("ParametrosForm", () => {
  it("valida el rango y los decimales", () => {
    expect(validarParametros({ impuesto: "", dias: "" })).toHaveProperty("impuesto_por_defecto");
    expect(validarParametros({ impuesto: "101", dias: "" }).impuesto_por_defecto?.[0]).toBe(
      "El impuesto debe estar entre 0 y 100 %.",
    );
    expect(validarParametros({ impuesto: "13,555", dias: "" }).impuesto_por_defecto?.[0]).toBe(
      "El impuesto admite como máximo 2 decimales.",
    );
    expect(validarParametros({ impuesto: "13", dias: "0" })).toHaveProperty("dias_validez_por_defecto");
    expect(validarParametros({ impuesto: "13", dias: "7,5" })).toHaveProperty("dias_validez_por_defecto");
    expect(validarParametros({ impuesto: "13,5", dias: "30" })).toEqual({});
    expect(validarParametros({ impuesto: "0", dias: "" })).toEqual({});
  });

  it("guarda el impuesto con coma decimal y los días", async () => {
    const user = userEvent.setup();
    mocks.updateParametros.mockResolvedValue({ impuesto_por_defecto: "15.50", dias_validez_por_defecto: 30 });

    render(<ParametrosForm parametros={{ impuesto_por_defecto: "13.00", dias_validez_por_defecto: null }} />);

    const impuesto = screen.getByRole("textbox", { name: /Impuesto por defecto/ });
    expect(impuesto).toHaveValue("13");
    expect(screen.getByRole("button", { name: "Guardar parámetros" })).toBeDisabled();

    await user.clear(impuesto);
    await user.type(impuesto, "15,5");
    await user.type(screen.getByRole("textbox", { name: /Días de validez/ }), "30");
    await user.click(screen.getByRole("button", { name: "Guardar parámetros" }));

    await waitFor(() => expect(mocks.updateParametros).toHaveBeenCalledTimes(1));
    expect(mocks.updateParametros).toHaveBeenCalledWith({ impuesto_por_defecto: 15.5, dias_validez_por_defecto: 30 });
    expect(await screen.findByText(/Parámetros guardados/)).toBeInTheDocument();
  });

  it("no envía un impuesto inválido", async () => {
    const user = userEvent.setup();

    render(<ParametrosForm parametros={{ impuesto_por_defecto: "13.00", dias_validez_por_defecto: null }} />);

    const impuesto = screen.getByRole("textbox", { name: /Impuesto por defecto/ });
    await user.clear(impuesto);
    await user.type(impuesto, "120");
    await user.click(screen.getByRole("button", { name: "Guardar parámetros" }));

    expect((await screen.findAllByText("El impuesto debe estar entre 0 y 100 %.")).length).toBeGreaterThan(0);
    expect(mocks.updateParametros).not.toHaveBeenCalled();
  });
});

const ESTADO: EstadoSistema = {
  app: { nombre: "Proformas", version: "1.0.0", entorno: "local", debug: false, laravel: "12.72.0", php: "8.2.29" },
  migraciones: { aplicadas: 53, pendientes: 0, ultima: "2026_11_23_000002_add_parametros_to_empresas_table" },
  correo: {
    mailer: "smtp",
    envia_correos_reales: true,
    configurado: true,
    host: "smtp.gmail.com",
    puerto: 587,
    seguridad: null,
    usuario: "empresa@gmail.com",
    password_configurada: true,
    remitente: "empresa@gmail.com",
    remitente_nombre: "Proformas",
    faltan: [],
  },
};

describe("EstadoSistemaView", () => {
  it("muestra versión, migraciones y correo sin la contraseña", () => {
    render(<EstadoSistemaView estado={ESTADO} email="soporte@example.com" />);

    expect(screen.getByText("1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Todas las migraciones están aplicadas")).toBeInTheDocument();
    expect(screen.getByText("El correo está configurado")).toBeInTheDocument();
    expect(screen.getByText("smtp.gmail.com")).toBeInTheDocument();
    expect(screen.getByText("Configurada (no se muestra)")).toBeInTheDocument();
    expect(screen.queryByText(/modo depuración está activo/)).not.toBeInTheDocument();
  });

  it("avisa si el modo depuración está activo", () => {
    render(<EstadoSistemaView estado={{ ...ESTADO, app: { ...ESTADO.app, debug: true } }} email="soporte@example.com" />);

    expect(screen.getByText(/El modo depuración está activo \(APP_DEBUG=true\)/)).toBeInTheDocument();
  });

  it("dice qué falta y avisa si los correos van al log", () => {
    const { rerender } = render(
      <EstadoSistemaView
        estado={{
          ...ESTADO,
          migraciones: { ...ESTADO.migraciones, pendientes: 2 },
          correo: { ...ESTADO.correo, configurado: false, password_configurada: false, faltan: ["MAIL_PASSWORD"] },
        }}
        email="soporte@example.com"
      />,
    );

    expect(screen.getByText("Falta configurar: MAIL_PASSWORD")).toBeInTheDocument();
    expect(screen.getByText(/2 migraciones pendientes/)).toBeInTheDocument();
    expect(screen.getByText("Falta")).toBeInTheDocument();

    rerender(
      <EstadoSistemaView
        estado={{ ...ESTADO, correo: { ...ESTADO.correo, mailer: "log", envia_correos_reales: false, configurado: false } }}
        email="soporte@example.com"
      />,
    );
    expect(screen.getByText(/Los correos no salen: el mailer es «log»/)).toBeInTheDocument();
  });

  it("envía el correo de prueba y muestra el resultado o el error", async () => {
    const user = userEvent.setup();
    mocks.correoPrueba.mockResolvedValueOnce({
      enviado: true,
      real: true,
      message: "Enviamos el correo de prueba a soporte@example.com. Revisa tu bandeja (y la carpeta de spam).",
    });

    render(<EstadoSistemaView estado={ESTADO} email="soporte@example.com" />);

    await user.click(screen.getByRole("button", { name: "Enviar correo de prueba" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Enviamos el correo de prueba a soporte@example.com");

    mocks.correoPrueba.mockRejectedValueOnce(
      apiErrorFromResponse(502, {
        message: "No se pudo enviar el correo de prueba. El servidor de correo rechazó el usuario o la contraseña.",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Enviar correo de prueba" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("rechazó el usuario o la contraseña");
  });
});
