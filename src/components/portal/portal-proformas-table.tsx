"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown, FileText } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { ProformaEstadoChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/ui/table-pagination";
import { portalProformaPdfUrl } from "@/lib/api/paths";
import type { PaginationMeta, PortalProforma } from "@/lib/api/types";
import { filasParam } from "@/lib/paginacion";
import { portalListHref, resumenItems } from "@/lib/portal";
import { formatDateNumeric, formatMoney } from "@/lib/utils";

const NUMERO_LINK =
  "whitespace-nowrap font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const PDF_LINK =
  "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function PdfLink({ proforma }: { proforma: Pick<PortalProforma, "id" | "numero"> }) {
  return (
    <a
      href={portalProformaPdfUrl(proforma.id)}
      className={PDF_LINK}
      aria-label={`Descargar PDF de la proforma ${proforma.numero}`}
    >
      <FileDown aria-hidden className="size-4" />
      Descargar PDF
    </a>
  );
}

/** Validez con un aviso discreto si una proforma enviada ya venció. */
export function Validez({ proforma }: { proforma: PortalProforma }) {
  return (
    <span className="numeric whitespace-nowrap">
      {formatDateNumeric(proforma.fecha_validez)}
      {proforma.vencida ? (
        <span className="block text-xs text-warning-soft-foreground">Venció</span>
      ) : null}
    </span>
  );
}

interface PortalProformasTableProps {
  proformas: PortalProforma[];
  meta: PaginationMeta;
  filtro: string;
  perPage?: number;
}

export function PortalProformasTable({
  proformas,
  meta,
  filtro,
  perPage,
}: PortalProformasTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(page: number, filas = perPage) {
    startTransition(() =>
      router.push(
        portalListHref("/portal/proformas", { filtro, page, perPage: filasParam(filas) }),
        { scroll: false },
      ),
    );
  }

  const columns: DataTableColumn<PortalProforma>[] = [
    {
      id: "numero",
      header: "Proforma",
      isRowHeader: true,
      cell: (proforma) => (
        <Link href={`/portal/proformas/${proforma.id}`} className={NUMERO_LINK}>
          {proforma.numero}
        </Link>
      ),
    },
    {
      id: "items",
      header: "Ítems",
      cell: (proforma) => (
        <span className="line-clamp-2 text-sm text-foreground">
          {resumenItems(proforma.primer_item, proforma.items_count)}
        </span>
      ),
    },
    {
      id: "emision",
      header: "Emisión",
      cell: (proforma) => (
        <span className="numeric whitespace-nowrap text-sm">
          {formatDateNumeric(proforma.fecha_emision)}
        </span>
      ),
    },
    {
      id: "validez",
      header: "Validez",
      cell: (proforma) => <Validez proforma={proforma} />,
    },
    {
      id: "total",
      header: "Total",
      className: "text-right",
      cell: (proforma) => (
        <span className="numeric whitespace-nowrap font-medium">
          {formatMoney(proforma.total, proforma.moneda)}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: (proforma) => <ProformaEstadoChip estado={proforma.estado} />,
    },
    {
      id: "pdf",
      header: "PDF",
      cell: (proforma) => <PdfLink proforma={proforma} />,
    },
  ];

  const vacio = {
    title: filtro === "todas" ? "Todavía no tienes proformas" : "Sin proformas en este estado",
    description:
      filtro === "todas"
        ? "Cuando la empresa te envíe una proforma, la verás aquí."
        : "Prueba con otro filtro.",
  };

  return (
    <>
      <div className="hidden md:block">
        <DataTable
          ariaLabel="Mis proformas"
          columns={columns}
          rows={proformas}
          getRowId={(proforma) => proforma.id}
          isPending={isPending}
          meta={meta}
          onPageChange={(page) => navigate(page)}
          onPerPageChange={(filas) => navigate(1, filas)}
          emptyTitle={vacio.title}
          emptyDescription={vacio.description}
          emptyIcon={<FileText aria-hidden className="size-5" />}
        />
      </div>

      <div className="md:hidden" aria-busy={isPending}>
        {proformas.length === 0 ? (
          <EmptyState
            title={vacio.title}
            description={vacio.description}
            icon={<FileText aria-hidden className="size-5" />}
          />
        ) : (
          <ul className="space-y-3" aria-label="Mis proformas">
            {proformas.map((proforma) => (
              <li key={proforma.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/portal/proformas/${proforma.id}`} className={NUMERO_LINK}>
                    {proforma.numero}
                  </Link>
                  <ProformaEstadoChip estado={proforma.estado} />
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {resumenItems(proforma.primer_item, proforma.items_count)}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Emisión</dt>
                    <dd className="numeric">{formatDateNumeric(proforma.fecha_emision)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Validez</dt>
                    <dd>
                      <Validez proforma={proforma} />
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">Total</dt>
                    <dd className="numeric font-medium">
                      {formatMoney(proforma.total, proforma.moneda)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/portal/proformas/${proforma.id}`}
                    className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    Ver detalle
                  </Link>
                  <PdfLink proforma={proforma} />
                </div>
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
