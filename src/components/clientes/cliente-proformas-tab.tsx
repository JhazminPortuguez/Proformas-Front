"use client";

import Link from "next/link";
import { FilePlus2, FileText } from "lucide-react";
import { ProformaEstadoChip } from "@/components/ui/status-chip";
import type { PaginationMeta, Proforma } from "@/lib/api/types";
import { proformaItemsCount } from "@/lib/proformas";
import { formatDateOnly, formatMoney, formatNumber } from "@/lib/utils";
import { ClienteTabShell } from "./cliente-tab-shell";
import { CLIENTE_LINK, ClienteEmptyAction } from "./cliente-tabs-ui";

interface ClienteProformasTabProps {
  clienteId: number;
  proformas: Proforma[];
  meta: PaginationMeta;
}

export function ClienteProformasTab({
  clienteId,
  proformas,
  meta,
}: ClienteProformasTabProps) {
  return (
    <ClienteTabShell
      clienteId={clienteId}
      tab="proformas"
      ariaLabel="Proformas del cliente"
      rows={proformas}
      meta={meta}
      getRowId={(proforma) => proforma.id}
      columns={[
        {
          id: "numero",
          header: "Número",
          isRowHeader: true,
          cell: (proforma) => (
            <Link href={`/proformas/${proforma.id}`} className={CLIENTE_LINK}>
              {proforma.numero}
            </Link>
          ),
        },
        {
          id: "estado",
          header: "Estado",
          cell: (proforma) => (
            <ProformaEstadoChip estado={proforma.estado} />
          ),
        },
        {
          id: "emision",
          header: "Emisión",
          cell: (proforma) => (
            <span className="numeric text-sm whitespace-nowrap text-muted">
              {formatDateOnly(proforma.fecha_emision)}
            </span>
          ),
        },
        {
          id: "validez",
          header: "Validez",
          className: "hidden lg:table-cell",
          cell: (proforma) => (
            <span className="numeric text-sm whitespace-nowrap text-muted">
              {formatDateOnly(proforma.fecha_validez)}
            </span>
          ),
        },
        {
          id: "total",
          header: "Total",
          className: "text-end",
          cell: (proforma) => (
            <span className="numeric text-sm font-medium whitespace-nowrap text-foreground">
              {formatMoney(proforma.total)}
            </span>
          ),
        },
        {
          id: "items",
          header: "Ítems",
          className: "hidden sm:table-cell text-end",
          cell: (proforma) => (
            <span className="numeric text-sm text-muted">
              {formatNumber(proformaItemsCount(proforma))}
            </span>
          ),
        },
      ]}
      emptyTitle="Sin proformas"
      emptyDescription="Este cliente todavía no tiene proformas registradas. Crea una para empezar a cotizar."
      emptyIcon={<FileText aria-hidden className="size-5" />}
      emptyAction={
        <ClienteEmptyAction href="/proformas/nueva">
          <FilePlus2 aria-hidden className="size-4" />
          Nueva proforma
        </ClienteEmptyAction>
      }
      renderMobileCard={(proforma) => (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <Link
                href={`/proformas/${proforma.id}`}
                className={CLIENTE_LINK}
              >
                {proforma.numero}
              </Link>
              <p className="text-xs text-muted">
                Emitida el {formatDateOnly(proforma.fecha_emision)}
              </p>
            </div>

            <ProformaEstadoChip estado={proforma.estado} />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Total</dt>
              <dd className="numeric font-medium text-foreground">
                {formatMoney(proforma.total)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Ítems</dt>
              <dd className="numeric text-foreground">
                {formatNumber(proformaItemsCount(proforma))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Emisión</dt>
              <dd className="numeric text-foreground">
                {formatDateOnly(proforma.fecha_emision)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Validez</dt>
              <dd className="numeric text-foreground">
                {formatDateOnly(proforma.fecha_validez)}
              </dd>
            </div>
          </dl>
        </>
      )}
    />
  );
}
