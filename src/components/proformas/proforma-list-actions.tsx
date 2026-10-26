"use client";

import Link from "next/link";
import {
  Check,
  ClipboardList,
  Eye,
  FileDown,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@heroui/react";
import { proformaPdfUrl } from "@/lib/api/client";
import type { Proforma } from "@/lib/api/types";
import type { AccionProforma } from "@/lib/proformas";
import { cn } from "@/lib/utils";

export type ProformaActionRequest = Extract<
  AccionProforma,
  "enviar" | "aceptar" | "rechazar" | "eliminar"
>;

interface ProformaListActionsProps {
  proforma: Proforma;
  acciones: ReadonlySet<AccionProforma>;
  /** "icons" para la tabla densa; "labels" para las cards móviles. */
  display: "icons" | "labels";
  onRequestAction: (accion: ProformaActionRequest) => void;
}

const ICON_LINK = cn(
  "grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-200",
  "hover:bg-surface-secondary hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
);

const LABEL_LINK = cn(
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-foreground transition-colors duration-200",
  "hover:bg-surface-secondary",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
);

const ICON_BUTTON = "size-9 text-muted";

export function ProformaListActions({
  proforma,
  acciones,
  display,
  onRequestAction,
}: ProformaListActionsProps) {
  const icon = display === "icons";
  const numero = proforma.numero;
  const href = `/proformas/${proforma.id}`;
  const editHref = `/proformas/${proforma.id}/editar`;

  function actionButton(
    action: ProformaActionRequest,
    label: string,
    Icon: typeof Send,
    danger = false,
  ) {
    return (
      <Button
        key={action}
        variant="ghost"
        size="sm"
        isIconOnly={icon}
        className={cn(
          icon ? ICON_BUTTON : "h-9 text-foreground",
          danger && "text-danger",
        )}
        aria-label={`${label} ${numero}`}
        onPress={() => onRequestAction(action)}
      >
        <Icon aria-hidden className="size-4" />
        {icon ? <span className="sr-only">{label}</span> : label}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center",
        icon ? "justify-end gap-0.5" : "flex-wrap gap-1",
      )}
    >
      {acciones.has("ver") ? (
        <Link
          href={href}
          className={icon ? ICON_LINK : LABEL_LINK}
          aria-label={`Ver proforma ${numero}`}
        >
          <Eye aria-hidden className="size-4" />
          {icon ? <span className="sr-only">Ver</span> : "Ver"}
        </Link>
      ) : null}

      {acciones.has("editar") ? (
        <Link
          href={editHref}
          className={icon ? ICON_LINK : LABEL_LINK}
          aria-label={`Editar proforma ${numero}`}
        >
          <Pencil aria-hidden className="size-4" />
          {icon ? <span className="sr-only">Editar</span> : "Editar"}
        </Link>
      ) : null}

      {acciones.has("enviar")
        ? actionButton("enviar", "Enviar", Send)
        : null}

      {acciones.has("aceptar")
        ? actionButton("aceptar", "Aceptar", Check)
        : null}

      {acciones.has("rechazar")
        ? actionButton("rechazar", "Rechazar", X, true)
        : null}

      {acciones.has("crear_orden") ? (
        <Link
          href={`/proformas/${proforma.id}?crear_orden=1`}
          className={icon ? ICON_LINK : LABEL_LINK}
          aria-label={`Crear orden desde la proforma ${numero}`}
        >
          <ClipboardList aria-hidden className="size-4" />
          {icon ? (
            <span className="sr-only">Crear orden</span>
          ) : (
            "Crear orden"
          )}
        </Link>
      ) : null}

      {acciones.has("pdf") ? (
        <a
          href={proformaPdfUrl(proforma.id)}
          target="_blank"
          rel="noopener noreferrer"
          className={icon ? ICON_LINK : LABEL_LINK}
          aria-label={`Abrir PDF de la proforma ${numero} en una pestaña nueva`}
        >
          <FileDown aria-hidden className="size-4" />
          {icon ? <span className="sr-only">PDF</span> : "PDF"}
        </a>
      ) : null}

      {acciones.has("eliminar")
        ? actionButton("eliminar", "Eliminar", Trash2, true)
        : null}
    </div>
  );
}
