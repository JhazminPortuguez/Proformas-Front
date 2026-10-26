"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { TablePagination } from "@/components/ui/table-pagination";
import type { PaginationMeta } from "@/lib/api/types";
import { clienteTabHref, type ClienteTab } from "@/lib/clientes";

interface ClienteTabShellProps<T extends object> {
  clienteId: number;
  tab: ClienteTab;
  ariaLabel: string;
  rows: T[];
  meta: PaginationMeta;
  columns: DataTableColumn<T>[];
  getRowId: (item: T) => number;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon: ReactNode;
  emptyAction?: ReactNode;
  renderMobileCard: (item: T) => ReactNode;
}

/**
 * Tabla en escritorio y tarjetas en móvil para las pestañas de la ficha.
 * La página vive en la URL (`?tab=&page=`) y se navega con transición, igual
 * que el resto de listados del backoffice.
 */
export function ClienteTabShell<T extends object>({
  clienteId,
  tab,
  ariaLabel,
  rows,
  meta,
  columns,
  getRowId,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  renderMobileCard,
}: ClienteTabShellProps<T>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigatePage(page: number) {
    startTransition(() => {
      router.push(clienteTabHref(clienteId, tab, page));
    });
  }

  return (
    <div>
      <div className="hidden md:block">
        <DataTable
          ariaLabel={ariaLabel}
          columns={columns}
          rows={rows}
          getRowId={getRowId}
          isPending={isPending}
          meta={meta}
          onPageChange={navigatePage}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyIcon={emptyIcon}
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
        {rows.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            icon={emptyIcon}
            action={emptyAction}
          />
        ) : (
          <ul className="space-y-3" aria-label={`${ariaLabel} (móvil)`}>
            {rows.map((row) => (
              <li
                key={getRowId(row)}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                {renderMobileCard(row)}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <TablePagination meta={meta} onPageChange={navigatePage} />
        </div>
      </div>
    </div>
  );
}
