"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { History } from "lucide-react";
import { Button } from "@heroui/react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { TablePagination } from "@/components/ui/table-pagination";
import type { MovimientoInventario, PaginationMeta } from "@/lib/api/types";
import {
  existenciasHref,
  formatCantidadMovimiento,
  movimientoMeta,
  movimientoOrdenNumero,
  movimientoProductoNombre,
  movimientosHref,
  type MovimientosQuery,
} from "@/lib/inventario";
import { cn, formatDateTime, formatMoney, formatNumber } from "@/lib/utils";
import { MovimientoTipoChip } from "./chips";

interface MovimientosTableProps {
  movimientos: MovimientoInventario[];
  meta: PaginationMeta;
  query: MovimientosQuery;
}

const CANTIDAD_TONE: Record<string, string> = {
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  accent: "text-foreground",
  neutral: "text-foreground",
};

export function MovimientosTable({
  movimientos,
  meta,
  query,
}: MovimientosTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const filtersActive = Boolean(
    query.search || query.tipo || query.productoId !== "" || query.desde || query.hasta,
  );

  function navigatePage(page: number) {
    startTransition(() => {
      router.push(movimientosHref({ ...query, page }));
    });
  }

  function clearFilters() {
    router.push(
      movimientosHref({
        search: "",
        tipo: "",
        productoId: "",
        desde: "",
        hasta: "",
        page: 1,
      }),
    );
  }

  const columns: DataTableColumn<MovimientoInventario>[] = [
    {
      id: "fecha",
      header: "Fecha",
      cell: (movimiento) => (
        <span className="numeric text-sm whitespace-nowrap text-muted">
          {formatDateTime(movimiento.created_at)}
        </span>
      ),
    },
    {
      id: "producto",
      header: "Producto",
      isRowHeader: true,
      cell: (movimiento) => (
        <Link
          href={existenciasHref({
            search: movimientoProductoNombre(movimiento),
            bajoStock: false,
            activo: "",
            page: 1,
          })}
          className="block max-w-[16rem] truncate text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {movimientoProductoNombre(movimiento)}
        </Link>
      ),
    },
    {
      id: "tipo",
      header: "Tipo",
      cell: (movimiento) => <MovimientoTipoChip tipo={movimiento.tipo} />,
    },
    {
      id: "cantidad",
      header: "Cantidad",
      className: "text-end",
      cell: (movimiento) => {
        const metaTipo = movimientoMeta(movimiento.tipo);

        return (
          <span
            className={cn(
              "numeric text-sm font-semibold whitespace-nowrap",
              CANTIDAD_TONE[metaTipo.tone],
            )}
          >
            {formatCantidadMovimiento(movimiento)}
          </span>
        );
      },
    },
    {
      id: "stock",
      header: "Stock",
      className: "text-end",
      cell: (movimiento) => (
        <span className="numeric text-sm whitespace-nowrap text-muted">
          {formatNumber(movimiento.stock_anterior)} →{" "}
          {formatNumber(movimiento.stock_nuevo)}
        </span>
      ),
    },
    {
      id: "costo",
      header: "Costo unit.",
      className: "hidden lg:table-cell text-end",
      cell: (movimiento) => (
        <span className="numeric text-sm whitespace-nowrap text-muted">
          {formatMoney(movimiento.costo_unitario)}
        </span>
      ),
    },
    {
      id: "orden",
      header: "Orden",
      className: "hidden md:table-cell",
      cell: (movimiento) => {
        const numero = movimientoOrdenNumero(movimiento);

        if (!numero || !movimiento.orden) {
          return <span className="text-xs text-muted">—</span>;
        }

        return (
          <Link
            href={`/ordenes/${movimiento.orden.id}`}
            className="text-sm text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {numero}
          </Link>
        );
      },
    },
    {
      id: "usuario",
      header: "Usuario",
      className: "hidden xl:table-cell",
      cell: (movimiento) => (
        <span className="block max-w-[10rem] truncate text-sm text-muted">
          {movimiento.usuario?.name ?? "—"}
        </span>
      ),
    },
    {
      id: "motivo",
      header: "Motivo",
      className: "hidden xl:table-cell",
      cell: (movimiento) => (
        <span
          className="block max-w-[14rem] truncate text-sm text-muted"
          title={movimiento.motivo ?? undefined}
        >
          {movimiento.motivo?.trim() || "—"}
        </span>
      ),
    },
  ];

  const emptyTitle = filtersActive
    ? "Sin movimientos para estos filtros"
    : "Todavía no hay movimientos de inventario";
  const emptyDescription = filtersActive
    ? "Ajusta la búsqueda, el tipo, el producto o las fechas."
    : "Las entradas, ajustes y consumos de órdenes aparecerán acá.";

  const emptyAction = filtersActive ? (
    <Button variant="tertiary" size="sm" onPress={clearFilters}>
      Limpiar filtros
    </Button>
  ) : null;

  return (
    <section aria-label="Listado de movimientos">
      <div className="hidden md:block">
        <DataTable
          ariaLabel="Movimientos de inventario"
          columns={columns}
          rows={movimientos}
          getRowId={(movimiento) => movimiento.id}
          isPending={isPending}
          meta={meta}
          onPageChange={navigatePage}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyIcon={<History aria-hidden className="size-5" />}
          emptyAction={emptyAction}
        />
      </div>

      <div
        className={
          isPending
            ? "pointer-events-none opacity-60 transition-opacity md:hidden"
            : "md:hidden"
        }
        aria-busy={isPending}
      >
        {movimientos.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            icon={<History aria-hidden className="size-5" />}
            action={emptyAction}
          />
        ) : (
          <ul className="space-y-3" aria-label="Movimientos de inventario">
            {movimientos.map((movimiento) => {
              const metaTipo = movimientoMeta(movimiento.tipo);
              const numeroOrden = movimientoOrdenNumero(movimiento);

              return (
                <li
                  key={movimiento.id}
                  className="overflow-hidden rounded-xl border border-border bg-surface"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {movimientoProductoNombre(movimiento)}
                      </p>
                      <p className="numeric text-xs text-muted">
                        {formatDateTime(movimiento.created_at)}
                      </p>
                    </div>

                    <MovimientoTipoChip tipo={movimiento.tipo} />
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Cantidad</dt>
                      <dd
                        className={cn(
                          "numeric font-semibold",
                          CANTIDAD_TONE[metaTipo.tone],
                        )}
                      >
                        {formatCantidadMovimiento(movimiento)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Stock</dt>
                      <dd className="numeric text-foreground">
                        {formatNumber(movimiento.stock_anterior)} →{" "}
                        {formatNumber(movimiento.stock_nuevo)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Costo unitario</dt>
                      <dd className="numeric text-foreground">
                        {formatMoney(movimiento.costo_unitario)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Orden</dt>
                      <dd className="text-foreground">
                        {numeroOrden && movimiento.orden ? (
                          <Link
                            href={`/ordenes/${movimiento.orden.id}`}
                            className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                          >
                            {numeroOrden}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Usuario</dt>
                      <dd className="truncate text-foreground">
                        {movimiento.usuario?.name ?? "—"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-muted">Motivo</dt>
                      <dd className="text-foreground">
                        {movimiento.motivo?.trim() || "—"}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4">
          <TablePagination meta={meta} onPageChange={navigatePage} />
        </div>
      </div>
    </section>
  );
}
