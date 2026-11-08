import type {
  EstadoOrden,
  Orden,
  OrdenAccion,
  OrdenEvento,
  OrdenItem,
  TipoOrdenEvento,
} from "@/lib/api/types";
import { ordenEstadoMeta } from "@/lib/estados";
import { TIPO_ITEM_LABEL, isValidDateOnly, roundMoney } from "@/lib/proformas";
import { filasParam } from "@/lib/paginacion";
import { buildQuery, formatDateOnly } from "@/lib/utils";

export type { OrdenAccion };

/* -------------------------------------------------------------------------- */
/* Acciones que expone el backend (`acciones_disponibles`)                     */
/* -------------------------------------------------------------------------- */

export const ACCIONES_ORDEN: readonly OrdenAccion[] = [
  "ver",
  "asignar",
  "reprogramar",
  "iniciar",
  "finalizar",
  "cancelar",
  "cerrar",
  "consumir",
  "ver_cobro",
];

/** Se aceptan variantes en inglés o snake_case por si el backend cambia. */
const ALIAS_ACCIONES: Record<string, OrdenAccion> = {
  ver: "ver",
  ver_detalle: "ver",
  detalle: "ver",
  view: "ver",
  show: "ver",
  asignar: "asignar",
  asignar_operario: "asignar",
  assign: "asignar",
  reprogramar: "reprogramar",
  reprogramacion: "reprogramar",
  reschedule: "reprogramar",
  iniciar: "iniciar",
  comenzar: "iniciar",
  start: "iniciar",
  finalizar: "finalizar",
  terminar: "finalizar",
  completar: "finalizar",
  finish: "finalizar",
  complete: "finalizar",
  cancelar: "cancelar",
  anular: "cancelar",
  cancel: "cancelar",
  cerrar: "cerrar",
  close: "cerrar",
  consumir: "consumir",
  consumo: "consumir",
  consumir_materiales: "consumir",
  consume: "consumir",
  ver_cobro: "ver_cobro",
  ver_cuenta: "ver_cobro",
  cuenta_por_cobrar: "ver_cobro",
  cobro: "ver_cobro",
  ver_cxc: "ver_cobro",
  ver_pagos: "ver_cobro",
  view_receivable: "ver_cobro",
};

export function normalizarAccionOrden(value: string): OrdenAccion | null {
  const key = value.trim().toLowerCase().replaceAll(/[\s-]+/g, "_");

  return ALIAS_ACCIONES[key] ?? null;
}

export interface AccionesOrdenOpciones {
  /** Un operario no siempre puede listar operarios para asignar. */
  canAssign?: boolean;
  canCancel?: boolean;
  canClose?: boolean;
  /** Solo el admin cambia la fecha programada. */
  canReschedule?: boolean;
}

/**
 * Convierte `acciones_disponibles` en un set utilizable por la UI.
 *
 * Si el backend no envía el campo (o responde `null`), se usa un fallback
 * derivado del estado. Una lista vacía se respeta: no hay acciones.
 */
export function accionesOrden(
  orden: Pick<Orden, "estado" | "acciones_disponibles"> & {
    cerrada_at?: string | null;
  },
  {
    canAssign = true,
    canCancel = true,
    canClose = true,
    canReschedule = true,
  }: AccionesOrdenOpciones = {},
): Set<OrdenAccion> {
  const permitida = (accion: OrdenAccion): boolean => {
    if (accion === "asignar") return canAssign;
    if (accion === "cancelar") return canCancel;
    if (accion === "cerrar") return canClose && !orden.cerrada_at;
    if (accion === "reprogramar") return canReschedule;

    return true;
  };

  if (Array.isArray(orden.acciones_disponibles)) {
    const acciones = new Set<OrdenAccion>();

    for (const action of orden.acciones_disponibles) {
      const normalized = normalizarAccionOrden(action);

      if (!normalized || !permitida(normalized)) continue;

      acciones.add(normalized);
    }

    return acciones;
  }

  const acciones = new Set<OrdenAccion>(["ver"]);

  switch (orden.estado) {
    case "PENDIENTE":
      if (canAssign) acciones.add("asignar");
      if (canReschedule) acciones.add("reprogramar");
      if (canCancel) acciones.add("cancelar");
      break;
    case "ASIGNADA":
      if (canReschedule) acciones.add("reprogramar");
      acciones.add("iniciar");
      if (canCancel) acciones.add("cancelar");
      break;
    case "EN_PROCESO":
      acciones.add("finalizar");
      if (canCancel) acciones.add("cancelar");
      break;
    case "FINALIZADA":
      if (canClose && !orden.cerrada_at) acciones.add("cerrar");
      break;
    default:
      break;
  }

  return acciones;
}

