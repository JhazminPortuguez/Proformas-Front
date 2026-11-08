import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactoEmpresa } from "@/components/portal/contacto-empresa";
import { PortalProformasTable } from "@/components/portal/portal-proformas-table";
import { PortalSolicitudesTable } from "@/components/portal/portal-solicitudes-table";
import { PortalShell } from "@/components/portal/portal-shell";
import { SolicitarForm } from "@/components/portal/solicitar-form";
import { ApiError } from "@/lib/api/types";
import type { PortalProforma, PortalSolicitud, User } from "@/lib/api/types";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  pathname: "/portal",
  crearSolicitud: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
    refresh: mocks.refresh,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mocks.pathname,
}));

vi.mock("@/lib/api/client", () => ({
  portal: { crearSolicitud: mocks.crearSolicitud },
  auth: { logout: mocks.logout },
}));

const META = { current_page: 1, per_page: 15, total: 2, last_page: 1 };

const ENVIADA: PortalProforma = {
  id: 7,
  numero: "PR-2026-000007",
  estado: "ENVIADA",
  fecha_emision: "2026-10-01",
  fecha_validez: "2026-10-31",
  vencida: true,
  moneda: "BOB",
  total: 565,
  items_count: 3,
  primer_item: "Instalación eléctrica",
  solicitud_id: null,
};

const ACEPTADA: PortalProforma = {
  ...ENVIADA,
  id: 8,
  numero: "PR-2026-000008",
  estado: "ACEPTADA",
  vencida: false,
  items_count: 1,
  primer_item: "Pintura",
};

beforeEach(() => {
  mocks.push.mockClear();
  mocks.refresh.mockClear();
  mocks.crearSolicitud.mockReset();
  mocks.pathname = "/portal";
});

describe("PortalShell", () => {
  const USER: User = {
    id: 5,
    name: "Ana Cliente",
    email: "ana@cliente.test",
    rol: "cliente",
    activo: true,
    cliente_id: 2,
    empresa_id: 1,
  };

  it("muestra el menú del portal y marca la página actual", () => {
    mocks.pathname = "/portal/proformas/7";
    render(<PortalShell user={USER}>contenido</PortalShell>);

    const menu = screen.getByRole("navigation", { name: "Menú del portal" });
    const enlaces = within(menu).getAllByRole("link");

    expect(enlaces.map((a) => a.textContent)).toEqual([
      "Inicio",
      "Servicios",
      "Mis proformas",
      "Mis solicitudes",
    ]);
    expect(within(menu).getByRole("link", { name: "Mis proformas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(menu).getByRole("link", { name: "Inicio" })).not.toHaveAttribute("aria-current");
  });
});

describe("PortalProformasTable", () => {
  it("muestra resumen de ítems, aviso de vencida, total y PDF sin aceptar ni rechazar", () => {
    render(
      <PortalProformasTable proformas={[ENVIADA, ACEPTADA]} meta={META} filtro="todas" />,
    );

    const tabla = screen.getByRole("grid", { name: "Mis proformas" });

    expect(within(tabla).getByRole("link", { name: "PR-2026-000007" })).toHaveAttribute(
      "href",
      "/portal/proformas/7",
    );
    expect(within(tabla).getByText("Instalación eléctrica +2 más")).toBeInTheDocument();
    expect(within(tabla).getByText("Pintura")).toBeInTheDocument();
    expect(within(tabla).getByText("Venció")).toBeInTheDocument();
    expect(within(tabla).getAllByText("01/10/2026")).toHaveLength(2);
    expect(within(tabla).getByText("Enviada")).toBeInTheDocument();
    expect(
      within(tabla).getByRole("link", { name: "Descargar PDF de la proforma PR-2026-000007" }),
    ).toHaveAttribute("href", "/api/v1/portal/proformas/7/pdf");

    expect(screen.queryByRole("button", { name: /Aceptar|Rechazar/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Borrador/)).not.toBeInTheDocument();
  });

  it("sin proformas muestra un estado vacío según el filtro", () => {
    render(
      <PortalProformasTable
        proformas={[]}
        meta={{ ...META, total: 0 }}
        filtro="aceptadas"
      />,
    );

    expect(screen.getAllByText("Sin proformas en este estado").length).toBeGreaterThan(0);
  });
});

describe("PortalSolicitudesTable", () => {
  const BASE: PortalSolicitud = {
    id: 4,
    descripcion: "Mantenimiento del tablero",
    estado: "PENDIENTE",
    fecha: "2026-11-02T14:00:00Z",
    items_count: 2,
    proforma: null,
  };

  it("enlaza la proforma solo cuando la API la incluye y muestra Rechazada tal cual", () => {
    render(
      <PortalSolicitudesTable
        solicitudes={[
          BASE,
          // Atendida con la proforma aún en borrador: sin enlace.
          { ...BASE, id: 5, descripcion: "Atendida sin enviar", estado: "ATENDIDA" },
          {
            ...BASE,
            id: 6,
            descripcion: "Atendida con proforma",
            estado: "ATENDIDA",
            proforma: { id: 7, numero: "PR-2026-000007", estado: "ENVIADA" },
          },
          { ...BASE, id: 9, descripcion: "Rechazada", estado: "RECHAZADA" },
        ]}
        meta={{ ...META, total: 4 }}
        filtro="todas"
      />,
    );

    const tabla = screen.getByRole("grid", { name: "Mis solicitudes" });
    const enlaces = within(tabla).getAllByRole("link", { name: /Ver proforma asociada/ });

    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]).toHaveAttribute("href", "/portal/proformas/7");
    expect(within(tabla).getByRole("link", { name: "Mantenimiento del tablero" })).toHaveAttribute(
      "href",
      "/portal/solicitudes/4",
    );
    expect(within(tabla).getAllByText("02/11/2026")).toHaveLength(4);
    expect(within(tabla).getAllByText("Rechazada").length).toBeGreaterThan(0);
  });
});

describe("ContactoEmpresa", () => {
  it("muestra el texto oficial con teléfono y correo reales", () => {
    render(
      <ContactoEmpresa
        empresa={{ nombre: "Servicios SRL", telefono: "4-4412345", email: "ventas@empresa.test", direccion: null }}
      />,
    );

    expect(
      screen.getByText("Para aceptar esta proforma, comunícate con nosotros"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Llamar/ })).toHaveAttribute("href", "tel:44412345");
    expect(screen.getByRole("link", { name: "ventas@empresa.test" })).toHaveAttribute(
      "href",
      "mailto:ventas@empresa.test",
    );
  });

  it("sin datos de contacto no inventa ninguno", () => {
    render(<ContactoEmpresa empresa={{ nombre: "X", telefono: null, email: null, direccion: null }} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/todavía no registró/)).toBeInTheDocument();
  });
});

