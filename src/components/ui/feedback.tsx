import type { ReactNode } from "react";
import { Alert, EmptyState as HeroEmptyState, Skeleton } from "@heroui/react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <HeroEmptyState
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="grid size-11 place-items-center rounded-full bg-surface-secondary text-muted">
          {icon}
        </span>
      ) : null}

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>
        ) : null}
      </div>

      {action}
    </HeroEmptyState>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "No pudimos cargar la información",
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <Alert status="danger" className={cn("items-start", className)} role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
        {action ? <div className="mt-3">{action}</div> : null}
      </Alert.Content>
    </Alert>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-10 w-full rounded-xl" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
      <span className="sr-only">Cargando resultados…</span>
    </div>
  );
}

/** Placeholder para páginas que todavía no tienen datos que cargar. */
export function ContentPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded" />
        <Skeleton className="h-4 w-72 max-w-full rounded" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <span className="sr-only">Cargando la página…</span>
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-10 w-full rounded-lg sm:max-w-xs" />
        <Skeleton className="h-10 w-full rounded-lg sm:w-40" />
      </div>
      <TableSkeleton />
    </div>
  );
}
