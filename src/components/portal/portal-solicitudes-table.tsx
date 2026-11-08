"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { SolicitudEstadoChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/ui/table-pagination";
import type { PaginationMeta, PortalSolicitud } from "@/lib/api/types";
import { filasParam } from "@/lib/paginacion";
import { portalListHref, solicitarHref } from "@/lib/portal";
import { formatDateNumeric, formatNumber } from "@/lib/utils";

const LINK =
  "font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Enlace a la proforma de una solicitud Atendida. La API solo la incluye
 * cuando ya fue enviada; mientras está en borrador no hay enlace.
 */
export function ProformaAsociada({ solicitud }: { solicitud: PortalSolicitud }) {
  if (!solicitud.proforma) return <span className="text-muted">—</span>;

  return (
    <Link
      href={`/portal/proformas/${solicitud.proforma.id}`}
      className={`${LINK} whitespace-nowrap`}
      aria-label={`Ver proforma asociada ${solicitud.proforma.numero}`}
    >
      Ver proforma {solicitud.proforma.numero}
    </Link>
  );
}

interface PortalSolicitudesTableProps {
  solicitudes: PortalSolicitud[];
  meta: PaginationMeta;
  filtro: string;
  perPage?: number;
}

export function PortalSolicitudesTable({
  solicitudes,
  meta,
  filtro,
  perPage,
}: PortalSolicitudesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(page: number, filas = perPage) {
    startTransition(() =>
      router.push(
        portalListHref("/portal/solicitudes", { filtro, page, perPage: filasParam(filas) }),
        { scroll: false },
      ),
    );
  }

  const columns: DataTableColumn<PortalSolicitud>[] = [
    {
      id: "fecha",
      header: "Fecha de envío",
      cell: (solicitud) => (
        <span className="numeric whitespace-nowrap text-sm">
          {formatDateNumeric(solicitud.fecha)}
        </span>
      ),
    },
    {
      id: "descripcion",
      header: "Descripción",
      isRowHeader: true,
      cell: (solicitud) => (
        <Link
          href={`/portal/solicitudes/${solicitud.id}`}
          className={`${LINK} line-clamp-2`}
        >
          {solicitud.descripcion}
        </Link>
      ),
    },
    {
      id: "items",
      header: "Ítems",
      className: "text-right",
      cell: (solicitud) => (
        <span className="numeric">{formatNumber(solicitud.items_count ?? 0)}</span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: (solicitud) => <SolicitudEstadoChip estado={solicitud.estado} />,
    },
    {
      id: "proforma",
      header: "Proforma",
      cell: (solicitud) => <ProformaAsociada solicitud={solicitud} />,
    },
  ];

  const sinFiltro = filtro === "todas";
  const vacio = {
    title: sinFiltro ? "Todavía no enviaste solicitudes" : "Sin solicitudes en este estado",
    description: sinFiltro
      ? "Pide una cotización y la verás aquí con su estado."
      : "Prueba con otro filtro.",
  };
  const accion = sinFiltro ? (
    <Link
      href={solicitarHref()}
      className="inline-flex h-9 items-center rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      Solicitar cotización
    </Link>
  ) : undefined;

  return (
    <>
      <div className="hidden md:block">
        <DataTable
          ariaLabel="Mis solicitudes"
          columns={columns}
          rows={solicitudes}
          getRowId={(solicitud) => solicitud.id}
          isPending={isPending}
          meta={meta}
          onPageChange={(page) => navigate(page)}
          onPerPageChange={(filas) => navigate(1, filas)}
          emptyTitle={vacio.title}
          emptyDescription={vacio.description}
          emptyIcon={<Inbox aria-hidden className="size-5" />}
          emptyAction={accion}
        />
      </div>

      <div className="md:hidden" aria-busy={isPending}>
        {solicitudes.length === 0 ? (
          <EmptyState
            title={vacio.title}
            description={vacio.description}
            icon={<Inbox aria-hidden className="size-5" />}
            action={accion}
          />
        ) : (
          <ul className="space-y-3" aria-label="Mis solicitudes">
            {solicitudes.map((solicitud) => (
              <li key={solicitud.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="numeric text-sm text-muted">
                    {formatDateNumeric(solicitud.fecha)}
                  </span>
                  <SolicitudEstadoChip estado={solicitud.estado} />
                </div>
                <Link
                  href={`/portal/solicitudes/${solicitud.id}`}
                  className={`${LINK} mt-2 block`}
                >
                  {solicitud.descripcion}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  {formatNumber(solicitud.items_count ?? 0)}{" "}
                  {solicitud.items_count === 1 ? "ítem" : "ítems"}
                </p>
                {solicitud.proforma ? (
                  <p className="mt-2 text-sm">
                    <ProformaAsociada solicitud={solicitud} />
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {meta.total > 0 ? (
          <div className="mt-4">
            <TablePagination
              meta={meta}
              onPageChange={(page) => navigate(page)}
              onPerPageChange={(filas) => navigate(1, filas)}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