export function puedeAccionOrden(
  orden: Pick<Orden, "estado" | "acciones_disponibles">,
  accion: OrdenAccion,
  options: AccionesOrdenOpciones = {},
): boolean {
  return accionesOrden(orden, options).has(accion);
}

/* -------------------------------------------------------------------------- */
/* Estado y vencimiento                                                        */
/* -------------------------------------------------------------------------- */

/** La orden recibió el cierre administrativo (`cerrar`). */
export function ordenEstaCerrada(
  orden: Pick<Orden, "cerrada_at">,
): boolean {
  return Boolean(orden.cerrada_at);
}

/**
 * Una orden sigue activa mientras no se cancele ni reciba el cierre
 * administrativo. FINALIZADA todavía cuenta como activa hasta el cierre.
 */
export function ordenEstaActiva(
  orden: Pick<Orden, "estado" | "cerrada_at">,
): boolean {
  return orden.estado !== "CANCELADA" && !ordenEstaCerrada(orden);
}

export function ordenEstadoDescripcion(estado: string): string {
  return ordenEstadoMeta(estado).description;
}

/**
 * Descripción para el encabezado de la orden. Una Finalizada que ya recibió
 * el cierre no dice "falta el cierre administrativo" (Cerrada no es un estado:
 * la orden sigue Finalizada).
 */
export function ordenDescripcion(orden: Pick<Orden, "estado" | "cerrada_at">): string {
  if (orden.estado === "FINALIZADA" && ordenEstaCerrada(orden)) {
    return "Trabajo terminado y cierre administrativo hecho; ya no admite más acciones.";
  }

  return ordenEstadoDescripcion(orden.estado);
}

/* -------------------------------------------------------------------------- */
/* Fechas                                                                      */
/* -------------------------------------------------------------------------- */

export function ordenCreadaEn(
  orden: Pick<Orden, "created_at" | "creado_en">,
): string | null {
  return orden.created_at ?? orden.creado_en ?? null;
}

export function ordenActualizadaEn(
  orden: Pick<Orden, "updated_at" | "actualizado_en">,
): string | null {
  return orden.updated_at ?? orden.actualizado_en ?? null;
}

export function eventoFecha(
  evento: Pick<OrdenEvento, "created_at" | "creado_en">,
): string | null {
  return evento.created_at ?? evento.creado_en ?? null;
}

/** La fecha programada es date-only: se formatea sin desplazar el día. */
export function ordenFechaProgramadaTexto(
  orden: Pick<Orden, "fecha_programada">,
): string {
  return formatDateOnly(orden.fecha_programada);
}

/* -------------------------------------------------------------------------- */
/* Presentación                                                                */
/* -------------------------------------------------------------------------- */

export function ordenClienteNombre(orden: Pick<Orden, "cliente" | "cliente_id">): string {
  return orden.cliente?.nombre_razon ?? `Cliente #${orden.cliente_id}`;
}

export function ordenOperarioNombre(
  orden: Pick<Orden, "operario" | "operario_id">,
): string {
  return orden.operario?.name ?? (orden.operario_id ? `Operario #${orden.operario_id}` : "Sin asignar");
}

export function ordenProformaNumero(
  orden: Pick<Orden, "proforma" | "proforma_id">,
): string {
  return orden.proforma?.numero ?? `Proforma #${orden.proforma_id}`;
}

/**
 * Monto de la cuenta por cobrar que genera el cierre: el back cobra el total
 * de la proforma, en su moneda. Sin proforma cargada no se muestra monto.
 */
export function ordenMontoCierre(
  orden: Pick<Orden, "proforma">,
): { total: number; moneda: string } | null {
  if (!orden.proforma) return null;

  return { total: orden.proforma.total, moneda: orden.proforma.moneda };
}

