import { CircleCheck, CircleX, Clock, Send } from "lucide-react";
import type { Proforma } from "@/lib/api/types";
import { proformaEstadoMeta } from "@/lib/estados";
import { cn, formatDateOnly, formatDateTime } from "@/lib/utils";

interface HistoryEvent {
  key: string;
  title: string;
  description?: string | null;
  date?: string | null;
  dateOnly?: boolean;
  tone: "neutral" | "accent" | "success" | "danger";
}

const TONE: Record<
  HistoryEvent["tone"],
  { dot: string; icon: typeof Clock }
> = {
  neutral: { dot: "bg-surface-secondary text-muted", icon: Clock },
  accent: { dot: "bg-accent-soft text-accent-soft-foreground", icon: Send },
  success: {
    dot: "bg-success-soft text-success-soft-foreground",
    icon: CircleCheck,
  },
  danger: {
    dot: "bg-danger-soft text-danger-soft-foreground",
    icon: CircleX,
  },
};

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function ProformaHistory({ proforma }: { proforma: Proforma }) {
  const events: HistoryEvent[] = [];

  if (proforma.created_at) {
    events.push({
      key: "creada",
      title: "Proforma creada",
      date: proforma.created_at,
      dateOnly: isDateOnly(proforma.created_at),
      tone: "neutral",
    });
  }

  if (proforma.enviada_at) {
    events.push({
      key: "enviada",
      title: "Enviada al cliente",
      date: proforma.enviada_at,
      dateOnly: isDateOnly(proforma.enviada_at),
      tone: "accent",
    });
  }

  if (proforma.aceptada_at) {
    events.push({
      key: "aceptada",
      title: "Aceptada por el cliente",
      description: proforma.aceptador?.name
        ? `Registrada por ${proforma.aceptador.name}.`
        : null,
      date: proforma.aceptada_at,
      dateOnly: isDateOnly(proforma.aceptada_at),
      tone: "success",
    });
  }

  if (proforma.rechazada_at) {
    events.push({
      key: "rechazada",
      title: "Rechazada",
      description: proforma.motivo_rechazo
        ? `Motivo: ${proforma.motivo_rechazo}`
        : null,
      date: proforma.rechazada_at,
      dateOnly: isDateOnly(proforma.rechazada_at),
      tone: "danger",
    });
  }

  const meta = proformaEstadoMeta(proforma.estado);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <p className="text-sm font-medium text-foreground">
          Estado actual: {meta.label}
        </p>
        <p className="mt-0.5 text-sm text-muted">{meta.description}</p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          Todavía no hay eventos registrados de envío, aceptación ni rechazo.
        </p>
      ) : (
        <ol className="space-y-1">
          {events.map((event) => {
            const tone = TONE[event.tone];
            const Icon = tone.icon;

            return (
              <li
                key={event.key}
                className="flex items-start gap-3 rounded-lg px-2 py-3"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                    tone.dot,
                  )}
                >
                  <Icon className="size-3.5" />
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {event.title}
                  </p>
                  {event.date ? (
                    <p className="text-xs text-muted">
                      {event.dateOnly
                        ? formatDateOnly(event.date)
                        : formatDateTime(event.date)}
                    </p>
                  ) : null}
                  {event.description ? (
                    <p className="mt-1 whitespace-pre-line text-sm text-muted">
                      {event.description}
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
