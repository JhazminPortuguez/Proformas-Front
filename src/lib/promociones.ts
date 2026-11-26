import type {
  AlcancePromocion,
  EstadoPromocion,
  Promocion,
  TipoPromocion,
  TipoProformaItem,
} from "@/lib/api/types";
import { compareDateOnly, isValidDateOnly, roundMoney } from "@/lib/proformas";
import { decimalesDe } from "@/lib/validacion";
import { parseDecimal } from "@/lib/utils";

/**
 * Ronda C, parte 1: promociones. Estos cálculos repiten los del back
 * (`DescuentoPromocion`) para mostrar el descuento en vivo; el servidor manda.
 */

export const TIPO_PROMOCION_LABEL: Record<TipoPromocion, string> = {
  PORCENTAJE: "Porcentaje",
  MONTO_FIJO: "Monto fijo (Bs)",
  DOS_POR_UNO: "2x1 (lleva 2 y paga 1)",
};

export const ALCANCE_PROMOCION_LABEL: Record<AlcancePromocion, string> = {
  SERVICIO: "Un servicio",
  PRODUCTO: "Un producto",
  CUALQUIERA: "Cualquier ítem",
};

export const ESTADO_PROMOCION: Record<
  EstadoPromocion,
  { label: string; tone: "success" | "accent" | "warning" | "neutral" }
> = {
  VIGENTE: { label: "Vigente", tone: "success" },
  PROGRAMADA: { label: "Programada", tone: "accent" },
  VENCIDA: { label: "Vencida", tone: "warning" },
  INACTIVA: { label: "Inactiva", tone: "neutral" },
};

/**
 * Descuento de la promoción sobre una línea, en Bs. Nunca supera el importe
 * de la línea (que queda en Bs 0 como mínimo).
 *
 * - Porcentaje: importe × valor / 100.
 * - Monto fijo: el valor, una vez por línea.
 * - 2x1: de cada 2 unidades se paga 1 (1 → 0 gratis, 3 → 1 gratis).
 */
export function descuentoPromocion(
  tipo: TipoPromocion,
  valor: number | null | undefined,
  cantidad: number,
  precioUnitario: number,
): number {
  const cantidadSegura = Number.isFinite(cantidad) ? Math.max(cantidad, 0) : 0;
  const precio = Number.isFinite(precioUnitario) ? Math.max(precioUnitario, 0) : 0;
  const bruto = roundMoney(cantidadSegura * precio);
  const v = Number.isFinite(valor ?? NaN) ? Math.max(valor ?? 0, 0) : 0;

  let descuento: number;

  switch (tipo) {
    case "PORCENTAJE":
      descuento = roundMoney((bruto * v) / 100);
      break;
    case "MONTO_FIJO":
      descuento = roundMoney(v);
      break;
    case "DOS_POR_UNO":
      descuento = roundMoney(Math.floor(cantidadSegura / 2) * precio);
      break;
  }

  return Math.min(descuento, bruto);
}

/** Si la promoción corresponde a una línea de ese tipo y catálogo. */
export function promocionAplica(
  promocion: Pick<Promocion, "aplica_a" | "servicio_id" | "producto_id">,
  tipo: TipoProformaItem,
  catalogoId: string | number | null | undefined,
): boolean {
  const id = catalogoId === null || catalogoId === undefined || catalogoId === "" ? null : Number(catalogoId);

  switch (promocion.aplica_a) {
    case "CUALQUIERA":
      return true;
    case "SERVICIO":
      return tipo === "SERVICIO" && id !== null && id === promocion.servicio_id;
    case "PRODUCTO":
      return tipo === "MATERIAL" && id !== null && id === promocion.producto_id;
  }
}

/** A qué se aplica, en palabras: "Servicio: Mantenimiento", "Cualquier ítem". */
export function alcanceTexto(
  promocion: Pick<Promocion, "aplica_a" | "servicio" | "producto">,
): string {
  if (promocion.aplica_a === "SERVICIO") {
    return `Servicio: ${promocion.servicio?.nombre ?? "—"}`;
  }

  if (promocion.aplica_a === "PRODUCTO") {
    return `Producto: ${promocion.producto?.nombre ?? "—"}`;
  }

  return "Cualquier ítem";
}

export interface PromocionFormState {
  nombre: string;
  tipo: TipoPromocion;
  valor: string;
  aplica_a: AlcancePromocion;
  servicio_id: string;
  producto_id: string;
  vigente_desde: string;
  vigente_hasta: string;
  activa: boolean;
}

/** Las mismas reglas que el back (`GuardarPromocionRequest`). */
export function validarPromocion(form: PromocionFormState): Record<string, string[]> {
  const errores: Record<string, string[]> = {};

  if (!form.nombre.trim()) {
    errores.nombre = ["Escribe el nombre de la promoción."];
  } else if (form.nombre.trim().length > 120) {
    errores.nombre = ["El nombre admite como máximo 120 caracteres."];
  }

  if (form.tipo !== "DOS_POR_UNO") {
    const valor = parseDecimal(form.valor);
    const porcentaje = form.tipo === "PORCENTAJE";

    if (!form.valor.trim()) {
      errores.valor = [porcentaje ? "Escribe el porcentaje (de 1 a 100)." : "Escribe el monto del descuento en Bs."];
    } else if (!Number.isFinite(valor)) {
      errores.valor = ["El valor debe ser un número."];
    } else if (decimalesDe(form.valor) > 2) {
      errores.valor = ["El valor admite como máximo 2 decimales."];
    } else if (porcentaje && (valor < 1 || valor > 100)) {
      errores.valor = ["El porcentaje debe estar entre 1 y 100."];
    } else if (!porcentaje && valor <= 0) {
      errores.valor = ["El monto debe ser mayor a Bs 0."];
    }
  }

  if (form.aplica_a === "SERVICIO" && !form.servicio_id) {
    errores.servicio_id = ["Elige el servicio de la promoción."];
  }

  if (form.aplica_a === "PRODUCTO" && !form.producto_id) {
    errores.producto_id = ["Elige el producto de la promoción."];
  }

  if (!isValidDateOnly(form.vigente_desde)) {
    errores.vigente_desde = ['Ingresa una fecha "desde" válida.'];
  }

  if (!isValidDateOnly(form.vigente_hasta)) {
    errores.vigente_hasta = ['Ingresa una fecha "hasta" válida.'];
  } else if (
    isValidDateOnly(form.vigente_desde) &&
    compareDateOnly(form.vigente_hasta, form.vigente_desde) < 0
  ) {
    errores.vigente_hasta = ['La fecha "hasta" no puede ser anterior a la fecha "desde".'];
  }

  return errores;
}

/** Texto corto para el mensaje de WhatsApp, o null si no hubo promociones. */
export function textoDescuentoPromociones(descuento: number | null | undefined): string | null {
  return descuento && descuento > 0 ? "con descuento por promoción" : null;
}
