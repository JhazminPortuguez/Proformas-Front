import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { DashboardData, User } from "@/lib/api/types";
import { movimientosDeProductoHref } from "@/lib/inventario";

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

const USER: User = {
  id: 1,
  name: "Pepito Tilcayo",
  email: "pepitotilcayo@example.com",
  rol: "admin",
  activo: true,
  cliente_id: null,
  empresa_id: null,
};

const DATA: DashboardData = {
  clientes: 4,
  servicios: 4,
  proformas: 3,
  proformas_por_estado: {
    BORRADOR: 1,
    ENVIADA: 1,
    ACEPTADA: 1,
    RECHAZADA: 0,
  },
  monto_proformas_mes: 0,
  monto_cotizado_mes: 0,
  monto_aceptado_mes: 0,
  ordenes_pendientes: 2,
  saldo_por_cobrar: 265,
  ordenes: {
    total: 3,
    activas: 2,
    pendientes: 1,
    asignadas: 1,
    en_proceso: 0,
    finalizadas: 1,
    canceladas: 1,
    por_estado: {
      PENDIENTE: 1,
      ASIGNADA: 1,
      EN_PROCESO: 0,
      FINALIZADA: 1,
      CANCELADA: 1,
    },
  },
  inventario: {
    productos: 6,
    stock_bajo: 1,
    valor_inventario: 8470,
    movimientos_mes: 7,
    productos_bajo_stock: [
      {
        id: 10,
        nombre: "Ventilador de reemplazo",
        stock_actual: 7,
        stock_minimo: 10,
        unidad_medida: "unidad",
      },
    ],
  },
  cobros: {
    cuentas: 1,
    pendientes: 1,
    vencidas: 0,
    saldo: 265,
    monto_vencido: 0,
    cobrado_mes: 265,
    monto_total: 530,
    aging: {
      al_dia: 265,
      d1_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90_plus: 0,
    },
  },
  ingresos_mes: 265,
  servicios_mas_solicitados: [
    {
      servicio_id: 1,
      nombre: "Instalación básica",
      cantidad: 3,
      total: 1050,
    },
  ],
  actividad_reciente: [
    {
      id: 10,
      tipo: "pago",
      descripcion: "Pago CXC-2026-000001",
      estado: null,
      monto: 265,
      cuenta_id: 1,
      fecha: "2026-10-24T15:00:00.000000Z",
      usuario: "Pepito Tilcayo",
    },
    {
      id: 4,
      tipo: "orden",
      descripcion: "OS-2026-000003",
      estado: "FINALIZADA",
      monto: null,
      fecha: "2026-10-24T14:00:00.000000Z",
      usuario: "Pepito Tilcayo",
    },
    {
      id: 3,
      tipo: "proforma",
      descripcion: "PR-2026-000003",
      estado: "ACEPTADA",
      monto: 530,
      fecha: "2026-10-24T12:00:00.000000Z",
      usuario: "Pepito Tilcayo",
    },
  ],
};

const VACIO: DashboardData = {
  clientes: 0,
  servicios: 0,
  proformas: 0,
  proformas_por_estado: {},
  monto_proformas_mes: 0,
  monto_cotizado_mes: 0,
  monto_aceptado_mes: 0,
  ordenes_pendientes: null,
  saldo_por_cobrar: null,
  actividad_reciente: [],
};

