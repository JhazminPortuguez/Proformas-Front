import Link from "next/link";
import { cn, formatNumber } from "@/lib/utils";

export interface NavTab {
  key: string;
  label: string;
  href: string;
  count?: number;
}

interface NavTabsProps {
  label: string;
  tabs: readonly NavTab[];
  current: string;
  className?: string;
}

/**
 * Tabs de navegación server-side. El estado vive en la URL (`?tab=`), así que
 * cada pestaña es un enlace real: funciona sin JS, conserva el historial y no
 * necesita `useSearchParams` en el cliente.
 */
export function NavTabs({ label, tabs, current, className }: NavTabsProps) {
  return (
    <nav
      aria-label={label}
      className={cn("border-b border-border", className)}
    >
      <ul className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.key === current;

          return (
            <li key={tab.key} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                  active
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted hover:border-border hover:text-foreground",
                )}
              >
                {tab.label}
                {typeof tab.count === "number" ? (
                  <span className="numeric rounded-full bg-surface-secondary px-1.5 py-0.5 text-[11px] text-muted">
                    {formatNumber(tab.count)}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
