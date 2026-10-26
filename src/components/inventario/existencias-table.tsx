"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Boxes, PackagePlus, SlidersHorizontal } from "lucide-react";
import { Button } from "@heroui/react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { TablePagination } from "@/components/ui/table-pagination";
import type { PaginationMeta, Producto } from "@/lib/api/types";
import {
  existenciasHref,
  movimientosDeProductoHref,
  productoStockBajo,
  productoValorStock,
  type ExistenciasQuery,
} from "@/lib/inventario";
import { formatMoney, formatNumber } from "@/lib/utils";
import { StockEstadoChip } from "./chips";

interface ExistenciasTableProps {
  productos: Producto[];
  meta: PaginationMeta;
  query: ExistenciasQuery;
  canAdjust: boolean;
  onEntrada: (producto?: Producto) => void;
  onAjuste: (producto?: Producto) => void;
}

export function ExistenciasTable({
  productos,
  meta,
  query,
  canAdjust,
  onEntrada,
  onAjuste,
}: ExistenciasTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const filtersActive = Boolean(query.search || query.bajoStock || query.activo);

  function navigatePage(page: number) {
    startTransition(() => {
      router.push(existenciasHref({ ...query, page }));
    });
  }

  function clearFilters() {
    router.push(
      existenciasHref({
        search: "",
        bajoStock: false,
        activo: "",
        page: 1,
      }),
    );
  }

  const columns: DataTableColumn<Producto>[] = [
    {
      id: "producto",
      header: "Producto",
      isRowHeader: true,
      cell: (producto) => (
        <div className="min-w-0">
          <p className="max-w-[18rem] truncate font-medium text-foreground">
            {producto.nombre}
          </p>
          <p className="max-w-[18rem] truncate text-xs text-muted">
            {producto.descripcion?.trim() ||
              `Unidad: ${producto.unidad_medida}`}
          </p>
        </div>
      ),
    },
    {
      id: "stock",
      header: "Stock actual",
      className: "text-end",
      cell: (producto) => (
        <span className="numeric text-sm font-medium text-foreground whitespace-nowrap">
          {formatNumber(producto.stock_actual)}{" "}
          <span className="text-xs font-normal text-muted">
            {producto.unidad_medida}
          </span>
        </span>
      ),
    },
    {
      id: "minimo",
      header: "Mínimo",
      className: "hidden sm:table-cell text-end",
      cell: (producto) => (
        <span className="numeric text-sm text-muted whitespace-nowrap">
          {formatNumber(producto.stock_minimo)}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: (producto) => <StockEstadoChip producto={producto} />,
    },
    {
      id: "costo",
      header: "Costo promedio",
      className: "hidden lg:table-cell text-end",
      cell: (producto) => (
        <span className="numeric text-sm text-muted whitespace-nowrap">
          {formatMoney(producto.costo_promedio)}
        </span>
      ),
    },
    {
      id: "valor",
      header: "Valor",
      className: "hidden xl:table-cell text-end",
      cell: (producto) => (
        <span className="numeric text-sm text-foreground whitespace-nowrap">
          {formatMoney(productoValorStock(producto))}
        </span>
      ),
    },
    {
      id: "movimientos",
      header: "Movimientos",
      className: "hidden md:table-cell text-end",
      cell: (producto) => (
        <Link
          href={movimientosDeProductoHref(producto.id)}
          className="numeric text-sm text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label={`Ver movimientos de ${producto.nombre}`}
        >
          {formatNumber(producto.movimientos_count ?? 0)}
        </Link>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      className: "text-end",
      cell: (producto) =>
        canAdjust ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              className="size-9"
              aria-label={`Registrar entrada de ${producto.nombre}`}
              onPress={() => onEntrada(producto)}
            >
              <PackagePlus aria-hidden className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              className="size-9"
              aria-label={`Ajustar stock de ${producto.nombre}`}
              onPress={() => onAjuste(producto)}
            >
              <SlidersHorizontal aria-hidden className="size-4" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
  ];

  const emptyTitle = filtersActive
    ? "Sin productos para estos filtros"
    : "Todavía no hay productos en inventario";
  const emptyDescription = filtersActive
    ? "Ajusta la búsqueda, el stock o el estado para ver más resultados."
    : "Registra una entrada para empezar a controlar el stock de materiales.";

  const emptyAction = filtersActive ? (
    <Button variant="tertiary" size="sm" onPress={clearFilters}>
      Limpiar filtros
    </Button>
  ) : canAdjust ? (
    <Button variant="primary" size="sm" onPress={() => onEntrada()}>
      <PackagePlus aria-hidden className="size-4" />
      Registrar entrada
    </Button>
  ) : null;

  return (
    <section aria-label="Listado de existencias">
      <div className="hidden md:block">
        <DataTable
          ariaLabel="Existencias de inventario"
          columns={columns}
          rows={productos}
          getRowId={(producto) => producto.id}
          isPending={isPending}
          meta={meta}
          onPageChange={navigatePage}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyIcon={<Boxes aria-hidden className="size-5" />}
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
        {productos.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            icon={<Boxes aria-hidden className="size-5" />}
            action={emptyAction}
          />
        ) : (
          <ul className="space-y-3" aria-label="Existencias de inventario">
            {productos.map((producto) => {
              const bajoStock = productoStockBajo(producto);

              return (
                <li
                  key={producto.id}
                  className="overflow-hidden rounded-xl border border-border bg-surface"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {producto.nombre}
                      </p>
                      <p className="truncate text-sm text-muted">
                        {producto.descripcion?.trim() ||
                          `Unidad: ${producto.unidad_medida}`}
                      </p>
                    </div>

                    <StockEstadoChip producto={producto} />
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Stock actual</dt>
                      <dd className="numeric text-foreground">
                        {formatNumber(producto.stock_actual)}{" "}
                        {producto.unidad_medida}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Mínimo</dt>
                      <dd className="numeric text-foreground">
                        {formatNumber(producto.stock_minimo)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Costo promedio</dt>
                      <dd className="numeric text-foreground">
                        {formatMoney(producto.costo_promedio)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Valor en stock</dt>
                      <dd className="numeric text-foreground">
                        {formatMoney(productoValorStock(producto))}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
                    <Link
                      href={movimientosDeProductoHref(producto.id)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {formatNumber(producto.movimientos_count ?? 0)} movimientos
                    </Link>

                    {canAdjust ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 text-foreground"
                          aria-label={`Registrar entrada de ${producto.nombre}`}
                          onPress={() => onEntrada(producto)}
                        >
                          <PackagePlus aria-hidden className="size-4" />
                          Entrada
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 text-foreground"
                          aria-label={`Ajustar stock de ${producto.nombre}`}
                          onPress={() => onAjuste(producto)}
                        >
                          <SlidersHorizontal aria-hidden className="size-4" />
                          Ajustar
                        </Button>
                      </div>
                    ) : bajoStock ? (
                      <span className="text-xs text-warning">Reponer</span>
                    ) : null}
                  </div>
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
