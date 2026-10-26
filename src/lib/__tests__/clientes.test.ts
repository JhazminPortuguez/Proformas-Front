import { describe, expect, it } from "vitest";
import type { Cliente, ClienteResumen, HistorialServicio } from "@/lib/api/types";
import {
  clienteCobranzaEstado,
  clienteCobrosHref,
  clienteOrdenesHref,
  clienteProformasHref,
  clienteResumenItems,
  clienteTabHref,
  contar,
  historialServicioOperario,
  historialServicioOrdenNumero,
  historialServicioTitulo,
  parseClienteTab,
} from "@/lib/clientes";
import { formatMoney } from "@/lib/utils";

const CLIENTE: Cliente = {
  id: 5,
  nombre_razon: "Constructora Andina",
  nit_ci: "123456789",
  telefono: "77712345",
  email: "contacto@andina.example",
  direccion: "Av. Blanco Galindo km 5",
  estado: "activo",
  proformas_count: 3,
  ordenes_count: 3,
};

const RESUMEN: ClienteResumen = {
  cliente: CLIENTE,
  proformas: {
    total: 3,
    por_estado: { BORRADOR: 1, ENVIADA: 1, ACEPTADA: 1, RECHAZADA: 0 },
    monto_total: 530,
    monto_aceptado: 530,
  },
  ordenes: {
    total: 3,
    activas: 2,
    pendientes: 1,
    asignadas: 1,
    en_proceso: 0,
    finalizadas: 1,
    canceladas: 0,
  },
  cobros: {
    cuentas: 1,
    saldo: 265,
    vencidas: 0,
    monto_total: 530,
    total_pagado: 265,
  },
  servicios: { realizados: 2, monto: 1050 },
};

function money(value: number): string {
  return formatMoney(value).replace(/\s+/g, " ");
}

const SERVICIO: HistorialServicio = {
  id: 31,
  orden_id: 9,
  orden_numero: "OS-2026-000009",
  orden_estado: "FINALIZADA",
  fecha: "2026-10-20",
  servicio_id: 4,
  servicio_nombre: "Mantenimiento preventivo",
  descripcion: null,
  cantidad: 2,
  total_linea: 700,
  operario_nombre: null,
};

describe("helpers de la ficha del cliente", () => {
  it("arma las seis tarjetas del resumen con sus destinos", () => {
    const items = clienteResumenItems(RESUMEN, 5);

    expect(items.map((item) => item.key)).toEqual([
      "proformas",
      "aceptadas",
      "ordenes",
      "saldo",
      "vencidas",
      "servicios",
    ]);

    expect(items[0]).toMatchObject({
      value: "3",
      href: "/clientes/5?tab=proformas",
    });
    expect(items[0].hint.replace(/\s+/g, " ")).toContain("1 aceptada");
    expect(items[0].hint.replace(/\s+/g, " ")).toContain(money(530));

    expect(items[1]).toMatchObject({
      value: "1",
      href: "/proformas?cliente_id=5&estado=ACEPTADA",
    });
    expect(items[2]).toMatchObject({
      value: "2",
      href: "/clientes/5?tab=ordenes",
    });
    expect(items[3]).toMatchObject({
      href: "/clientes/5?tab=cobros",
    });
    expect(items[3].value.replace(/\s+/g, " ")).toBe(money(265));
    expect(items[4].value).toBe("0");
    expect(items[5]).toMatchObject({
      value: "2",
      href: "/clientes/5?tab=servicios",
    });
    expect(items[5].hint.replace(/\s+/g, " ")).toContain(money(1050));
  });

  it("describe la cobranza según saldo, mora y pagos", () => {
    expect(clienteCobranzaEstado(RESUMEN)).toMatchObject({
      label: "Cobro parcial",
      tone: "accent",
    });

    expect(
      clienteCobranzaEstado({
        ...RESUMEN,
        cobros: { ...RESUMEN.cobros, saldo: 0 },
      }),
    ).toMatchObject({ label: "Cobranza al día", tone: "success" });

    expect(
      clienteCobranzaEstado({
        ...RESUMEN,
        cobros: { ...RESUMEN.cobros, vencidas: 2 },
      }),
    ).toMatchObject({ label: "2 cuentas vencidas", tone: "danger" });

    expect(
      clienteCobranzaEstado({
        ...RESUMEN,
        cobros: {
          cuentas: 0,
          saldo: 0,
          vencidas: 0,
          monto_total: 0,
          total_pagado: 0,
        },
      }),
    ).toMatchObject({ label: "Sin cobros", tone: "neutral" });

    expect(
      clienteCobranzaEstado({
        ...RESUMEN,
        cobros: { ...RESUMEN.cobros, total_pagado: 0 },
      }),
    ).toMatchObject({ label: "Pendiente de cobro", tone: "warning" });
  });

  it("normaliza la pestaña y construye URLs con paginación", () => {
    expect(parseClienteTab("cobros")).toBe("cobros");
    expect(parseClienteTab("otra")).toBe("resumen");
    expect(parseClienteTab(undefined)).toBe("resumen");

    expect(contar(1, "cuenta", "cuentas")).toBe("1 cuenta");
    expect(contar(2, "cuenta", "cuentas")).toBe("2 cuentas");

    expect(clienteTabHref(5, "cobros")).toBe("/clientes/5?tab=cobros");
    expect(clienteTabHref(5, "cobros", 2)).toBe(
      "/clientes/5?tab=cobros&page=2",
    );

    expect(clienteProformasHref(5)).toBe("/proformas?cliente_id=5");
    expect(clienteProformasHref(5, "ACEPTADA")).toBe(
      "/proformas?cliente_id=5&estado=ACEPTADA",
    );
    expect(clienteOrdenesHref(5)).toBe("/ordenes?cliente_id=5");
    expect(clienteCobrosHref(5)).toBe("/cobros?cliente_id=5");
    expect(clienteCobrosHref(5, { vencida: true })).toBe(
      "/cobros?cliente_id=5&vencida=1",
    );
  });

  it("resuelve título y operario del historial con datos incompletos", () => {
    expect(historialServicioTitulo(SERVICIO)).toBe(
      "Mantenimiento preventivo",
    );
    expect(
      historialServicioTitulo({ ...SERVICIO, descripcion: "  Revisión  " }),
    ).toBe("Revisión");
    expect(
      historialServicioTitulo({
        ...SERVICIO,
        descripcion: " ",
        servicio_nombre: "",
      }),
    ).toBe("Servicio #4");

    expect(historialServicioOperario(SERVICIO)).toBe("Sin operario");
    expect(
      historialServicioOperario({ operario_nombre: " Ana Operaria " }),
    ).toBe("Ana Operaria");

    expect(historialServicioOrdenNumero(SERVICIO)).toBe("OS-2026-000009");
    expect(
      historialServicioOrdenNumero({ ...SERVICIO, orden_numero: null }),
    ).toBe("Orden #9");
  });
});
