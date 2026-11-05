import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Chip } from "@heroui/react";
import type { ClienteEstado, Orden, Rol } from "@/lib/api/types";
import {
  ordenEstadoMeta,
  proformaEstadoMeta,
  solicitudEstadoMeta,
  type EstadoTone,
} from "@/lib/estados";
import { ROLE_LABELS } from "@/lib/roles";

type Tone = EstadoTone;

const TONE_COLOR: Record<
  Tone,
  "default" | "accent" | "success" | "warning" | "danger"
> = {
  neutral: "default",
  accent: "accent",
  success: "success",
  warning: "warning",
  danger: "danger",
};

interface StatusChipProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

export function StatusChip({
  tone = "neutral",
  children,
  className,
}: StatusChipProps) {
  return (
    <Chip size="sm" variant="soft" color={TONE_COLOR[tone]} className={className}>
      <Chip.Label>{children}</Chip.Label>
    </Chip>
  );
}

const CLIENTE_ESTADO: Record<ClienteEstado, { label: string; tone: Tone }> = {
  prospecto: { label: "Prospecto", tone: "warning" },
  activo: { label: "Activo", tone: "success" },
  inactivo: { label: "Inactivo", tone: "neutral" },
};

export function ClienteEstadoChip({ estado }: { estado: ClienteEstado }) {
  const config = CLIENTE_ESTADO[estado] ?? CLIENTE_ESTADO.inactivo;

  return <StatusChip tone={config.tone}>{config.label}</StatusChip>;
}

export function ActivoChip({ activo }: { activo: boolean }) {
  return (
    <StatusChip tone={activo ? "success" : "neutral"}>
      {activo ? "Activo" : "Inactivo"}
    </StatusChip>
  );
}

export function CatalogoChip({ visible }: { visible: boolean }) {
  return (
    <StatusChip tone={visible ? "accent" : "neutral"}>
      {visible ? "En catálogo" : "Oculto"}
    </StatusChip>
  );
}

export function ProformaEstadoChip({ estado }: { estado: string }) {
  const meta = proformaEstadoMeta(estado);

  return <StatusChip tone={meta.tone}>{meta.label}</StatusChip>;
}

export function OrdenEstadoChip({ estado }: { estado: string }) {
  const meta = ordenEstadoMeta(estado);

  return <StatusChip tone={meta.tone}>{meta.label}</StatusChip>;
}

/**
 * Estado de la orden y, si ya se cerró (`cerrada_at`), el texto «Cerrada».
 * Cerrada no es un estado: la orden sigue Finalizada.
 */
export function OrdenEstadoConCierre({
  orden,
}: {
  orden: Pick<Orden, "estado" | "cerrada_at">;
}) {
  const cerrada = orden.estado === "FINALIZADA" && Boolean(orden.cerrada_at);

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <OrdenEstadoChip estado={orden.estado} />
      {cerrada ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted">
          <Lock aria-hidden className="size-3" />
          Cerrada
        </span>
      ) : null}
    </span>
  );
}

export function SolicitudEstadoChip({ estado }: { estado: string }) {
  const meta = solicitudEstadoMeta(estado);

  return <StatusChip tone={meta.tone}>{meta.label}</StatusChip>;
}

export function RolChip({ rol }: { rol: Rol }) {
  const tone: Tone =
    rol === "admin" ? "accent" : rol === "operario" ? "neutral" : "success";

  return <StatusChip tone={tone}>{ROLE_LABELS[rol]}</StatusChip>;
}
