import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Contenido sobre el título (volver, breadcrumb corto, etc.). */
  back?: ReactNode;
  /** Permite que títulos largos (números de documento) usen varias líneas. */
  wrap?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  wrap = false,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {back ? <div className="mb-2">{back}</div> : null}

        <h1
          className={cn(
            "text-2xl font-semibold tracking-tight text-foreground",
            wrap ? "text-balance break-words" : "truncate",
          )}
        >
          {title}
        </h1>

        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
