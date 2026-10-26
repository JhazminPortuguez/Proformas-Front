/**
 * Catálogo único de estados de proforma y orden.
 *
 * Sirve para no repetir etiquetas, tonos ni transiciones legales en las
 * pantallas. Los estados llegan del backend en mayúsculas, pero se aceptan
 * minúsculas y separadores con espacio para tolerar datos heredados.
 */

export type EstadoTone = "neutral" | "accent" | "success" | "warning" | "danger";

export interface EstadoMeta {
  label: string;
  tone: EstadoTone;
  description: string;
}

export type ProformaEstado =
  | "BORRADOR"
  | "ENVIADA"
  | "ACEPTADA"
  | "RECHAZADA"
  | "VENCIDA";

export const PROFORMA_ESTADOS: Record<ProformaEstado, EstadoMeta> = {
  BORRADOR: {
    label: "Borrador",
    tone: "warning",
    description: "Todavía se puede editar; no se envió al cliente.",
  },
  ENVIADA: {
    label: "Enviada",
    tone: "accent",
    description: "Esperando la aceptación o el rechazo del cliente.",
  },
  ACEPTADA: {
    label: "Aceptada",
    tone: "success",
    description: "El cliente la aceptó y puede generar una orden de servicio.",
  },
  RECHAZADA: {
    label: "Rechazada",
    tone: "danger",
    description: "El cliente no aceptó la propuesta.",
  },
  VENCIDA: {
    label: "Vencida",
    tone: "neutral",
    description: "Pasó la fecha de validez sin respuesta.",
  },
};

export type SolicitudEstado = "PENDIENTE" | "CONVERTIDA" | "ANULADA";

export const SOLICITUD_ESTADOS: Record<SolicitudEstado, EstadoMeta> = {
  PENDIENTE: {
    label: "Pendiente",
    tone: "warning",
    description: "Solicitud recibida, todavía sin convertir en proforma.",
  },
  CONVERTIDA: {
    label: "Convertida",
    tone: "success",
    description: "Ya generó una proforma en borrador.",
  },
  ANULADA: {
    label: "Anulada",
    tone: "neutral",
    description: "La solicitud se descartó y no se convertirá.",
  },
};

export type OrdenEstado =
  | "PENDIENTE"
  | "ASIGNADA"
  | "EN_PROCESO"
  | "FINALIZADA"
  | "CANCELADA";

export const ORDEN_ESTADOS: Record<OrdenEstado, EstadoMeta> = {
  PENDIENTE: {
    label: "Pendiente",
    tone: "warning",
    description: "Creada, aún sin operario asignado.",
  },
  ASIGNADA: {
    label: "Asignada",
    tone: "accent",
    description: "Tiene un operario responsable y espera el inicio.",
  },
  EN_PROCESO: {
    label: "En proceso",
    tone: "accent",
    description: "El trabajo está en ejecución.",
  },
  FINALIZADA: {
    label: "Finalizada",
    tone: "success",
    description: "El trabajo terminó; falta el cierre administrativo.",
  },
  CANCELADA: {
    label: "Cancelada",
    tone: "neutral",
    description: "La orden se canceló y no debe ejecutarse.",
  },
};

export const PROFORMA_TRANSICIONES: Record<
  ProformaEstado,
  readonly ProformaEstado[]
> = {
  BORRADOR: ["ENVIADA"],
  ENVIADA: ["ACEPTADA", "RECHAZADA", "VENCIDA"],
  ACEPTADA: [],
  RECHAZADA: [],
  VENCIDA: [],
};

export const ORDEN_TRANSICIONES: Record<OrdenEstado, readonly OrdenEstado[]> = {
  PENDIENTE: ["ASIGNADA", "CANCELADA"],
  ASIGNADA: ["EN_PROCESO", "CANCELADA"],
  EN_PROCESO: ["FINALIZADA", "CANCELADA"],
  FINALIZADA: [],
  CANCELADA: [],
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replaceAll(/[\s-]+/g, "_");
}

function humanize(value: string): string {
  const clean = value.trim().replaceAll(/[_-]+/g, " ").toLowerCase();

  if (!clean) return "Sin estado";

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function parseProformaEstado(value: string): ProformaEstado | null {
  const key = normalizeKey(value);

  return key in PROFORMA_ESTADOS ? (key as ProformaEstado) : null;
}

export function parseOrdenEstado(value: string): OrdenEstado | null {
  const key = normalizeKey(value);

  return key in ORDEN_ESTADOS ? (key as OrdenEstado) : null;
}

export function parseSolicitudEstado(value: string): SolicitudEstado | null {
  const key = normalizeKey(value);

  return key in SOLICITUD_ESTADOS ? (key as SolicitudEstado) : null;
}

/** Metadatos tolerantes a datos desconocidos (nunca rompe una tabla). */
export function proformaEstadoMeta(value: string): EstadoMeta {
  const estado = parseProformaEstado(value);

  if (estado) return PROFORMA_ESTADOS[estado];

  return {
    label: humanize(value),
    tone: "neutral",
    description: "Estado sin descripción registrada.",
  };
}

export function ordenEstadoMeta(value: string): EstadoMeta {
  const estado = parseOrdenEstado(value);

  if (estado) return ORDEN_ESTADOS[estado];

  return {
    label: humanize(value),
    tone: "neutral",
    description: "Estado sin descripción registrada.",
  };
}

export function solicitudEstadoMeta(value: string): EstadoMeta {
  const estado = parseSolicitudEstado(value);

  if (estado) return SOLICITUD_ESTADOS[estado];

  return {
    label: humanize(value),
    tone: "neutral",
    description: "Estado sin descripción registrada.",
  };
}

export function puedeTransicionarProforma(
  desde: ProformaEstado,
  hacia: ProformaEstado,
): boolean {
  return PROFORMA_TRANSICIONES[desde].includes(hacia);
}

export function puedeTransicionarOrden(
  desde: OrdenEstado,
  hacia: OrdenEstado,
): boolean {
  return ORDEN_TRANSICIONES[desde].includes(hacia);
}

export function siguientesProformaEstados(
  desde: ProformaEstado,
): readonly ProformaEstado[] {
  return PROFORMA_TRANSICIONES[desde];
}

export function siguientesOrdenEstados(
  desde: OrdenEstado,
): readonly OrdenEstado[] {
  return ORDEN_TRANSICIONES[desde];
}

export function esProformaTerminal(estado: ProformaEstado): boolean {
  return PROFORMA_TRANSICIONES[estado].length === 0;
}

export function esOrdenTerminal(estado: OrdenEstado): boolean {
  return ORDEN_TRANSICIONES[estado].length === 0;
}
