import Link from "next/link";
import { ArrowUpRight, Boxes, Clock, Wallet } from "lucide-react";
import { Card, Chip } from "@heroui/react";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DASHBOARD_BAJO_STOCK_HREF,
  DASHBOARD_MOVIMIENTOS_HREF,
} from "@/lib/dashboard";
import { movimientosDeProductoHref } from "@/lib/inventario";
import type { DashboardData } from "@/lib/api/types";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import {
  FOCUS_RING,
  PanelEmpty,
  QuietLink,
  SectionIntro,
} from "@/components/dashboard/dashboard-ui";

export function InventarioSection({ data }: { data: DashboardData }) {
  const inventario = data.inventario;
  const productos = inventario?.productos_bajo_stock ?? [];
  const stockBajo = Math.max(inventario?.stock_bajo ?? 0, productos.length);

  return (
    <section aria-labelledby="inventario-title" className="space-y-3">
      <SectionIntro
        id="inventario-title"
        title="Inventario"
        description="Reposición pendiente, valor del stock y movimientos del mes."
        action={<QuietLink href="/inventario">Ver inventario</QuietLink>}
      />

      <Card>
        <Card.Header className="flex-row flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Card.Title>Stock y reposición</Card.Title>
            <Card.Description>
              Productos por debajo del mínimo configurado.
            </Card.Description>
          </div>

          {inventario ? (
            <Chip
              size="sm"
              variant="soft"
              color={stockBajo > 0 ? "warning" : "success"}
            >
              <Chip.Label>
                {stockBajo > 0
                  ? `${formatNumber(stockBajo)} por reponer`
                  : "Sin alertas"}
              </Chip.Label>
            </Chip>
          ) : null}
        </Card.Header>

        <Card.Content className="mt-2">
          {!inventario ? (
            <PanelEmpty>Sin datos de inventario en este momento.</PanelEmpty>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Productos bajo el mínimo
                  </h3>
                  <span className="numeric text-xs text-muted">
                    {formatNumber(stockBajo)} de{" "}
                    {formatNumber(inventario.productos)}
                  </span>
                </div>

                {productos.length > 0 ? (
                  <ul className="mt-2 divide-y divide-separator">
                    {productos.map((producto) => {
                      const agotado = producto.stock_actual <= 0;

                      return (
                        <li key={producto.id}>
                          <Link
                            href={movimientosDeProductoHref(producto.id)}
                            className={cn(
                              "group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-surface-secondary",
                              FOCUS_RING,
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {producto.nombre}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted">
                                Stock {formatNumber(producto.stock_actual)} de{" "}
                                {formatNumber(producto.stock_minimo)}{" "}
                                {producto.unidad_medida}
                              </span>
                            </span>

                            <span className="flex shrink-0 items-center gap-2">
                              <StatusChip tone={agotado ? "danger" : "warning"}>
                                {agotado ? "Sin stock" : "Stock bajo"}
                              </StatusChip>
                              <ArrowUpRight
                                aria-hidden
                                className="size-4 text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                              />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mt-2">
                    <PanelEmpty>
                      {stockBajo > 0
                        ? `El resumen reporta ${formatNumber(
                            stockBajo,
                          )} productos bajo el mínimo. Revisalos en existencias.`
                        : "Todo el stock está por encima del mínimo."}
                    </PanelEmpty>
                  </div>
                )}

                <div className="mt-2">
                  <QuietLink href={DASHBOARD_BAJO_STOCK_HREF}>
                    Ver existencias bajo stock
                  </QuietLink>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-secondary/60 p-4 lg:col-span-4">
                <dl className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-xs text-muted">
                      <Boxes aria-hidden className="size-3.5" />
                      Productos
                    </dt>
                    <dd className="numeric text-sm font-semibold text-foreground">
                      {formatNumber(inventario.productos)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-xs text-muted">
                      <Wallet aria-hidden className="size-3.5" />
                      Valor del inventario
                    </dt>
                    <dd className="numeric text-sm font-semibold text-foreground">
                      {formatMoney(inventario.valor_inventario)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-xs text-muted">
                      <Clock aria-hidden className="size-3.5" />
                      Movimientos del mes
                    </dt>
                    <dd className="numeric text-sm font-semibold text-foreground">
                      {formatNumber(inventario.movimientos_mes)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 border-t border-separator pt-1">
                  <QuietLink href={DASHBOARD_MOVIMIENTOS_HREF}>
                    Ver movimientos
                  </QuietLink>
                </div>
              </div>
            </div>
          )}
        </Card.Content>
      </Card>
    </section>
  );
}
