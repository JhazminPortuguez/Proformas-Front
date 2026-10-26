import {
  Check,
  Clock,
  FileText,
  Lock,
  Package,
  Play,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Orden, OrdenEvento, TipoOrdenEvento } from "@/lib/api/types";
import {
  eventoFecha,
  eventoOrdenMeta,
  eventoOrdenTransicion,
  type OrdenEventoTone,
} from "@/lib/ordenes";
import { ordenEstadoMeta } from "@/lib/estados";
import { cn, formatDateTime } from "@/lib/utils";

const TONE: Record<OrdenEventoTone, { dot: string }> = {
  neutral: { dot: "bg-surface-secondary text-muted" },
  accent: { dot: "bg-accent-soft text-accent-soft-foreground" },
  success: { dot: "bg-success-soft text-success-soft-foreground" },
  danger: { dot: "bg-danger-soft text-danger-soft-foreground" },
};

const ICONS: Record<TipoOrdenEvento, LucideIcon> = {
  CREACION: FileText,
  ASIGNACION: UserPlus,
  INICIO: Play,
  FINALIZACION: Check,
  CANCELACION: X,
  CIERRE: Lock,
  CONSUMO: Package,
};

function ordenarEventos(eventos: readonly OrdenEvento[]): OrdenEvento[] {
  return [...eventos].sort((a, b) =>
    (eventoFecha(a) ?? "").localeCompare(eventoFecha(b) ?? ""),
  );
}

export function OrdenTimeline({ orden }: { orden: Orden }) {
  const eventos = ordenarEventos(orden.eventos ?? []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <p className="text-sm font-medium text-foreground">
          Estado actual: {ordenEstadoMeta(orden.estado).label}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {ordenEstadoMeta(orden.estado).description}
        </p>
      </div>

      {eventos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          Todavía no hay eventos registrados para esta orden.
        </p>
      ) : (
        <ol className="space-y-1" aria-label={`Historial de la orden ${orden.numero}`}>
          {eventos.map((evento) => {
            const meta = eventoOrdenMeta(evento.tipo);
            const Icon = ICONS[evento.tipo] ?? Clock;
            const fecha = eventoFecha(evento);
            const transicion = eventoOrdenTransicion(evento);

            return (
              <li
                key={evento.id}
                className="flex items-start gap-3 rounded-lg px-2 py-3"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                    TONE[meta.tone].dot,
                  )}
                >
                  <Icon className="size-3.5" />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {meta.label}
                    </p>
                    {transicion ? (
                      <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] text-muted">
                        {transicion}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted">
                    {fecha ? formatDateTime(fecha) : "Sin fecha registrada"}
                    {evento.usuario?.name ? ` · ${evento.usuario.name}` : ""}
                  </p>

                  {evento.descripcion ? (
                    <p className="mt-1 whitespace-pre-line text-sm text-muted">
                      {evento.descripcion}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
