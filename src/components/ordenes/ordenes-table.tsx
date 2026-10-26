"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ClipboardList, FilePlus2 } from "lucide-react";
import { Button } from "@heroui/react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { OrdenEstadoChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/ui/table-pagination";
import type { Orden, PaginationMeta, User } from "@/lib/api/types";
import {
  accionesOrden,
  ordenClienteNombre,
  ordenFechaProgramadaTexto,
  ordenItemsCount,
  ordenOperarioNombre,
  ordenProformaNumero,
  ordenesHref,
  type AccionesOrdenOpciones,
  type OrdenesQuery,
} from "@/lib/ordenes";
import { formatNumber } from "@/lib/utils";
import { OrdenActions } from "./orden-actions";

interface OrdenesTableProps {
  ordenes: Orden[];
  meta: PaginationMeta;
  query: OrdenesQuery;
  operarios: readonly User[];
  permisos: AccionesOrdenOpciones;
}

export function OrdenesTable({
  ordenes,
  meta,
  query,
  operarios,
  permisos,
}: OrdenesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const filtersActive = Boolean(
    query.search ||
      query.estado ||
      query.operarioId !== "" ||
      query.clienteId !== "",
  );

  function navigatePage(page: number) {
    startTransition(() => {
      router.push(ordenesHref({ ...query, page }));
    });
  }

  const columns: DataTableColumn<Orden>[] = [
    {
      id: "numero",
      header: "Orden",
      isRowHeader: true,
      cell: (orden) => (
        <div className="min-w-0">
          <Link
            href={`/ordenes/${orden.id}`}
            className="font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {orden.numero}
          </Link>
          <p className="text-xs text-muted">
            {orden.fecha_programada
              ? `Programada: ${ordenFechaProgramadaTexto(orden)}`
              : "Sin fecha programada"}
          </p>
        </div>
      ),
    },
    {
      id: "cliente",
      header: "Cliente",
      cell: (orden) => (
        <span className="block max-w-[16rem] truncate text-sm">
          {ordenClienteNombre(orden)}
        </span>
      ),
    },
    {
      id: "proforma",
      header: "Proforma",
      cell: (orden) => (
        <Link
          href={`/proformas/${orden.proforma_id}`}
          className="text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {ordenProformaNumero(orden)}
        </Link>
      ),
    },
    {
      id: "operario",
      header: "Operario",
      cell: (orden) => (
        <span className="block max-w-[12rem] truncate text-sm text-muted">
          {ordenOperarioNombre(orden)}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: (orden) => <OrdenEstadoChip estado={orden.estado} />,
    },
    {
      id: "programada",
      header: "Fecha programada",
      className: "hidden lg:table-cell",
      cell: (orden) => (
        <span className="numeric text-sm text-muted">
          {ordenFechaProgramadaTexto(orden)}
        </span>
      ),
    },
    {
      id: "items",
      header: "Ítems",
      className: "hidden sm:table-cell text-end",
      cell: (orden) => (
        <span className="numeric text-sm text-muted">
          {formatNumber(ordenItemsCount(orden))}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      className: "text-end",
      cell: (orden) => (
        <OrdenActions
          ordenId={orden.id}
          numero={orden.numero}
          acciones={Array.from(accionesOrden(orden, permisos))}
          operarios={operarios}
          display="icons"
        />
      ),
    },
  ];

  const emptyTitle = filtersActive
    ? "Sin coincidencias"
    : "Todavía no hay órdenes de servicio";
  const emptyDescription = filtersActive
    ? "Ajusta la búsqueda, el estado o los filtros para ver más resultados."
    : "Crea una orden desde una proforma aceptada para empezar a ejecutar el servicio.";

  const emptyAction = filtersActive ? (
    <Button
      variant="tertiary"
      size="sm"
      onPress={() => router.push(ordenesHref({ ...query, search: "", estado: "", operarioId: "", clienteId: "", page: 1 }))}
    >
      Limpiar filtros
    </Button>
  ) : (
    <Button
      variant="primary"
      size="sm"
      onPress={() => router.push("/proformas?estado=ACEPTADA")}
    >
      <FilePlus2 aria-hidden className="size-4" />
      Ver proformas aceptadas
    </Button>
  );

  return (
    <section aria-label="Listado de órdenes de servicio">
      <div className="hidden md:block">
        <DataTable
          ariaLabel="Órdenes de servicio"
          columns={columns}
          rows={ordenes}
          getRowId={(orden) => orden.id}
          isPending={isPending}
          meta={meta}
          onPageChange={navigatePage}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyIcon={<ClipboardList aria-hidden className="size-5" />}
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
        {ordenes.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            icon={<ClipboardList aria-hidden className="size-5" />}
            action={emptyAction}
          />
        ) : (
          <ul className="space-y-3" aria-label="Órdenes de servicio">
            {ordenes.map((orden) => (
              <li
                key={orden.id}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/ordenes/${orden.id}`}
                      className="font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {orden.numero}
                    </Link>
                    <p className="truncate text-sm text-muted">
                      {ordenClienteNombre(orden)}
                    </p>
                  </div>

                  <OrdenEstadoChip estado={orden.estado} />
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Proforma</dt>
                    <dd className="text-foreground">
                      <Link
                        href={`/proformas/${orden.proforma_id}`}
                        className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        {ordenProformaNumero(orden)}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Operario</dt>
                    <dd className="truncate text-foreground">
                      {ordenOperarioNombre(orden)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Programada</dt>
                    <dd className="numeric text-foreground">
                      {ordenFechaProgramadaTexto(orden)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Ítems</dt>
                    <dd className="numeric text-foreground">
                      {formatNumber(ordenItemsCount(orden))}
                    </dd>
                  </div>
                </dl>

                <div className="border-t border-border px-3 py-2">
                  <OrdenActions
                    ordenId={orden.id}
                    numero={orden.numero}
                    acciones={Array.from(accionesOrden(orden, permisos))}
                    operarios={operarios}
                    display="labels"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <TablePagination meta={meta} onPageChange={navigatePage} />
        </div>
      </div>
    </section>
  );
}
