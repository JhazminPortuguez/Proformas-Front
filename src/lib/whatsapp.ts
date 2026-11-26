import { formatDateNumeric, formatMoney } from "@/lib/utils";

/** Código de país de Bolivia para wa.me. */
export const CODIGO_BOLIVIA = "591";

export const MOTIVO_SIN_TELEFONO =
  "El cliente no tiene teléfono registrado. Agrégalo en su ficha para compartir por WhatsApp.";

export const MOTIVO_TELEFONO_INVALIDO =
  "El teléfono del cliente no parece un celular de Bolivia (8 dígitos, por ejemplo 71234567). Corrígelo en su ficha.";

/**
 * Número para wa.me: solo dígitos y con 591 adelante. Acepta "71234567",
 * "+591 712-34567" o "591 71234567". Devuelve null si no queda un número de
 * 8 dígitos de Bolivia.
 */
export function numeroWhatsApp(telefono: string | null | undefined): string | null {
  let digitos = (telefono ?? "").replace(/\D/g, "");

  if (digitos.startsWith("00")) digitos = digitos.slice(2);
  if (digitos.length === 11 && digitos.startsWith(CODIGO_BOLIVIA)) digitos = digitos.slice(3);

  return /^\d{8}$/.test(digitos) ? `${CODIGO_BOLIVIA}${digitos}` : null;
}

export interface DatosWhatsApp {
  telefono: string | null | undefined;
  numero: string;
  total: number;
  moneda?: string | null;
  fechaValidez?: string | null;
  /** Ronda C: lo descontado por promociones (ya incluido en el total). */
  descuentoPromocion?: number | null;
  /** Enlace completo a la proforma en el portal del cliente. */
  enlacePortal: string;
}

export function mensajeWhatsApp({
  numero,
  total,
  moneda,
  fechaValidez,
  descuentoPromocion,
  enlacePortal,
}: DatosWhatsApp): string {
  const validez = fechaValidez ? `, válida hasta el ${formatDateNumeric(fechaValidez)}` : "";
  // Ronda C: si el total tiene promociones, el mensaje lo dice.
  const promocion =
    descuentoPromocion && descuentoPromocion > 0
      ? ` (incluye ${formatMoney(descuentoPromocion, moneda)} de descuento por promoción)`
      : "";

  return [
    `Hola, le compartimos la proforma ${numero} por un total de ${formatMoney(total, moneda)}${promocion}${validez}.`,
    `Puede verla, descargarla y aceptarla en su portal: ${enlacePortal}`,
  ].join("\n");
}

/**
 * Enlace gratuito de "click to chat" (https://wa.me/591…?text=…): abre el
 * WhatsApp del empleado con el mensaje escrito; él lo envía. No usa la API
 * de WhatsApp Business. Si el teléfono no sirve, devuelve el motivo.
 */
export function enlaceWhatsApp(
  datos: DatosWhatsApp,
): { url: string; motivo: null } | { url: null; motivo: string } {
  if (!datos.telefono?.trim()) return { url: null, motivo: MOTIVO_SIN_TELEFONO };

  const numero = numeroWhatsApp(datos.telefono);

  if (!numero) return { url: null, motivo: MOTIVO_TELEFONO_INVALIDO };

  // formatMoney separa "Bs" del monto con un espacio duro: en el mensaje va
  // un espacio normal.
  const texto = mensajeWhatsApp(datos).replaceAll(" ", " ");

  return { url: `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, motivo: null };
}
