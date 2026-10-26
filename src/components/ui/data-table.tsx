"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Table } from "@heroui/react";
import type { PaginationMeta } from "@/lib/api/types";
import { cn, formatNumber } from "@/lib/utils";
import { useAnnouncer } from "./announcer";
import { EmptyState, ErrorState, TableSkeleton } from "./feedback";
import { TablePagination } from "./table-pagination";

export type DataTableSortDirection = "ascending" | "descending";

export interface DataTableSortDescriptor {
  column: string;
  direction: DataTableSortDirection;
}

export interface DataTableColumn<T extends object> {
  id: string;
  header: string;
  cell: (item: T) => ReactNode;
  className?: string;
  /** La primera columna identifica la fila para lectores de pantalla. */
  isRowHeader?: boolean;
  /** Solo se ordena si la tabla recibe `onSortChange`. */
  allowsSorting?: boolean;
}

interface DataTableProps<T extends object> {
  ariaLabel: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (item: T) => string | number;
  isLoading?: boolean;
  isPending?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  sortDescriptor?: DataTableSortDescriptor;
  onSortChange?: (descriptor: DataTableSortDescriptor) => void;
  className?: string;
}

export function DataTable<T extends object>({
  ariaLabel,
  columns,
  rows,
  getRowId,
  isLoading = false,
  isPending = false,
  error = null,
  emptyTitle = "Sin resultados",
  emptyDescription,
  emptyIcon,
  emptyAction,
  meta,
  onPageChange,
  sortDescriptor,
  onSortChange,
  className,
}: DataTableProps<T>) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { announce } = useAnnouncer();

  const firstRowId = rows.length > 0 ? getRowId(rows[0]) : "";
  const resultSignature = meta
    ? `${meta.current_page}/${meta.last_page}/${meta.total}/${rows.length}/${firstRowId}`
    : `0/0/${rows.length}/${rows.length}/${firstRowId}`;
  const previousSignature = useRef(resultSignature);

  useEffect(() => {
    if (previousSignature.current === resultSignature) return;

    previousSignature.current = resultSignature;
    headingRef.current?.focus();

    if (meta) {
      announce(
        `Página ${formatNumber(meta.current_page)} de ${formatNumber(
          Math.max(meta.last_page, 1),
        )}. ${formatNumber(meta.total)} resultados.`,
      );

      return;
    }

    announce(`${formatNumber(rows.length)} resultados.`);
  }, [resultSignature, meta, rows.length, announce]);

  let content: ReactNode;

  if (error) {
    content = <ErrorState message={error} />;
  } else if (isLoading) {
    content = <TableSkeleton />;
  } else if (rows.length === 0) {
    content = (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  } else {
    content = (
      <div
        className={cn(
          "relative",
          isPending && "pointer-events-none opacity-60 transition-opacity",
          className,
        )}
        aria-busy={isPending}
        data-pending={isPending || undefined}
      >
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content
              aria-label={ariaLabel}
              sortDescriptor={sortDescriptor}
              onSortChange={
                onSortChange
                  ? (descriptor) =>
                      onSortChange({
                        column: String(descriptor.column),
                        direction: descriptor.direction,
                      })
                  : undefined
              }
            >
              <Table.Header>
                {columns.map((column) => (
                  <Table.Column
                    key={column.id}
                    id={column.id}
                    isRowHeader={column.isRowHeader}
                    allowsSorting={Boolean(
                      column.allowsSorting && onSortChange,
                    )}
                    className={column.className}
                  >
                    {column.header}
                  </Table.Column>
                ))}
              </Table.Header>

              <Table.Body items={rows}>
                {(item) => (
                  <Table.Row id={getRowId(item)}>
                    {columns.map((column) => (
                      <Table.Cell key={column.id} className={column.className}>
                        {column.cell(item)}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>

          {meta && onPageChange ? (
            <Table.Footer>
              <TablePagination meta={meta} onPageChange={onPageChange} />
            </Table.Footer>
          ) : null}
        </Table>
      </div>
    );
  }

  return (
    <section aria-label={ariaLabel} aria-busy={isLoading || isPending}>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="sr-only focus:outline-none"
      >
        Resultados de {ariaLabel}
      </h2>

      {content}
    </section>
  );
}
