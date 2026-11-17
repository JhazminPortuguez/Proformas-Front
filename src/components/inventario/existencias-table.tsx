"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Boxes,
  EllipsisVertical,
  PackagePlus,
  Pencil,
  Power,
  PowerOff,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Button, Dropdown } from "@heroui/react";
import type { FilasPorPagina } from "@/lib/paginacion";
import { ActionTooltip } from "@/components/ui/action-tooltip";
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
  /** Alta, edición, activar/desactivar y eliminar productos (solo admin). */
  canManage?: boolean;
  onEntrada: (producto?: Producto) => void;
  onAjuste: (producto?: Producto) => void;
  onEditar?: (producto: Producto) => void;
  onCambiarActivo?: (producto: Producto) => void;
  onEliminar?: (producto: Producto) => void;
}

function InactivoChip() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-muted">
      Inactivo
    </span>
  );
}

/** Editar, activar/desactivar y eliminar: solo con `canManage`. */
function AccionesProducto({
  producto,
  onEditar,
  onCambiarActivo,
  onEliminar,
}: {
  producto: Producto;
  onEditar?: (producto: Producto) => void;
  onCambiarActivo?: (producto: Producto) => void;
  onEliminar?: (producto: Producto) => void;
}) {
  const accionActivo = producto.activo ? "Desactivar" : "Activar";

  return (
    <>
      <ActionTooltip label="Editar producto">
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="size-9"
          aria-label={`Editar ${producto.nombre}`}
          onPress={() => onEditar?.(producto)}
        >
          <Pencil aria-hidden className="size-4" />
        </Button>
      </ActionTooltip>
      <ActionTooltip label={`${accionActivo} producto`}>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="size-9"
          aria-label={`${accionActivo} ${producto.nombre}`}
          onPress={() => onCambiarActivo?.(producto)}
        >
          {producto.activo ? (
            <PowerOff aria-hidden className="size-4" />
          ) : (
            <Power aria-hidden className="size-4" />
          )}
        </Button>
      </ActionTooltip>
      <ActionTooltip label="Eliminar producto">
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="size-9 text-danger"
          aria-label={`Eliminar ${producto.nombre}`}
          onPress={() => onEliminar?.(producto)}
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      </ActionTooltip>
    </>
  );
}

/**
 * Editar, activar/desactivar y eliminar en un solo menú: con tres iconos más
 * la columna de acciones no cabía a 1280 px (141 px de desborde).
 */
function MenuProducto({
  producto,
  onEditar,
  onCambiarActivo,
  onEliminar,
}: {
  producto: Producto;
  onEditar?: (producto: Producto) => void;
  onCambiarActivo?: (producto: Producto) => void;
  onEliminar?: (producto: Producto) => void;
}) {
  const accionActivo = producto.activo ? "Desactivar" : "Activar";

  return (
    <Dropdown>
      <ActionTooltip label="Más acciones">
        <Dropdown.Trigger
          aria-label={`Más acciones de ${producto.nombre}`}
          className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <EllipsisVertical aria-hidden className="size-4" />
        </Dropdown.Trigger>
      </ActionTooltip>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label={`Acciones de ${producto.nombre}`}
          onAction={(key) => {
            if (key === "editar") onEditar?.(producto);
            if (key === "activo") onCambiarActivo?.(producto);
            if (key === "eliminar") onEliminar?.(producto);
          }}
        >
          <Dropdown.Item id="editar" textValue={`Editar ${producto.nombre}`}>
            <Pencil aria-hidden className="size-4" />
            Editar
          </Dropdown.Item>
          <Dropdown.Item id="activo" textValue={`${accionActivo} ${producto.nombre}`}>
            {producto.activo ? (
              <PowerOff aria-hidden className="size-4" />
            ) : (
              <Power aria-hidden className="size-4" />
            )}
            {accionActivo}
          </Dropdown.Item>
          <Dropdown.Item
            id="eliminar"
            textValue={`Eliminar ${producto.nombre}`}
            variant="danger"
          >
            <Trash2 aria-hidden className="size-4" />
            Eliminar
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export function ExistenciasTable({
  productos,
  meta,
  query,
  canAdjust,
  canManage = false,
  onEntrada,
  onAjuste,
  onEditar,
  onCambiarActivo,
  onEliminar,
}: ExistenciasTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const filtersActive = Boolean(query.search || query.bajoStock || query.activo);

  function navigatePage(page: number) {
    startTransition(() => {
      router.push(existenciasHref({ ...query, page }));
    });
  }

  function navigatePerPage(perPage: FilasPorPagina) {
    startTransition(() => {
      router.push(existenciasHref({ ...query, perPage, page: 1 }));
    });
  }

  function clearFilters() {
    router.push(
      existenciasHref({
        search: "",
        bajoStock: false,
        activo: "",
        page: 1,
        perPage: query.perPage,
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
          <div className="flex items-center gap-1.5">
            <p
              className="max-w-[13rem] truncate font-medium text-foreground"
              title={producto.nombre}
            >
              {producto.nombre}
            </p>
            {producto.activo ? null : <InactivoChip />}
          </div>
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
        <div className="text-end">
          <span className="numeric text-sm font-medium text-foreground whitespace-nowrap">
            {formatNumber(producto.stock_actual)}{" "}
            <span className="text-xs font-normal text-muted">
              {producto.unidad_medida}
            </span>
          </span>
          {/* El mínimo va aquí, sin columna propia, para caber a 1280 px. */}
          <p className="numeric text-xs whitespace-nowrap text-muted">
            mín. {formatNumber(producto.stock_minimo)}
          </p>
        </div>
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
        canAdjust || canManage ? (
          <div className="flex items-center justify-end gap-0.5">
            {canAdjust ? (
              <>
                <ActionTooltip label="Registrar entrada">
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
                </ActionTooltip>
                <ActionTooltip label="Ajustar stock">
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
                </ActionTooltip>
              </>
            ) : null}
            {canManage ? (
              <MenuProducto
                producto={producto}
                onEditar={onEditar}
                onCambiarActivo={onCambiarActivo}
                onEliminar={onEliminar}
              />
            ) : null}
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
          onPerPageChange={navigatePerPage}
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-medium text-foreground">
                          {producto.nombre}
                        </p>
                        {producto.activo ? null : <InactivoChip />}
                      </div>
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

                    {canManage ? (
                      <div className="flex items-center">
                        <AccionesProducto
                          producto={producto}
                          onEditar={onEditar}
                          onCambiarActivo={onCambiarActivo}
                          onEliminar={onEliminar}
                        />
                      </div>
                    ) : null}

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
          <TablePagination
            meta={meta}
            onPageChange={navigatePage}
            onPerPageChange={navigatePerPage}
          />
        </div>
      </div>
    </section>
  );
}
