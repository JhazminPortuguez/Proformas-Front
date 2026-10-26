import type {
  CuentaPorCobrar,
  EstadoCobro,
  MetodoPago,
  PagoCuenta,
} from "@/lib/api/types";
import type { EstadoTone } from "@/lib/estados";
import { roundMoney } from "@/lib/proformas";
import { buildQuery } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Estado de cobro                                                             */
/* -------------------------------------------------------------------------- */

export interface CobroEstadoMeta {
  label: string;
  tone: EstadoTone;
  description: string;
}

export const ESTADO_COBRO_META: Record<EstadoCobro, CobroEstadoMeta> = {
  PENDIENTE: {
    label: "Pendiente",
    tone: "warning",
    description: "Todavía no se registró ningún pago.",
  },
  PARCIAL: {
    label: "Parcial",
    tone: "accent",
    description: "Tiene pagos, pero queda saldo por cobrar.",
  },
  PAGADA: {
    label: "Pagada",
    tone: "success",
    description: "El saldo quedó en cero.",
  },
};

const ESTADO_COBRO_ALIAS: Record<string, EstadoCobro> = {
  pendiente: "PENDIENTE",
  parcial: "PARCIAL",
  pagada: "PAGADA",
  pagado: "PAGADA",
  cancelada: "PAGADA",
  cancelado: "PAGADA",
};

export function parseEstadoCobro(value: string): EstadoCobro | null {
  const key = value.trim().toLowerCase().replaceAll(/[\s-]+/g, "_");

  return ESTADO_COBRO_ALIAS[key] ?? null;
}

function humanize(value: string): string {
  const clean = value.trim().replaceAll(/[_-]+/g, " ").toLowerCase();

  if (!clean) return "Sin estado";

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function estadoCobroMeta(value: string): CobroEstadoMeta {
  const estado = parseEstadoCobro(value);

  if (estado) return ESTADO_COBRO_META[estado];

  return {
    label: humanize(value),
    tone: "neutral",
    description: "Estado sin descripción registrada.",
  };
}

/* -------------------------------------------------------------------------- */
/* Métodos de pago                                                             */
/* -------------------------------------------------------------------------- */

export const METODOS_PAGO: readonly MetodoPago[] = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "QR",
  "TARJETA",
  "OTRO",
];

export const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  QR: "QR",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

const METODO_PAGO_ALIAS: Record<string, MetodoPago> = {
  efectivo: "EFECTIVO",
  cash: "EFECTIVO",
  transferencia: "TRANSFERENCIA",
  transfer: "TRANSFERENCIA",
  deposito: "TRANSFERENCIA",
  qr: "QR",
  tarjeta: "TARJETA",
  card: "TARJETA",
  otro: "OTRO",
  other: "OTRO",
};

export function parseMetodoPago(value: string): MetodoPago | null {
  const key = value.trim().toLowerCase().replaceAll(/[\s-]+/g, "_");

  return METODO_PAGO_ALIAS[key] ?? null;
}

export function metodoPagoLabel(value: string): string {
  const metodo = parseMetodoPago(value);

  return metodo ? METODO_PAGO_LABEL[metodo] : humanize(value);
}

export interface MetodoPagoOption {
  value: MetodoPago;
  label: string;
}

export const METODO_PAGO_OPTIONS: readonly MetodoPagoOption[] = METODOS_PAGO.map(
  (metodo) => ({ value: metodo, label: METODO_PAGO_LABEL[metodo] }),
);

/* -------------------------------------------------------------------------- */
/* Fechas date-only                                                            */
/* -------------------------------------------------------------------------- */

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/;

const HOY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/La_Paz",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Hoy como fecha calendario en la zona del negocio (`YYYY-MM-DD`). */
export function fechaHoyDateOnly(): string {
  return HOY_FORMATTER.format(new Date());
}

function dateOnlyMs(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = DATE_ONLY_PATTERN.exec(value.trim());

  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return date.getTime();
}