export function ordenItemsCount(
  orden: Pick<Orden, "items_count" | "items">,
): number {
  return orden.items_count ?? orden.items?.length ?? 0;
}

export function tipoOrdenItemLabel(tipo: string): string {
  return TIPO_ITEM_LABEL[tipo as OrdenItem["tipo"]] ?? tipo;
}

export function ordenItemTitle(item: OrdenItem): string {
  const catalogo =
    item.tipo === "SERVICIO"
      ? item.servicio?.nombre
      : item.tipo === "MATERIAL"
        ? item.producto?.nombre
        : null;

  return item.descripcion?.trim() || catalogo || "Ítem sin descripción";
}

export function ordenItemUnidad(item: OrdenItem): string {
  return (
    item.unidad_medida ??
    item.producto?.unidad_medida ??
    (item.tipo === "SERVICIO" ? "servicio" : "unidad")
  );
}

export function ordenItemTotal(item: OrdenItem): number {
  if (typeof item.total_linea === "number" && Number.isFinite(item.total_linea)) {
    return item.total_linea;
  }

  return roundMoney(item.cantidad * item.precio_unitario);
}

/* -------------------------------------------------------------------------- */
/* Historial                                                                   */
/* -------------------------------------------------------------------------- */

export type OrdenEventoTone = "neutral" | "accent" | "success" | "danger";

export interface OrdenEventoMeta {
  label: string;
  tone: OrdenEventoTone;
  description: string;
}

export const ORDEN_EVENTO_META: Record<TipoOrdenEvento, OrdenEventoMeta> = {
  CREACION: {
    label: "Orden creada",
    tone: "neutral",
    description: "Se generó la orden a partir de una proforma aceptada.",
  },
  ASIGNACION: {
    label: "Operario asignado",
    tone: "accent",
    description: "La orden quedó a cargo de un operario.",
  },
  INICIO: {
    label: "Trabajo iniciado",
    tone: "accent",
    description: "Comenzó la ejecución del servicio.",
  },
  FINALIZACION: {
    label: "Trabajo finalizado",
    tone: "success",
    description: "La ejecución terminó y espera el cierre administrativo.",
  },
  CANCELACION: {
    label: "Orden cancelada",
    tone: "danger",
    description: "La orden se canceló y no debe ejecutarse.",
  },
  CIERRE: {
    label: "Orden cerrada",
    tone: "success",
    description: "Se completó el cierre administrativo de la orden.",
  },
  CONSUMO: {
    label: "Materiales consumidos",
    tone: "accent",
    description: "Se descontaron materiales del inventario para esta orden.",
  },
  REPROGRAMACION: {
    label: "Fecha reprogramada",
    tone: "neutral",
    description: "Se cambió la fecha programada de la orden.",
  },
};

/**
 * Fecha nueva para reprogramar: mensaje de error, o `null` si se puede enviar.
 * El back valida lo mismo; esto evita un viaje con un dato que va a rechazar.
 */
export function validarReprogramacion(
  fechaNueva: string,
  fechaActual: string | null | undefined,
): string | null {
  const fecha = fechaNueva.trim();

  if (!fecha) return "Elige la nueva fecha programada.";
  if (!isValidDateOnly(fecha)) return "Usa una fecha válida (AAAA-MM-DD).";
  if (fechaActual && fecha === fechaActual.slice(0, 10)) {
    return "La fecha nueva es igual a la fecha programada actual.";
  }

  return null;
}

export function parseTipoEventoOrden(value: string): TipoOrdenEvento | null {
  const key = value.trim().toUpperCase().replaceAll(/[\s-]+/g, "_");

  return key in ORDEN_EVENTO_META ? (key as TipoOrdenEvento) : null;
}

export function eventoOrdenMeta(tipo: string): OrdenEventoMeta {
  const parsed = parseTipoEventoOrden(tipo);

  if (parsed) return ORDEN_EVENTO_META[parsed];

  return {
    label: tipo
      ? tipo.charAt(0) + tipo.slice(1).toLowerCase().replaceAll("_", " ")
      : "Evento",
    tone: "neutral",
    description: "Evento sin descripción registrada.",
  };
}

/**
 * Texto "Anterior → Nuevo" para la transición registrada en el evento. Si falta
 * un extremo, se omite en lugar de mostrar "— → —".
 */
