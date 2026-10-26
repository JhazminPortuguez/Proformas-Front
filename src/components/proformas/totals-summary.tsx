import type { ReactNode } from "react";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

interface TotalsSummaryProps {
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  impuestoTasa: number;
  /** Muestra "estimado" porque el cálculo definitivo lo hace el servidor. */
  estimated?: boolean;
  className?: string;
  footer?: ReactNode;
}

export function TotalsSummary({
  subtotal,
  descuento,
  impuesto,
  total,
  impuestoTasa,
  estimated = false,
  className,
  footer,
}: TotalsSummaryProps) {
  const base = subtotal - descuento;

  return (
    <section
      aria-label={estimated ? "Totales estimados" : "Totales de la proforma"}
      className={cn(
        "rounded-xl border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Totales</h2>
        {estimated ? (
          <span className="text-[11px] uppercase tracking-wide text-muted">
            Estimado
          </span>
        ) : null}
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">Subtotal</dt>
          <dd className="numeric text-foreground">{formatMoney(subtotal)}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">Descuento</dt>
          <dd className="numeric text-foreground">
            {descuento > 0 ? `− ${formatMoney(descuento)}` : formatMoney(0)}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">Base imponible</dt>
          <dd className="numeric text-foreground">{formatMoney(base)}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">
            Impuesto ({formatNumber(impuestoTasa)}%)
          </dt>
          <dd className="numeric text-foreground">{formatMoney(impuesto)}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
          <dt className="font-medium text-foreground">Total</dt>
          <dd className="numeric text-base font-semibold text-foreground">
            {formatMoney(total)}
          </dd>
        </div>
      </dl>

      {estimated ? (
        <p className="mt-3 text-xs text-muted">
          Estimación local. El servidor recalcula precios de catálogo,
          descuento e impuesto al guardar.
        </p>
      ) : null}

      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
