"use client";

import type { ReactNode } from "react";
import { Table } from "@heroui/react";
import type { PaginationMeta } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, TableSkeleton } from "./feedback";
import { TablePagination } from "./table-pagination";

export interface DataTableColumn<T extends object> {
  id: string;
  header: string;
  cell: (item: T) => ReactNode;
  className?: string;
  /** La primera columna identifica la fila para lectores de pantalla. */
  isRowHeader?: boolean;
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
  className,
}: DataTableProps<T>) {
  if (error) {
    return <ErrorState message={error} />;
  }

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }

  return (
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
          <Table.Content aria-label={ariaLabel}>
            <Table.Header>
              {columns.map((column) => (
                <Table.Column
                  key={column.id}
                  id={column.id}
                  isRowHeader={column.isRowHeader}
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

      {isPending ? (
        <p role="status" className="sr-only">
          Actualizando resultados…
        </p>
      ) : null}
    </div>
  );
}