export function eventoOrdenTransicion(evento: OrdenEvento): string | null {
  const anterior = evento.estado_anterior
    ? ordenEstadoMeta(evento.estado_anterior).label
    : null;
  const nuevo = evento.estado_nuevo
    ? ordenEstadoMeta(evento.estado_nuevo).label
    : null;

  if (anterior && nuevo) return `${anterior} → ${nuevo}`;
  if (nuevo) return `→ ${nuevo}`;
  if (anterior) return `${anterior} →`;

  return null;
}

/** Agrupa el tablero por estado operativo (sin canceladas). */
export const ORDENES_TABLERO_ESTADOS: readonly EstadoOrden[] = [
  "PENDIENTE",
  "ASIGNADA",
  "EN_PROCESO",
  "FINALIZADA",
];

/* -------------------------------------------------------------------------- */
/* Estado de la URL del listado                                                */
/* -------------------------------------------------------------------------- */

export type VistaOrdenes = "tabla" | "tablero";

export interface OrdenesQuery {
  search: string;
  estado: EstadoOrden | "";
  operarioId: number | "";
  clienteId: number | "";
  vista: VistaOrdenes;
  page: number;
  /** Filas por página (15, 25 o 50); sin dato, 15. */
  perPage?: number;
}

/** Serializa el estado del listado preservando la vista y los filtros. */
export function ordenesQueryToSearch(query: OrdenesQuery): string {
  return buildQuery({
    search: query.search,
    estado: query.estado,
    operario_id: query.operarioId,
    cliente_id: query.clienteId,
    vista: query.vista,
    per_page: filasParam(query.perPage),
    page: query.page > 1 ? query.page : "",
  });
}

export function ordenesHref(query: OrdenesQuery): string {
  return `/ordenes${ordenesQueryToSearch(query)}`;
}

/** Hay filtros activos además de la pestaña de estado. */
export function ordenesFiltrosActivos(query: OrdenesQuery): boolean {
  return Boolean(
    query.search || query.operarioId !== "" || query.clienteId !== "",
  );
}

/** Quita los filtros; conserva la pestaña de estado y la vista. */
export function ordenesSinFiltros(query: OrdenesQuery): OrdenesQuery {
  return {
    search: "",
    estado: query.estado,
    operarioId: "",
    clienteId: "",
    vista: query.vista,
    page: 1,
    perPage: query.perPage,
  };
}

/**
 * Textos del listado vacío. `limpiar` indica si corresponde ofrecer
 * "Limpiar filtros"; sin filtros activos no hay nada que limpiar, y la
 * pestaña se cambia con las pestañas.
 */
export function ordenesVacio(query: OrdenesQuery): {
  title: string;
  description: string;
  limpiar: boolean;
} {
  if (ordenesFiltrosActivos(query)) {
    return {
      title: "Sin coincidencias",
      description: "Ajusta la búsqueda o los filtros para ver más resultados.",
      limpiar: true,
    };
  }

  if (query.estado) {
    return {
      title: "Sin órdenes en este estado",
      description: "Elige otra pestaña para ver las órdenes en otros estados.",
      limpiar: false,
    };
  }

  return {
    title: "Todavía no hay órdenes de servicio",
    description:
      "Crea una orden desde una proforma aceptada para empezar a ejecutar el servicio.",
    limpiar: false,
  };
}

/** Pestañas de estado del listado; "" es "Todas". */
export const ORDENES_PESTANAS: readonly {
  estado: EstadoOrden | "";
  label: string;
}[] = [
  { estado: "", label: "Todas" },
  { estado: "PENDIENTE", label: "Pendientes" },
  { estado: "ASIGNADA", label: "Asignadas" },
  { estado: "EN_PROCESO", label: "En proceso" },
  { estado: "FINALIZADA", label: "Finalizadas" },
  { estado: "CANCELADA", label: "Canceladas" },
];

/**
 * Enlaces de las pestañas: cambian solo el estado, conservan la vista y los
 * demás filtros, y vuelven a la primera página.
 */
export function ordenesPestanas(
  query: OrdenesQuery,
): { key: string; label: string; href: string }[] {
  return ORDENES_PESTANAS.map(({ estado, label }) => ({
    key: estado || "todas",
    label,
    href: ordenesHref({ ...query, estado, page: 1 }),
  }));
}
