import type { PromocionLinea } from "@/lib/api/types";
import { formatMoney } from "@/lib/utils";

/**
 * Ronda C: la promoción de una línea (proforma, portal u orden) con el precio
 * antes del descuento y lo descontado. Sale de la copia guardada en la línea.
 */
export function PromocionDeLinea({
  item,
  moneda,
}: {
  item: {
    promocion?: PromocionLinea | null;
    descuento_promocion?: number;
    importe_bruto?: number;
  };
  moneda?: string | null;
}) {
  if (!item.promocion) return null;

  return (
    <p className="text-xs text-success-soft-foreground">
      Promoción: {item.promocion.nombre} ({item.promocion.etiqueta})
      {typeof item.importe_bruto === "number" ? ` · Precio ${formatMoney(item.importe_bruto, moneda)}` : ""}
      {` · Descuento − ${formatMoney(item.descuento_promocion ?? 0, moneda)}`}
    </p>
  );
}
