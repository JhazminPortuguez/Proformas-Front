import type { ReactNode } from "react";
import { Chip } from "@heroui/react";
import type { ClienteEstado, Rol } from "@/lib/api/types";
import { ROLE_LABELS } from "@/lib/roles";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

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

export function RolChip({ rol }: { rol: Rol }) {
  const tone: Tone =
    rol === "admin" ? "accent" : rol === "operario" ? "neutral" : "success";

  return <StatusChip tone={tone}>{ROLE_LABELS[rol]}</StatusChip>;
}
