import Link from "next/link";
import {
  ArrowUpRight,
  CircleDollarSign,
  Clock,
  HandCoins,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import type { CxCResumen } from "@/lib/api/types";
import { COBROS_QUERY_VACIA, cobrosHref, cobrosVencidasHref } from "@/lib/cobros";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

interface CobrosResumenProps {
  resumen: CxCResumen;
}

interface ResumenItem {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "warning" | "success" | "accent";
}

/**
 * Resumen del módulo en una sola superficie: saldo, mora, cobro del mes y
 * cartera total. Las celdas con destino son enlaces completos al filtro.
 */
export function CobrosResumen({ resumen }: CobrosResumenProps) {
  const items: ResumenItem[] = [
    {
      key: "saldo",
      label: "Saldo por cobrar",
      value: formatMoney(resumen.saldo),
      hint: `${formatNumber(resumen.pendientes)} ${
        resumen.pendientes === 1 ? "cuenta pendiente" : "cuentas pendientes"
      }`,
      icon: HandCoins,
      href: cobrosHref({ ...COBROS_QUERY_VACIA }),
      tone: "accent",
    },
    {
      key: "vencidas",
      label: "Vencidas",
      value: formatNumber(resumen.vencidas),
      hint:
        resumen.vencidas > 0
          ? "Requieren seguimiento de cobro"
          : "Ninguna cuenta en mora",
      icon: Clock,
      href: cobrosVencidasHref(),
      tone: resumen.vencidas > 0 ? "warning" : "default",
    },
    {
      key: "cobrado",
      label: "Cobrado del mes",
      value: formatMoney(resumen.cobrado_mes),
      hint: "Pagos vigentes registrados este mes",
      icon: CircleDollarSign,
      tone: "success",
    },
    {
      key: "cuentas",
      label: "Cuentas",
      value: formatNumber(resumen.cuentas),
      hint: `Emitido ${formatMoney(resumen.monto_total)}`,
      icon: Receipt,
      href: cobrosHref({ ...COBROS_QUERY_VACIA }),
    },
  ];

  return (
    <section aria-labelledby="cobros-resumen-title" className="mb-5">
      <h2 id="cobros-resumen-title" className="sr-only">
        Resumen de cuentas por cobrar
      </h2>

      <ul className="grid overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {item.label}
                </p>
                <span
                  aria-hidden
                  className={cn(
                    "grid size-7 place-items-center rounded-lg",
                    item.tone === "warning"
                      ? "bg-warning-soft text-warning-soft-foreground"
                      : item.tone === "success"
                        ? "bg-success-soft text-success-soft-foreground"
                        : item.tone === "accent"
                          ? "bg-accent-soft text-accent-soft-foreground"
                          : "bg-surface-secondary text-muted",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
              </div>

              <p className="numeric mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {item.value}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                {item.hint}
                {item.href ? (
                  <ArrowUpRight aria-hidden className="size-3" />
                ) : null}
              </p>
            </>
          );

          return (
            <li
              key={item.key}
              className={cn(
                "border-border p-4",
                index > 0 && "border-t sm:border-t-0 sm:border-s",
                index === 2 && "sm:border-t lg:border-t-0",
              )}
            >
              {item.href ? (
                <Link
                  href={item.href}
                  className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
