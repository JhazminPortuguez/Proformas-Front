import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  History,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { InventarioResumen } from "@/lib/api/types";
import { existenciasHref } from "@/lib/inventario";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

interface InventarioResumenCardsProps {
  resumen: InventarioResumen;
}

interface ResumenItem {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "warning" | "accent";
}

/**
 * Resumen compacto en una sola superficie: cuatro celdas, no cuatro tarjetas
 * de dashboard. Las que tienen destino se comportan como enlace completo.
 */
export function InventarioResumenCards({
  resumen,
}: InventarioResumenCardsProps) {
  const items: ResumenItem[] = [
    {
      key: "productos",
      label: "Productos",
      value: formatNumber(resumen.productos),
      hint: "Registrados en inventario",
      icon: Boxes,
      href: existenciasHref({
        search: "",
        bajoStock: false,
        activo: "",
        page: 1,
      }),
    },
    {
      key: "bajo-stock",
      label: "Bajo stock",
      value: formatNumber(resumen.bajo_stock),
      hint:
        resumen.bajo_stock > 0
          ? "Requieren reposición"
          : "Todo por encima del mínimo",
      icon: AlertTriangle,
      href: existenciasHref({
        search: "",
        bajoStock: true,
        activo: "",
        page: 1,
      }),
      tone: resumen.bajo_stock > 0 ? "warning" : "default",
    },
    {
      key: "valor",
      label: "Valor del inventario",
      value: formatMoney(resumen.valor_inventario),
      hint: "Stock actual al costo promedio",
      icon: Wallet,
      tone: "accent",
    },
    {
      key: "movimientos",
      label: "Movimientos del mes",
      value: formatNumber(resumen.movimientos_mes),
      hint: "Entradas, salidas y consumos",
      icon: History,
      href: "/inventario?tab=movimientos",
    },
  ];

  return (
    <section aria-labelledby="inventario-resumen-title" className="mb-5">
      <h2 id="inventario-resumen-title" className="sr-only">
        Resumen de inventario
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
