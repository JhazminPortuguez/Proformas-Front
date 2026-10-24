"use client";

import { Pagination } from "@heroui/react";
import type { PaginationMeta } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";

interface TablePaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function TablePagination({ meta, onPageChange }: TablePaginationProps) {
  const { current_page: page, last_page: lastPage, per_page: perPage, total } = meta;

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <Pagination
      size="sm"
      aria-label="Paginación de resultados"
      className="w-full justify-between gap-3"
    >
      <Pagination.Summary className="text-xs text-muted">
        {total === 0
          ? "Sin resultados"
          : `${formatNumber(from)}–${formatNumber(to)} de ${formatNumber(total)}`}
      </Pagination.Summary>

      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            onPress={() => onPageChange(page - 1)}
            isDisabled={page <= 1}
            aria-label="Página anterior"
          >
            <Pagination.PreviousIcon />
            <span className="hidden sm:inline">Anterior</span>
          </Pagination.Previous>
        </Pagination.Item>

        <Pagination.Item>
          <span className="px-2 text-xs text-muted">
            Página {formatNumber(page)} de {formatNumber(Math.max(lastPage, 1))}
          </span>
        </Pagination.Item>

        <Pagination.Item>
          <Pagination.Next
            onPress={() => onPageChange(page + 1)}
            isDisabled={page >= lastPage}
            aria-label="Página siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}
