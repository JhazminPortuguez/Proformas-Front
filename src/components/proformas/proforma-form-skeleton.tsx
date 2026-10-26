import { Skeleton } from "@heroui/react";

export function ProformaFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56 rounded" />
        <Skeleton className="h-4 w-80 max-w-full rounded" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <Skeleton className="h-52 w-full rounded-xl" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>

        <Skeleton className="h-64 w-full rounded-xl" />
      </div>

      <span className="sr-only">Cargando el formulario de proforma…</span>
    </div>
  );
}
