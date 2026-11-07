"use client";

import { Label, ListBox, Pagination, Select } from "@heroui/react";
import type { PaginationMeta } from "@/lib/api/types";
import { FILAS_POR_PAGINA, type FilasPorPagina } from "@/lib/paginacion";
import { formatNumber } from "@/lib/utils";

interface TablePaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  /**
   * Cambia las filas por página. El listado conserva sus filtros y vuelve a
   * la página 1. Sin este callback no se muestra el selector.
   */
  onPerPageChange?: (perPage: FilasPorPagina) => void;
}

function FilasPorPaginaSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (perPage: FilasPorPagina) => void;
}) {
  return (
    <Select
      aria-label="Filas por página"
      selectedKey={String(value)}
      onSelectionChange={(key) => {
        if (key !== null) onChange(Number(key) as FilasPorPagina);
      }}
      className="flex items-center gap-2"
    >
      <Label className="whitespace-nowrap text-xs text-muted">
        Filas por página
      </Label>
      <Select.Trigger aria-label="Filas por página" className="w-20">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {FILAS_POR_PAGINA.map((filas) => (
            <ListBox.Item
              key={filas}
              id={String(filas)}
              textValue={String(filas)}
            >
              {filas}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export function TablePagination({
  meta,
  onPageChange,
  onPerPageChange,
}: TablePaginationProps) {
  const { current_page: page, last_page: lastPage, per_page: perPage, total } = meta;

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <Pagination
      size="sm"
      aria-label="Paginación de resultados"
      className="w-full flex-wrap justify-between gap-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Pagination.Summary className="text-xs text-muted">
          {total === 0
            ? "Sin resultados"
            : `${formatNumber(from)}–${formatNumber(to)} de ${formatNumber(total)}`}
        </Pagination.Summary>

        {onPerPageChange ? (
          <FilasPorPaginaSelect value={perPage} onChange={onPerPageChange} />
        ) : null}
      </div>

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