/** Diferencia en días calendario entre dos fechas date-only. */
export function diasEntreDateOnly(
  desde: string | null | undefined,
  hasta: string | null | undefined,
): number | null {
  const start = dateOnlyMs(desde);
  const end = dateOnlyMs(hasta);

  if (start === null || end === null) return null;

  return Math.round((end - start) / 86_400_000);
}

/* -------------------------------------------------------------------------- */
/* Montos y avance                                                             */
/* -------------------------------------------------------------------------- */

export function cuentaSaldo(
  cuenta: Pick<CuentaPorCobrar, "saldo" | "monto_total" | "total_pagado">,
): number {
  if (typeof cuenta.saldo === "number" && Number.isFinite(cuenta.saldo)) {
    return cuenta.saldo;
  }

  const pagado =
    typeof cuenta.total_pagado === "number" &&
    Number.isFinite(cuenta.total_pagado)
      ? cuenta.total_pagado
      : 0;

  return roundMoney(Math.max(cuenta.monto_total - pagado, 0));
}

export function cuentaTotalPagado(
  cuenta: Pick<CuentaPorCobrar, "saldo" | "monto_total" | "total_pagado">,
): number {
  if (
    typeof cuenta.total_pagado === "number" &&
    Number.isFinite(cuenta.total_pagado)
  ) {
    return cuenta.total_pagado;
  }

  if (typeof cuenta.saldo === "number" && Number.isFinite(cuenta.saldo)) {
    return roundMoney(Math.max(cuenta.monto_total - cuenta.saldo, 0));
  }

  return 0;
}

export function cuentaPagosCount(
  cuenta: Pick<CuentaPorCobrar, "pagos_count" | "pagos">,
): number {
  if (
    typeof cuenta.pagos_count === "number" &&
    Number.isFinite(cuenta.pagos_count)
  ) {
    return cuenta.pagos_count;
  }

  return cuenta.pagos?.filter((pago) => !pago.anulado).length ?? 0;
}

/** Porcentaje pagado del total (0–100), para la barra de avance. */
export function cuentaProgreso(
  cuenta: Pick<CuentaPorCobrar, "saldo" | "monto_total" | "total_pagado">,
): number {
  if (!Number.isFinite(cuenta.monto_total) || cuenta.monto_total <= 0) return 0;

  const ratio = (cuentaTotalPagado(cuenta) / cuenta.monto_total) * 100;

  return Math.min(100, Math.max(0, Math.round(ratio)));
}

/* -------------------------------------------------------------------------- */
/* Vencimiento y antigüedad                                                    */
/* -------------------------------------------------------------------------- */

/**
 * El backend manda `vencida`; si faltara, se calcula contra la fecha de
 * vencimiento. Una cuenta sin saldo nunca está vencida.
 */
export function cuentaEstaVencida(
  cuenta: Pick<
    CuentaPorCobrar,
    "vencida" | "saldo" | "monto_total" | "total_pagado" | "fecha_vencimiento"
  >,
  hoy: string = fechaHoyDateOnly(),
): boolean {
  if (cuentaSaldo(cuenta) <= 0) return false;

  if (typeof cuenta.vencida === "boolean") return cuenta.vencida;

  const dias = diasEntreDateOnly(cuenta.fecha_vencimiento, hoy);

  return dias !== null && dias > 0;
}

export function cuentaDiasVencida(
  cuenta: Pick<
    CuentaPorCobrar,
    | "vencida"
    | "dias_vencida"
    | "saldo"
    | "monto_total"
    | "total_pagado"
    | "fecha_vencimiento"
  >,
  hoy: string = fechaHoyDateOnly(),
): number {
  if (
    typeof cuenta.dias_vencida === "number" &&
    Number.isFinite(cuenta.dias_vencida) &&
    cuenta.dias_vencida > 0
  ) {
    return Math.trunc(cuenta.dias_vencida);
  }

  if (!cuentaEstaVencida(cuenta, hoy)) return 0;

  const dias = diasEntreDateOnly(cuenta.fecha_vencimiento, hoy);

  return dias !== null && dias > 0 ? dias : 0;
}

