"use client";

import Link from "next/link";
import { ClipboardList, FilePlus2 } from "lucide-react";
import { OrdenEstadoChip } from "@/components/ui/status-chip";
import type { Orden, PaginationMeta } from "@/lib/api/types";
import {
  ordenFechaProgramadaTexto,
  ordenItemsCount,
  ordenOperarioNombre,
  ordenProformaNumero,
} from "@/lib/ordenes";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { ClienteTabShell } from "./cliente-tab-shell";
import { CLIENTE_LINK, ClienteEmptyAction } from "./cliente-tabs-ui";

interface ClienteOrdenesTabProps {
  clienteId: number;
  ordenes: Orden[];
  meta: PaginationMeta;
}

export function ClienteOrdenesTab({
  clienteId,
  ordenes,
  meta,
}: ClienteOrdenesTabProps) {
  return (
    <ClienteTabShell
      clienteId={clienteId}
      tab="ordenes"
      ariaLabel="Órdenes del cliente"
      rows={ordenes}
      meta={meta}
      getRowId={(orden) => orden.id}
      columns={[
        {
          id: "numero",
          header: "Orden",
          isRowHeader: true,
          cell: (orden) => (
            <Link href={`/ordenes/${orden.id}`} className={CLIENTE_LINK}>
              {orden.numero}
            </Link>
          ),
        },
        {
          id: "estado",
          header: "Estado",
          cell: (orden) => <OrdenEstadoChip estado={orden.estado} />,
        },
        {
          id: "programada",
          header: "Programada",
          cell: (orden) => (
            <span className="numeric text-sm whitespace-nowrap text-muted">
              {ordenFechaProgramadaTexto(orden)}
            </span>
          ),
        },
        {
          id: "operario",
          header: "Operario",
          className: "hidden lg:table-cell",
          cell: (orden) => (
            <span className="block max-w-[12rem] truncate text-sm text-muted">
              {ordenOperarioNombre(orden)}
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
          id: "cierre",
          header: "Cierre",
          className: "hidden xl:table-cell",
          cell: (orden) => (
            <span className="numeric text-sm whitespace-nowrap text-muted">
              {formatDateTime(orden.cerrada_at)}
            </span>
          ),
        },
      ]}
      emptyTitle="Sin órdenes de servicio"
      emptyDescription="Las órdenes se generan desde una proforma aceptada. Cuando existan, aparecerán acá con su avance."
      emptyIcon={<ClipboardList aria-hidden className="size-5" />}
      emptyAction={
        <ClienteEmptyAction
          href={`/proformas?cliente_id=${clienteId}&estado=ACEPTADA`}
        >
          <FilePlus2 aria-hidden className="size-4" />
          Ver proformas aceptadas
        </ClienteEmptyAction>
      }
      renderMobileCard={(orden) => (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <Link href={`/ordenes/${orden.id}`} className={CLIENTE_LINK}>
                {orden.numero}
              </Link>
              <p className="text-xs text-muted">
                Proforma{" "}
                <Link
                  href={`/proformas/${orden.proforma_id}`}
                  className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {ordenProformaNumero(orden)}
                </Link>
              </p>
            </div>

            <OrdenEstadoChip estado={orden.estado} />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
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
            <div>
              <dt className="text-xs text-muted">Operario</dt>
              <dd className="truncate text-foreground">
                {ordenOperarioNombre(orden)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Cierre</dt>
              <dd className="numeric text-foreground">
                {formatDateTime(orden.cerrada_at)}
              </dd>
            </div>
          </dl>
        </>
      )}
    />
  );
}
