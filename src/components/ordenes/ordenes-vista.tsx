import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ordenesHref,
  type OrdenesQuery,
  type VistaOrdenes,
} from "@/lib/ordenes";

const BASE_ITEM =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

interface OrdenesVistaProps {
  query: OrdenesQuery;
  className?: string;
}

/**
 * Toggle Tabla / Tablero sin estado de cliente: cada vista es un enlace que
 * conserva los filtros en la URL.
 */
export function OrdenesVista({ query, className }: OrdenesVistaProps) {
  const vistas: { key: VistaOrdenes; label: string; icon: typeof List }[] = [
    { key: "tabla", label: "Tabla", icon: List },
    { key: "tablero", label: "Tablero", icon: LayoutGrid },
  ];

  return (
    <div
      role="group"
      aria-label="Formato del listado de órdenes"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5",
        className,
      )}
    >
      {vistas.map((vista) => {
        const active = query.vista === vista.key;
        const Icon = vista.icon;

        return (
          <Link
            key={vista.key}
            href={ordenesHref({ ...query, vista: vista.key, page: 1 })}
            aria-current={active ? "page" : undefined}
            className={cn(
              BASE_ITEM,
              active
                ? "bg-accent-soft text-accent-soft-foreground"
                : "text-muted hover:bg-surface-secondary hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {vista.label}
          </Link>
        );
      })}
    </div>
  );
}
