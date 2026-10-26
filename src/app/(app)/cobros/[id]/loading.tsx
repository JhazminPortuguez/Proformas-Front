import { Skeleton } from "@heroui/react";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-7 w-56 rounded" />
        <Skeleton className="h-4 w-80 max-w-full rounded" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border-border p-4">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="mt-3 h-7 w-32 rounded" />
              <Skeleton className="mt-2 h-3 w-24 rounded" />
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-3">
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>

      <span className="sr-only">Cargando el detalle de la cuenta…</span>
    </div>
  );
}
