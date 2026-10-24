import type { ReactNode } from "react";
import { Card, Skeleton } from "@heroui/react";
import { FileStack } from "lucide-react";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2.5 lg:hidden">
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
          <FileStack aria-hidden className="size-5" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Proformas
        </span>
      </div>

      <Card className="w-full">
        <Card.Header className="gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <Card.Description>{description}</Card.Description>
        </Card.Header>

        <Card.Content className="mt-2">{children}</Card.Content>

        {footer ? (
          <Card.Footer className="mt-4 flex-col items-start gap-1 border-t border-border pt-4 text-sm text-muted">
            {footer}
          </Card.Footer>
        ) : null}
      </Card>
    </div>
  );
}

export function AuthCardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex items-center gap-2.5 lg:hidden">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      <div className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-surface">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-3 w-56 rounded" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
