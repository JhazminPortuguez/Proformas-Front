import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProformaDetailActions } from "@/components/proformas/proforma-detail-actions";
import { ProformaForm } from "@/components/proformas/proforma-form";
import { apiErrorFromResponse } from "@/lib/api/errors";
import type { Cliente, Producto, Servicio } from "@/lib/api/types";

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

const aceptar = vi.fn();

vi.mock("@/lib/api/client", () => ({
  proformas: {
    aceptar: (...args: unknown[]) => aceptar(...args),
    enviar: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  proformaPdfUrl: (id: number) => `/api/v1/proformas/${id}/pdf`,
}));

function cliente(id: number, nombre: string, estado: Cliente["estado"]): Cliente {
  return {
    id,
    nombre_razon: nombre,
    nit_ci: null,
    telefono: null,
    email: null,
    direccion: null,
    estado,
  };
}

describe("Aceptar una proforma vencida", () => {
  beforeEach(() => {
    // 8/11/2026 a las 21:00 en Bolivia (UTC-4).
    vi.useFakeTimers({ now: new Date("2026-11-09T01:00:00Z"), shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("se permite, pero el diálogo avisa la fecha en que venció", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    aceptar.mockResolvedValue({});

    render(
      <ProformaDetailActions
        proformaId={9}
        numero="PR-2026-000009"
        acciones={["ver", "aceptar", "rechazar"]}
        canDelete={false}
        total={500}
        estado="ENVIADA"
        fechaValidez="2026-11-01"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Esta proforma venció el 01/11/2026.");

    const confirmar = screen.getAllByRole("button", { name: "Aceptar" }).at(-1)!;
    expect(confirmar).toBeEnabled();
    await user.click(confirmar);

    expect(aceptar).toHaveBeenCalledWith(9);
  });

  it("si el back rechaza, el aviso dice el motivo y no el genérico", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    aceptar.mockRejectedValue(
      apiErrorFromResponse(422, {
        message: "Solo se puede aceptar una proforma enviada.",
        errors: { estado: ["Solo se puede aceptar una proforma enviada."] },
      }),
    );

    render(
      <ProformaDetailActions
        proformaId={9}
        numero="PR-2026-000009"
        acciones={["ver", "aceptar"]}
        canDelete={false}
        total={500}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getAllByRole("button", { name: "Aceptar" }).at(-1)!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Solo se puede aceptar una proforma enviada.",
    );
  });

  it("sin aviso si la validez es hoy en Bolivia", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <ProformaDetailActions
        proformaId={9}
        numero="PR-2026-000009"
        acciones={["ver", "aceptar"]}
        canDelete={false}
        total={500}
        estado="ENVIADA"
        fechaValidez="2026-11-08"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).not.toHaveTextContent(/venció/);
  });
});

describe("Selector de clientes de la proforma", () => {
  const SERVICIOS: Servicio[] = [];
  const PRODUCTOS: Producto[] = [];

  async function opcionesDelSelector() {
    const user = userEvent.setup();

    // Con el foco en el combobox, flecha abajo abre la lista completa.
    await user.click(screen.getByRole("combobox", { name: /Cliente/ }));
    await user.keyboard("{ArrowDown}");

    const opciones = await screen.findAllByRole("option");

    return opciones.map((opcion) => opcion.textContent ?? "");
  }

  it("una proforma nueva no ofrece clientes inactivos", async () => {
    render(
      <ProformaForm
        proforma={null}
        clientes={[
          cliente(1, "Constructora Andina", "activo"),
          cliente(2, "Taller Prospecto", "prospecto"),
          cliente(3, "Empresa Cerrada", "inactivo"),
        ]}
        servicios={SERVICIOS}
        productos={PRODUCTOS}
        today="2026-11-08"
      />,
    );

    const opciones = await opcionesDelSelector();

    expect(opciones.some((texto) => texto.includes("Constructora Andina"))).toBe(true);
    expect(opciones.some((texto) => texto.includes("Taller Prospecto"))).toBe(true);
    expect(opciones.some((texto) => texto.includes("Empresa Cerrada"))).toBe(false);
  });

  it("si todos están inactivos, avisa que no hay clientes activos ni prospectos", () => {
    render(
      <ProformaForm
        proforma={null}
        clientes={[cliente(3, "Empresa Cerrada", "inactivo")]}
        servicios={SERVICIOS}
        productos={PRODUCTOS}
        today="2026-11-08"
      />,
    );

    expect(screen.getByText("No hay clientes activos ni prospectos")).toBeInTheDocument();
  });
});

describe("Catálogo de la proforma", () => {
  const CLIENTE = cliente(1, "Constructora Andina", "activo");
  const SERVICIO_ACTIVO: Servicio = {
    id: 10,
    nombre: "Armado de PC",
    descripcion: null,
    precio_base: 150,
    duracion_estimada_min: 120,
    categoria: "Soporte",
    activo: true,
    visible_catalogo: true,
  };
  const SERVICIO_INACTIVO: Servicio = { ...SERVICIO_ACTIVO, id: 11, nombre: "Servicio retirado", activo: false };

  async function abrirServicios() {
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^Servicio$/ }));
    await user.click(screen.getAllByRole("combobox", { name: /Servicio/ }).at(-1)!);
    await user.keyboard("{ArrowDown}");

    return (await screen.findAllByRole("option")).map((opcion) => opcion.textContent ?? "");
  }

  it("en ítems nuevos solo ofrece servicios activos", async () => {
    render(
      <ProformaForm
        proforma={null}
        clientes={[CLIENTE]}
        servicios={[SERVICIO_ACTIVO, SERVICIO_INACTIVO]}
        productos={[]}
        today="2026-11-08"
      />,
    );

    const opciones = await abrirServicios();

    expect(opciones.some((texto) => texto.includes("Armado de PC"))).toBe(true);
    expect(opciones.some((texto) => texto.includes("Servicio retirado"))).toBe(false);
  });
});
