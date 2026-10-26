import Link from "next/link";
import type { ReactNode } from "react";

/** Enlace de número de documento dentro de tablas y tarjetas. */
export const CLIENTE_LINK =
  "font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const EMPTY_ACTION =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/** Acción de un estado vacío de pestaña (siempre un enlace real). */
export function ClienteEmptyAction({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={EMPTY_ACTION}>
      {children}
    </Link>
  );
}
