"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { findNavItem } from "./nav";

export function Breadcrumbs() {
  const pathname = usePathname();
  const match = findNavItem(pathname);

  const current = match?.item.label ?? "Inicio";
  const group = match?.group ?? null;

  return (
    <nav aria-label="Ruta de navegación" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        <li className="hidden shrink-0 sm:block">
          <Link
            href="/dashboard"
            className="rounded text-muted transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Inicio
          </Link>
        </li>

        {group ? (
          <>
            <li aria-hidden className="hidden text-muted/60 sm:block">
              <ChevronRight className="size-3.5" />
            </li>
            <li className="hidden shrink-0 text-muted sm:block">{group}</li>
          </>
        ) : null}

        <li aria-hidden className="hidden text-muted/60 sm:block">
          <ChevronRight className="size-3.5" />
        </li>

        <li className="min-w-0">
          <span
            aria-current="page"
            className="block truncate font-medium text-foreground"
          >
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