export type AgingBucket = "corriente" | "1_30" | "31_60" | "61_90" | "90_mas";

export interface AgingMeta {
  bucket: AgingBucket;
  label: string;
  tone: EstadoTone;
  description: string;
}

const AGING_META: Record<AgingBucket, AgingMeta> = {
  corriente: {
    bucket: "corriente",
    label: "Corriente",
    tone: "success",
    description: "Todavía no venció o no tiene saldo pendiente.",
  },
  "1_30": {
    bucket: "1_30",
    label: "1 a 30 días",
    tone: "warning",
    description: "Vencimiento reciente: conviene el recordatorio.",
  },
  "31_60": {
    bucket: "31_60",
    label: "31 a 60 días",
    tone: "warning",
    description: "Mora en curso: requiere seguimiento activo.",
  },
  "61_90": {
    bucket: "61_90",
    label: "61 a 90 días",
    tone: "danger",
    description: "Mora alta: escala el cobro.",
  },
  "90_mas": {
    bucket: "90_mas",
    label: "Más de 90 días",
    tone: "danger",
    description: "Mora crítica: evalúa acciones legales o castigo.",
  },
};

/** Banda de antigüedad de saldo (aging) de la cuenta. */
export function cuentaAging(
  cuenta: Pick<
    CuentaPorCobrar,
    | "vencida"
    | "dias_vencida"
    | "saldo"
    | "monto_total"
    | "total_pagado"
    | "fecha_vencimiento"
  >,
  hoy: string = fechaHoyDateOnly(),
): AgingMeta {
  const dias = cuentaDiasVencida(cuenta, hoy);

  if (dias <= 0) return AGING_META.corriente;
  if (dias <= 30) return AGING_META["1_30"];
  if (dias <= 60) return AGING_META["31_60"];
  if (dias <= 90) return AGING_META["61_90"];

  return AGING_META["90_mas"];
}

/* -------------------------------------------------------------------------- */
/* Pagos                                                                       */
/* -------------------------------------------------------------------------- */

export function pagoVigente(pago: Pick<PagoCuenta, "anulado">): boolean {
  return !pago.anulado;
}

export function pagosVigentes(pagos: readonly PagoCuenta[] | undefined): PagoCuenta[] {
  return (pagos ?? []).filter(pagoVigente);
}

export function montoPagadoVigente(
  pagos: readonly PagoCuenta[] | undefined,
): number {
  return roundMoney(
    pagosVigentes(pagos).reduce((total, pago) => total + pago.monto, 0),
  );
}

export function pagosAnuladosCount(
  pagos: readonly PagoCuenta[] | undefined,
): number {
  return (pagos ?? []).filter((pago) => pago.anulado).length;
}

/**
 * `acciones_disponibles` del backend manda; `canAnular` (permiso de UI) puede
 * ocultar la anulación a un operario aunque el back la liste.
 */
export function puedeAnularPago(
  pago: Pick<PagoCuenta, "anulado" | "puede_anular">,
  canAnular = true,
): boolean {
  if (pago.anulado) return false;
  if (!canAnular) return false;
  if (typeof pago.puede_anular === "boolean") return pago.puede_anular;

  return true;
}

/* -------------------------------------------------------------------------- */
/* Acciones de la cuenta                                                       */
/* -------------------------------------------------------------------------- */

export type AccionCuenta = "ver" | "pagar" | "anular";

const ACCION_CUENTA_ALIAS: Record<string, AccionCuenta> = {
  ver: "ver",
  ver_detalle: "ver",
  detalle: "ver",
  view: "ver",
  show: "ver",
  pagar: "pagar",
  registrar_pago: "pagar",
  registrar_pago_cuenta: "pagar",
  pay: "pagar",
  anular: "anular",
  anular_pago: "anular",
  annul: "anular",
  void: "anular",
};

