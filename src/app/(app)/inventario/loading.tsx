import { Skeleton } from "@heroui/react";

/**
 * Placeholder que respeta la estructura de /inventario: encabezado, resumen,
 * tabs, filtros y tabla. Evita el salto de layout al cargar datos reales.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 rounded" />
        <Skeleton className="h-4 w-80 max-w-full rounded" />
      </div>

      <Skeleton className="h-24 w-full rounded-xl" />

      <div className="flex gap-3 border-b border-border pb-2">
        <Skeleton className="h-8 w-28 rounded" />
        <Skeleton className="h-8 w-32 rounded" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
        <Skeleton className="h-10 rounded-lg lg:col-span-5" />
        <Skeleton className="h-10 rounded-lg lg:col-span-3" />
        <Skeleton className="h-10 rounded-lg lg:col-span-3" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>

      <span className="sr-only">Cargando el inventario…</span>
    </div>
  );
}