describe("DashboardView", () => {
  it("saluda al usuario y expone los seis KPIs con sus destinos", () => {
    render(<DashboardView user={USER} data={DATA} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Hola, Pepito" }),
    ).toBeInTheDocument();

    const pulso = screen.getByRole("region", { name: "Pulso del mes" });

    expect(
      within(pulso).getByRole("link", { name: /Clientes/ }),
    ).toHaveAttribute("href", "/clientes");
    expect(
      within(pulso).getByRole("link", { name: /Órdenes activas/ }),
    ).toHaveAttribute("href", "/ordenes");
    expect(
      within(pulso).getByRole("link", { name: /Saldo por cobrar/ }),
    ).toHaveAttribute("href", "/cobros");
    expect(
      within(pulso).getByRole("link", { name: /Stock bajo/ }),
    ).toHaveAttribute("href", "/inventario?tab=existencias&bajo_stock=1");
    expect(
      within(pulso).getByRole("link", { name: /Cotizado del mes/ }),
    ).toHaveAttribute("href", "/proformas");
  });

  it("enlaza el pipeline al listado filtrado por estado", () => {
    render(<DashboardView user={USER} data={DATA} />);

    const pipeline = screen.getByRole("region", { name: "Pipeline" });

    expect(
      within(pipeline).getByRole("link", { name: /Borrador/ }),
    ).toHaveAttribute("href", "/proformas?estado=BORRADOR");
    expect(
      within(pipeline).getByRole("link", { name: /Enviada/ }),
    ).toHaveAttribute("href", "/proformas?estado=ENVIADA");
    expect(
      within(pipeline).getByRole("link", { name: /Finalizada/ }),
    ).toHaveAttribute("href", "/ordenes?estado=FINALIZADA");
  });

  it("publica la antigüedad de la cartera como barras accesibles", () => {
    render(<DashboardView user={USER} data={DATA} />);

    const cobranza = screen.getByRole("region", { name: "Cobranza" });

    expect(
      within(cobranza).getByRole("progressbar", { name: /Al día/ }),
    ).toHaveAttribute("aria-valuenow", "100");
    expect(
      within(cobranza).getByRole("progressbar", { name: /1 a 30 días/ }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(
      within(cobranza).getByRole("progressbar", {
        name: /Cobrado del mes/,
      }),
    ).toHaveAttribute("aria-valuenow", "50");
    expect(within(cobranza).getByText("Vencido")).toBeInTheDocument();
  });

  it("muestra el stock bajo y enlaza a los movimientos del producto", () => {
    render(<DashboardView user={USER} data={DATA} />);

    const inventario = screen.getByRole("region", { name: "Inventario" });

    expect(
      within(inventario).getByText("Ventilador de reemplazo"),
    ).toBeInTheDocument();
    expect(
      within(inventario).getByRole("link", { name: /Ventilador de reemplazo/ }),
    ).toHaveAttribute("href", movimientosDeProductoHref(10));
    expect(
      within(inventario).getByRole("link", { name: /bajo stock/i }),
    ).toHaveAttribute("href", "/inventario?tab=existencias&bajo_stock=1");
  });

  it("describe la actividad con enlaces válidos por tipo", () => {
    render(<DashboardView user={USER} data={DATA} />);

    const actividad = screen.getByRole("region", {
      name: "Actividad reciente",
    });

    expect(
      within(actividad).getByRole("link", { name: /Pago CXC/ }),
    ).toHaveAttribute("href", "/cobros/1");
    expect(
      within(actividad).getByRole("link", { name: /OS-2026-000003/ }),
    ).toHaveAttribute("href", "/ordenes/4");
    expect(
      within(actividad).getByRole("link", { name: /PR-2026-000003/ }),
    ).toHaveAttribute("href", "/proformas/3");
    expect(within(actividad).getByText("Aceptada")).toBeInTheDocument();
  });

  it("ofrece los accesos contextuales del encabezado", () => {
    render(<DashboardView user={USER} data={DATA} />);

    expect(
      screen.getByRole("link", { name: "Nueva proforma" }),
    ).toHaveAttribute("href", "/proformas/nueva");
    expect(screen.getByRole("link", { name: "Órdenes" })).toHaveAttribute(
      "href",
      "/ordenes",
    );
    expect(
      screen.getByRole("link", { name: "Registrar pago" }),
    ).toHaveAttribute("href", "/cobros");
  });

  it("renderiza estados vacíos sin módulos próximos ni integraciones", () => {
    const { container } = render(<DashboardView user={USER} data={VACIO} />);

    expect(
      screen.getByText("Todavía no hay proformas registradas."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Todavía no hay órdenes de servicio registradas."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sin desglose de antigüedad disponible para esta cartera."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sin datos de inventario en este momento."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Todavía no hay servicios cotizados este mes."),
    ).toBeInTheDocument();
    expect(screen.getByText("Sin actividad reciente")).toBeInTheDocument();

    expect(screen.queryByText(/módulos próximos/i)).toBeNull();
    expect(screen.queryByText(/pendientes de integración/i)).toBeNull();
    expect(container.querySelector('a[href="/reportes"]')).toBeNull();
  });
});
