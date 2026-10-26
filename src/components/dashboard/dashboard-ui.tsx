import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { EstadoTone } from "@/lib/estados";
import type { DashboardKpi } from "@/lib/dashboard";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const TONE_SURFACE: Record<EstadoTone, string> = {
  neutral: "bg-surface-secondary text-muted",
  accent: "bg-accent-soft text-accent-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
};

const TONE_BAR: Record<EstadoTone, string> = {
  neutral: "bg-muted",
  accent: "bg-accent",
  success: "bg-success-soft-foreground",
  warning: "bg-warning-soft-foreground",
  danger: "bg-danger-soft-foreground",
};

export function toneSurface(tone: EstadoTone): string {
  return TONE_SURFACE[tone];
}

export function toneBar(tone: EstadoTone): string {
  return TONE_BAR[tone];
}

/** Valor de un KPI formateado según su unidad (moneda o conteo). */
export function metricValue(kpi: DashboardKpi): string {
  return kpi.money ? formatMoney(kpi.value) : formatNumber(kpi.value);
}

interface SectionIntroProps {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Encabezado de sección: `id` alimenta el `aria-labelledby` del `<section>`. */
export function SectionIntro({
  id,
  title,
  description,
  action,
}: SectionIntroProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

interface ActionLinkProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
  icon?: ReactNode;
}

/**
 * Enlaces de navegación con apariencia de acción. No son `Button`: la acción
 * siempre navega, así que la semántica correcta es un enlace.
 */
export function ActionLink({
  href,
  children,
  variant = "secondary",
  icon,
}: ActionLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors duration-200",
        FOCUS_RING,
        variant === "primary" &&
          "bg-accent text-accent-foreground hover:bg-accent-hover",
        variant === "secondary" &&
          "border border-border bg-surface text-foreground hover:bg-surface-secondary",
        variant === "quiet" &&
          "h-8 px-2 text-xs text-accent-soft-foreground hover:bg-surface-secondary",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

interface QuietLinkProps {
  href: string;
  children: ReactNode;
}

/** Enlace compacto "Ver…" con flecha, para encabezados de tarjeta. */
export function QuietLink({ href, children }: QuietLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-accent-soft-foreground transition-colors duration-200 hover:bg-surface-secondary",
        FOCUS_RING,
      )}
    >
      {children}
      <ArrowUpRight aria-hidden className="size-3.5" />
    </Link>
  );
}

/** Mensaje vacío compacto para el interior de una tarjeta. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
      {children}
    </p>
  );
}
