import type {
  ClienteResumen,
  EstadoProforma,
  HistorialServicio,
} from "@/lib/api/types";
import type { EstadoTone } from "@/lib/estados";
import { buildQuery, formatMoney, formatNumber } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Tabs de la ficha                                                            */
/* -------------------------------------------------------------------------- */

export const CLIENTE_TABS = [
  "resumen",
  "proformas",
  "ordenes",
  "cobros",
  "servicios",
] as const;

export type ClienteTab = (typeof CLIENTE_TABS)[number];

export function parseClienteTab(value: string | null | undefined): ClienteTab {
  return CLIENTE_TABS.includes(value as ClienteTab)
    ? (value as ClienteTab)
    : "resumen";
}

/** URL de una pestaña, preservando la página sólo dentro de la misma tab. */
export function clienteTabHref(
  clienteId: number,
  tab: ClienteTab,
  page = 1,
): string {
  return `/clientes/${clienteId}${buildQuery({
    tab,
    page: page > 1 ? page : "",
  })}`;
}

/** Listado global de proformas filtrado por cliente. */
export function clienteProformasHref(
  clienteId: number,
  estado?: EstadoProforma | "",
): string {
  return `/proformas${buildQuery({ cliente_id: clienteId, estado })}`;
}

/** Listado global de órdenes filtrado por cliente. */
export function clienteOrdenesHref(clienteId: number): string {
  return `/ordenes${buildQuery({ cliente_id: clienteId })}`;
}

/** Cartera del cliente; con `vencida` muestra sólo las cuentas en mora. */
export function clienteCobrosHref(
  clienteId: number,
  { vencida = false }: { vencida?: boolean } = {},
): string {
  return `/cobros${buildQuery({
    cliente_id: clienteId,
    vencida: vencida ? 1 : "",
  })}`;
}

/* -------------------------------------------------------------------------- */
/* Resumen                                                                     */
/* -------------------------------------------------------------------------- */

export type ClienteResumenTone = "default" | "accent" | "success" | "warning";

export interface ClienteResumenItem {
  key: string;
  label: string;
  value: string;
  hint: string;
  href: string;
  tone: ClienteResumenTone;
}

function aceptadas(resumen: ClienteResumen): number {
  return resumen.proformas.por_estado?.ACEPTADA ?? 0;
}

/** Conteo con concordancia: "1 proforma" / "3 proformas". */
export function contar(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/**
 * Seis celdas compactas para la ficha. Los totales son hechos del backend; acá
 * sólo se decide cómo se leen y a qué pestaña o listado llevan.
 */
export function clienteResumenItems(
  resumen: ClienteResumen,
  clienteId: number,
): ClienteResumenItem[] {
  const { proformas, ordenes, cobros, servicios } = resumen;

  return [
    {
      key: "proformas",
      label: "Proformas",
      value: formatNumber(proformas.total),
      hint: `${contar(aceptadas(resumen), "aceptada", "aceptadas")} · ${formatMoney(
        proformas.monto_total,
      )} cotizado`,
      href: clienteTabHref(clienteId, "proformas"),
      tone: "default",
    },
    {
      key: "aceptadas",
      label: "Aceptadas",
      value: formatNumber(aceptadas(resumen)),
      hint: `${formatMoney(proformas.monto_aceptado)} en propuestas aceptadas`,
      href: clienteProformasHref(clienteId, "ACEPTADA"),
      tone: "success",
    },
    {
      key: "ordenes",
      label: "Órdenes activas",
      value: formatNumber(ordenes.activas),
      hint: `${contar(ordenes.pendientes, "pendiente", "pendientes")} · ${contar(
        ordenes.en_proceso,
        "en proceso",
        "en proceso",
      )}`,
      href: clienteTabHref(clienteId, "ordenes"),
      tone: "accent",
    },
    {
      key: "saldo",
      label: "Saldo por cobrar",
      value: formatMoney(cobros.saldo),
      hint: `${contar(cobros.cuentas, "cuenta", "cuentas")} · ${formatMoney(
        cobros.total_pagado,
      )} pagado`,
      href: clienteTabHref(clienteId, "cobros"),
      tone: cobros.saldo > 0 ? "accent" : "default",
    },
    {
      key: "vencidas",
      label: "Vencidas",
      value: formatNumber(cobros.vencidas),
      hint:
        cobros.vencidas > 0
          ? "Requieren seguimiento de cobro"
          : "Ninguna cuenta en mora",
      href: clienteTabHref(clienteId, "cobros"),
      tone: cobros.vencidas > 0 ? "warning" : "default",
    },
    {
      key: "servicios",
      label: "Servicios realizados",
      value: formatNumber(servicios.realizados),
      hint: `${formatMoney(servicios.monto)} facturado`,
      href: clienteTabHref(clienteId, "servicios"),
      tone: "default",
    },
  ];
}

export interface ClienteCobranzaEstado {
  label: string;
  tone: EstadoTone;
  description: string;
}

/** Lectura única del estado de la cartera del cliente para la ficha. */
export function clienteCobranzaEstado(
  resumen: ClienteResumen,
): ClienteCobranzaEstado {
  const { cobros } = resumen;

  if (cobros.cuentas === 0) {
    return {
      label: "Sin cobros",
      tone: "neutral",
      description:
        "Todavía no se generaron cuentas por cobrar para este cliente.",
    };
  }

  if (cobros.saldo <= 0) {
    return {
      label: "Cobranza al día",
      tone: "success",
      description:
        cobros.cuentas === 1
          ? "La única cuenta está pagada o sin saldo pendiente."
          : `Las ${formatNumber(
              cobros.cuentas,
            )} cuentas están pagadas o sin saldo pendiente.`,
    };
  }

  if (cobros.vencidas > 0) {
    return {
      label:
        cobros.vencidas === 1
          ? "1 cuenta vencida"
          : `${formatNumber(cobros.vencidas)} cuentas vencidas`,
      tone: "danger",
      description: `${formatMoney(
        cobros.saldo,
      )} de saldo pendiente con mora. Prioriza el seguimiento de esas cuentas.`,
    };
  }

  if (cobros.total_pagado > 0) {
    return {
      label: "Cobro parcial",
      tone: "accent",
      description: `Se cobraron ${formatMoney(
        cobros.total_pagado,
      )} de ${formatMoney(cobros.monto_total)} emitidos.`,
    };
  }

  return {
    label: "Pendiente de cobro",
    tone: "warning",
    description: `${formatMoney(
      cobros.saldo,
    )} de saldo sin pagos registrados y sin mora.`,
  };
}

/* -------------------------------------------------------------------------- */
/* Historial de servicios                                                      */
/* -------------------------------------------------------------------------- */

export function historialServicioTitulo(
  item: Pick<
    HistorialServicio,
    "descripcion" | "servicio_nombre" | "servicio_id"
  >,
): string {
  return (
    item.descripcion?.trim() ||
    item.servicio_nombre?.trim() ||
    `Servicio #${item.servicio_id}`
  );
}

export function historialServicioOrdenNumero(
  item: Pick<HistorialServicio, "orden_numero" | "orden_id">,
): string {
  return item.orden_numero?.trim() || `Orden #${item.orden_id}`;
}

export function historialServicioOperario(
  item: Pick<HistorialServicio, "operario_nombre">,
): string {
  return item.operario_nombre?.trim() || "Sin operario";
}