describe("SolicitarForm", () => {
  it("precarga el servicio del catálogo como primer ítem", () => {
    render(
      <SolicitarForm
        servicio={{
          id: 3,
          nombre: "Pintura de interiores",
          descripcion: null,
          categoria: "Pintura",
          precio_base: 250,
          duracion_estimada_min: 120,
        }}
      />,
    );

    expect(screen.getByRole("textbox", { name: /^Descripción/ })).toHaveValue(
      "Pintura de interiores",
    );
    expect(screen.getByRole("textbox", { name: /^Cantidad/ })).toHaveValue("1");
  }, 20_000);

  it("valida antes de enviar", async () => {
    const user = userEvent.setup();
    render(<SolicitarForm />);

    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    expect(await screen.findByText("Cuéntanos qué necesitas.")).toBeInTheDocument();
    expect(screen.getByText("Describe el ítem.")).toBeInTheDocument();
    expect(mocks.crearSolicitud).not.toHaveBeenCalled();
  }, 20_000);

  it("envía descripción e ítems sin cliente y confirma con fecha y estado Pendiente", async () => {
    const user = userEvent.setup();
    mocks.crearSolicitud.mockResolvedValue({
      id: 12,
      descripcion: "Necesito pintar",
      estado: "PENDIENTE",
      fecha: "2026-11-02T04:39:00Z",
      items_count: 2,
      proforma: null,
    } satisfies PortalSolicitud);

    render(<SolicitarForm />);

    await user.type(screen.getByRole("textbox", { name: /¿Qué necesitas\?/ }), "Necesito pintar");
    await user.type(screen.getByRole("textbox", { name: /^Descripción/ }), "Pintura de sala");
    await user.clear(screen.getByRole("textbox", { name: /^Cantidad/ }));
    await user.type(screen.getByRole("textbox", { name: /^Cantidad/ }), "2,5");
    await user.type(screen.getByRole("textbox", { name: /^Unidad/ }), "m²");

    await user.click(screen.getByRole("button", { name: "Agregar ítem" }));
    const descripciones = screen.getAllByRole("textbox", { name: /^Descripción/ });
    await user.type(descripciones[1], "Retoque de puerta");

    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() => expect(mocks.crearSolicitud).toHaveBeenCalledTimes(1));

    const payload = mocks.crearSolicitud.mock.calls[0][0];
    expect(payload).toEqual({
      descripcion: "Necesito pintar",
      items: [
        { descripcion: "Pintura de sala", cantidad: 2.5, unidad_medida: "m²", observaciones: null },
        { descripcion: "Retoque de puerta", cantidad: 1, unidad_medida: null, observaciones: null },
      ],
    });
    expect(payload).not.toHaveProperty("cliente_id");

    expect(await screen.findByRole("heading", { name: "Recibimos tu solicitud" })).toBeInTheDocument();
    expect(screen.getByText("02/11/2026 00:39")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver la solicitud" })).toHaveAttribute(
      "href",
      "/portal/solicitudes/12",
    );
  }, 20_000);

  it("muestra los errores del servidor junto al campo", async () => {
    const user = userEvent.setup();
    mocks.crearSolicitud.mockRejectedValue(
      new ApiError("Datos inválidos", 422, { descripcion: ["La descripción es muy larga."] }),
    );

    render(<SolicitarForm />);

    await user.type(screen.getByRole("textbox", { name: /¿Qué necesitas\?/ }), "X");
    await user.type(screen.getByRole("textbox", { name: /^Descripción/ }), "Y");
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    expect(await screen.findByText("La descripción es muy larga.")).toBeInTheDocument();
  }, 20_000);
});
