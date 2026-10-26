import { Skeleton } from "@heroui/react";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56 rounded" />
        <Skeleton className="h-4 w-80 max-w-full rounded" />
      </div>

      <div className="grid overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-border p-4">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="mt-3 h-7 w-28 rounded" />
            <Skeleton className="mt-2 h-3 w-32 rounded" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
        <Skeleton className="h-16 rounded-lg md:col-span-2 lg:col-span-3" />
        <Skeleton className="h-16 rounded-lg lg:col-span-2" />
        <Skeleton className="h-16 rounded-lg lg:col-span-3" />
        <Skeleton className="h-16 rounded-lg lg:col-span-2" />
        <Skeleton className="h-16 rounded-lg lg:col-span-2" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>

      <span className="sr-only">Cargando cuentas por cobrar…</span>
    </div>
  );
}