export function normalizarAccionCuenta(value: string): AccionCuenta | null {
  const key = value.trim().toLowerCase().replaceAll(/[\s-]+/g, "_");

  return ACCION_CUENTA_ALIAS[key] ?? null;
}

export interface AccionesCuentaOpciones {
  /** Permiso de UI para registrar pagos (`pagos.registrar`). */
  canPay?: boolean;
}

export function accionesCuenta(
  cuenta: Pick<
    CuentaPorCobrar,
    "estado_cobro" | "saldo" | "monto_total" | "total_pagado" | "acciones_disponibles"
  >,
  { canPay = true }: AccionesCuentaOpciones = {},
): Set<AccionCuenta> {
  const saldo = cuentaSaldo(cuenta);
  const pagable = canPay && saldo > 0;

  if (Array.isArray(cuenta.acciones_disponibles)) {
    const acciones = new Set<AccionCuenta>();

    for (const action of cuenta.acciones_disponibles) {
      const normalized = normalizarAccionCuenta(action);

      if (!normalized) continue;
      if (normalized === "pagar" && !pagable) continue;

      acciones.add(normalized);
    }

    return acciones;
  }

  const acciones = new Set<AccionCuenta>(["ver"]);

  if (pagable && cuenta.estado_cobro !== "PAGADA") acciones.add("pagar");

  return acciones;
}

export function puedeRegistrarPago(
  cuenta: Pick<
    CuentaPorCobrar,
    "estado_cobro" | "saldo" | "monto_total" | "total_pagado" | "acciones_disponibles"
  >,
  canPay = true,
): boolean {
  return accionesCuenta(cuenta, { canPay }).has("pagar");
}

/* -------------------------------------------------------------------------- */
/* Presentación                                                                */
/* -------------------------------------------------------------------------- */

export function cuentaClienteNombre(
  cuenta: Pick<CuentaPorCobrar, "cliente" | "cliente_id">,
): string {
  return cuenta.cliente?.nombre_razon ?? `Cliente #${cuenta.cliente_id}`;
}

export function cuentaOrdenNumero(
  cuenta: Pick<CuentaPorCobrar, "orden" | "orden_id">,
): string {
  return cuenta.orden?.numero ?? `Orden #${cuenta.orden_id}`;
}

export function cuentaOrdenHref(
  cuenta: Pick<CuentaPorCobrar, "orden" | "orden_id">,
): string {
  return `/ordenes/${cuenta.orden?.id ?? cuenta.orden_id}`;
}

/* -------------------------------------------------------------------------- */
/* Estado de la URL                                                            */
/* -------------------------------------------------------------------------- */

export interface CobrosQuery {
  search: string;
  estado: EstadoCobro | "";
  vencida: boolean;
  clienteId: number | "";
  /** Rango de vencimiento (date-only). */
  desde: string;
  hasta: string;
  page: number;
}

export const COBROS_QUERY_VACIA: CobrosQuery = {
  search: "",
  estado: "",
  vencida: false,
  clienteId: "",
  desde: "",
  hasta: "",
  page: 1,
};

export function cobrosQueryToSearch(query: CobrosQuery): string {
  return buildQuery({
    search: query.search.trim(),
    estado_cobro: query.estado,
    vencida: query.vencida ? 1 : "",
    cliente_id: query.clienteId,
    desde: query.desde,
    hasta: query.hasta,
    page: query.page > 1 ? query.page : "",
  });
}

export function cobrosHref(query: CobrosQuery): string {
  return `/cobros${cobrosQueryToSearch(query)}`;
}

export function cobroDetalleHref(id: number): string {
  return `/cobros/${id}`;
}

/** Enlace al listado filtrado por vencidas, usado por el banner. */
export function cobrosVencidasHref(): string {
  return cobrosHref({ ...COBROS_QUERY_VACIA, vencida: true });
}
