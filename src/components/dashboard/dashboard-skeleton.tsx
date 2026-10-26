import { Skeleton } from "@heroui/react";

/**
 * Esqueleto con la misma silueta que el dashboard: finanzas anchas, panel de
 * operación, pipeline en dos columnas y cierre de servicios + actividad.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-full rounded" />
        <Skeleton className="h-4 w-72 max-w-full rounded" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-60 rounded-xl lg:col-span-7" />
        <Skeleton className="h-60 rounded-xl lg:col-span-5" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>

      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />

      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl lg:col-span-3" />
      </div>

      <span className="sr-only">Cargando el dashboard…</span>
    </div>
  );
}
