/** Filas por página que ofrece el paginador de los listados. */
export const FILAS_POR_PAGINA = [15, 25, 50] as const;

export type FilasPorPagina = (typeof FILAS_POR_PAGINA)[number];

export const FILAS_POR_DEFECTO: FilasPorPagina = 15;

/** `per_page` de la URL; cualquier otro valor vuelve a 15. */
export function parseFilasPorPagina(
  value: string | null | undefined,
): FilasPorPagina {
  const parsed = Number(value);

  return (FILAS_POR_PAGINA as readonly number[]).includes(parsed)
    ? (parsed as FilasPorPagina)
    : FILAS_POR_DEFECTO;
}

/** Valor para la URL: con 15 filas no se agrega `per_page`. */
export function filasParam(perPage: number | undefined): number | "" {
  return perPage === undefined || perPage === FILAS_POR_DEFECTO ? "" : perPage;
}
