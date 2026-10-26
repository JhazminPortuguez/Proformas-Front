"use client";

import Link from "next/link";
import { ClipboardList, ReceiptText } from "lucide-react";
import { EstadoCobroChip, VencidaChip } from "@/components/cobros/chips";
import type { CuentaPorCobrar, PaginationMeta } from "@/lib/api/types";
import {
  cuentaEstaVencida,
  cuentaOrdenHref,
  cuentaOrdenNumero,
  cuentaSaldo,
  cuentaTotalPagado,
} from "@/lib/cobros";
import { cn, formatDateOnly, formatMoney } from "@/lib/utils";
import { ClienteTabShell } from "./cliente-tab-shell";
import { CLIENTE_LINK, ClienteEmptyAction } from "./cliente-tabs-ui";

interface ClienteCobrosTabProps {
  clienteId: number;
  cuentas: CuentaPorCobrar[];
  meta: PaginationMeta;
}

export function ClienteCobrosTab({
  clienteId,
  cuentas,
  meta,
}: ClienteCobrosTabProps) {
  return (
    <ClienteTabShell
      clienteId={clienteId}
      tab="cobros"
      ariaLabel="Cuentas por cobrar del cliente"
      rows={cuentas}
      meta={meta}
      getRowId={(cuenta) => cuenta.id}
      columns={[
        {
          id: "numero",
          header: "Cuenta",
          isRowHeader: true,
          cell: (cuenta) => (
            <Link href={`/cobros/${cuenta.id}`} className={CLIENTE_LINK}>
              {cuenta.numero}
            </Link>
          ),
        },
        {
          id: "estado",
          header: "Estado",
          cell: (cuenta) => <EstadoCobroChip estado={cuenta.estado_cobro} />,
        },
        {
          id: "mora",
          header: "Mora",
          className: "hidden sm:table-cell",
          cell: (cuenta) => <VencidaChip cuenta={cuenta} />,
        },
        {
          id: "emision",
          header: "Emisión",
          className: "hidden lg:table-cell",
          cell: (cuenta) => (
            <span className="numeric text-sm whitespace-nowrap text-muted">
              {formatDateOnly(cuenta.fecha_emision)}
            </span>
          ),
        },
        {
          id: "vencimiento",
          header: "Vencimiento",
          cell: (cuenta) => (
            <span
              className={cn(
                "numeric text-sm whitespace-nowrap",
                cuentaEstaVencida(cuenta)
                  ? "font-medium text-danger"
                  : "text-muted",
              )}
            >
              {formatDateOnly(cuenta.fecha_vencimiento)}
            </span>
          ),
        },
        {
          id: "total",
          header: "Total",
          className: "hidden lg:table-cell text-end",
          cell: (cuenta) => (
            <span className="numeric text-sm whitespace-nowrap text-muted">
              {formatMoney(cuenta.monto_total)}
            </span>
          ),
        },
        {
          id: "pagado",
          header: "Pagado",
          className: "hidden xl:table-cell text-end",
          cell: (cuenta) => (
            <span className="numeric text-sm whitespace-nowrap text-muted">
              {formatMoney(cuentaTotalPagado(cuenta))}
            </span>
          ),
        },
        {
          id: "saldo",
          header: "Saldo",
          className: "text-end",
          cell: (cuenta) => (
            <span
              className={cn(
                "numeric text-sm font-semibold whitespace-nowrap",
                cuentaSaldo(cuenta) > 0 ? "text-foreground" : "text-muted",
              )}
            >
              {formatMoney(cuentaSaldo(cuenta))}
            </span>
          ),
        },
      ]}
      emptyTitle="Sin cuentas por cobrar"
      emptyDescription="Las cuentas se generan al cerrar una orden de servicio. Este cliente todavía no tiene cartera emitida."
      emptyIcon={<ReceiptText aria-hidden className="size-5" />}
      emptyAction={
        <ClienteEmptyAction href={`/ordenes?cliente_id=${clienteId}`}>
          <ClipboardList aria-hidden className="size-4" />
          Ver órdenes del cliente
        </ClienteEmptyAction>
      }
      renderMobileCard={(cuenta) => (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <Link href={`/cobros/${cuenta.id}`} className={CLIENTE_LINK}>
                {cuenta.numero}
              </Link>
              <p className="text-xs text-muted">
                Orden{" "}
                <Link
                  href={cuentaOrdenHref(cuenta)}
                  className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {cuentaOrdenNumero(cuenta)}
                </Link>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <EstadoCobroChip estado={cuenta.estado_cobro} />
              <VencidaChip cuenta={cuenta} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Emisión</dt>
              <dd className="numeric text-foreground">
                {formatDateOnly(cuenta.fecha_emision)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Vencimiento</dt>
              <dd
                className={cn(
                  "numeric text-foreground",
                  cuentaEstaVencida(cuenta) && "font-medium text-danger",
                )}
              >
                {formatDateOnly(cuenta.fecha_vencimiento)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Total</dt>
              <dd className="numeric text-foreground">
                {formatMoney(cuenta.monto_total)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Pagado</dt>
              <dd className="numeric text-foreground">
                {formatMoney(cuentaTotalPagado(cuenta))}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted">Saldo</dt>
              <dd className="numeric text-base font-semibold text-foreground">
                {formatMoney(cuentaSaldo(cuenta))}
              </dd>
            </div>
          </dl>
        </>
      )}
    />
  );
}
