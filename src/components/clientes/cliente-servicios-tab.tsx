"use client";

import Link from "next/link";
import { ClipboardList, Wrench } from "lucide-react";
import { OrdenEstadoChip } from "@/components/ui/status-chip";
import type { HistorialServicio, PaginationMeta } from "@/lib/api/types";
import {
  historialServicioOperario,
  historialServicioOrdenNumero,
  historialServicioTitulo,
} from "@/lib/clientes";
import { formatDateOnly, formatMoney, formatNumber } from "@/lib/utils";
import { ClienteTabShell } from "./cliente-tab-shell";
import { CLIENTE_LINK, ClienteEmptyAction } from "./cliente-tabs-ui";

interface ClienteServiciosTabProps {
  clienteId: number;
  servicios: HistorialServicio[];
  meta: PaginationMeta;
}

export function ClienteServiciosTab({
  clienteId,
  servicios,
  meta,
}: ClienteServiciosTabProps) {
  return (
    <ClienteTabShell
      clienteId={clienteId}
      tab="servicios"
      ariaLabel="Servicios realizados al cliente"
      rows={servicios}
      meta={meta}
      getRowId={(servicio) => servicio.id}
      columns={[
        {
          id: "fecha",
          header: "Fecha",
          cell: (servicio) => (
            <span className="numeric text-sm whitespace-nowrap text-muted">
              {formatDateOnly(servicio.fecha)}
            </span>
          ),
        },
        {
          id: "orden",
          header: "Orden",
          cell: (servicio) => (
            <Link
              href={`/ordenes/${servicio.orden_id}`}
              className={CLIENTE_LINK}
            >
              {historialServicioOrdenNumero(servicio)}
            </Link>
          ),
        },
        {
          id: "servicio",
          header: "Servicio",
          isRowHeader: true,
          cell: (servicio) => (
            <span className="block max-w-[18rem] truncate text-sm text-foreground">
              {historialServicioTitulo(servicio)}
            </span>
          ),
        },
        {
          id: "cantidad",
          header: "Cantidad",
          className: "hidden sm:table-cell text-end",
          cell: (servicio) => (
            <span className="numeric text-sm text-muted">
              {formatNumber(servicio.cantidad)}
            </span>
          ),
        },
        {
          id: "total",
          header: "Total",
          className: "text-end",
          cell: (servicio) => (
            <span className="numeric text-sm font-medium whitespace-nowrap text-foreground">
              {formatMoney(servicio.total_linea)}
            </span>
          ),
        },
        {
          id: "operario",
          header: "Operario",
          className: "hidden lg:table-cell",
          cell: (servicio) => (
            <span className="block max-w-[12rem] truncate text-sm text-muted">
              {historialServicioOperario(servicio)}
            </span>
          ),
        },
        {
          id: "estado",
          header: "Estado de la orden",
          cell: (servicio) => (
            <OrdenEstadoChip estado={servicio.orden_estado ?? ""} />
          ),
        },
      ]}
      emptyTitle="Sin servicios realizados"
      emptyDescription="Los servicios aparecerán cuando el cliente tenga órdenes con ítems ejecutados."
      emptyIcon={<Wrench aria-hidden className="size-5" />}
      emptyAction={
        <ClienteEmptyAction href={`/ordenes?cliente_id=${clienteId}`}>
          <ClipboardList aria-hidden className="size-4" />
          Ver órdenes del cliente
        </ClienteEmptyAction>
      }
      renderMobileCard={(servicio) => (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {historialServicioTitulo(servicio)}
              </p>
              <p className="text-xs text-muted">
                {formatDateOnly(servicio.fecha)}
              </p>
            </div>

            <OrdenEstadoChip estado={servicio.orden_estado ?? ""} />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Orden</dt>
              <dd className="text-foreground">
                <Link
                  href={`/ordenes/${servicio.orden_id}`}
                  className={CLIENTE_LINK}
                >
                  {historialServicioOrdenNumero(servicio)}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Cantidad</dt>
              <dd className="numeric text-foreground">
                {formatNumber(servicio.cantidad)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Total</dt>
              <dd className="numeric font-medium text-foreground">
                {formatMoney(servicio.total_linea)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Operario</dt>
              <dd className="truncate text-foreground">
                {historialServicioOperario(servicio)}
              </dd>
            </div>
          </dl>
        </>
      )}
    />
  );
}
