"use client";

import { cloneElement, type ReactElement, type ReactNode } from "react";
import { Tooltip } from "@heroui/react";

/**
 * Texto corto al pasar el mouse (o al enfocar con teclado) sobre un icono de
 * acción. React Aria no abre tooltips con toque, así que en el celular no
 * estorba. El nombre accesible sigue siendo el `aria-label` del icono.
 */
const DELAY_MS = 400;

interface ActionTooltipProps {
  label: string;
  /** Un `Button` de HeroUI: hace de disparador por sí mismo. */
  children: ReactElement;
}

export function ActionTooltip({ label, children }: ActionTooltipProps) {
  return (
    <Tooltip delay={DELAY_MS} closeDelay={0}>
      {children}
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

interface LinkTooltipProps {
  label: string;
  /** Un `<a>` o `next/link`; el propio enlace es el disparador. */
  children: ReactElement<{ className?: string; children?: ReactNode }>;
}

export function LinkTooltip({ label, children }: LinkTooltipProps) {
  return (
    <Tooltip delay={DELAY_MS} closeDelay={0}>
      <Tooltip.Trigger
        className={children.props.className}
        // El disparador se dibuja como el enlace: sin un div extra ni otra
        // parada de tabulación, y conserva su rol de enlace. Las props del
        // disparador traen `children` vacío: se mantiene el contenido del
        // enlace (su icono).
        render={(props) =>
          cloneElement(children as ReactElement<Record<string, unknown>>, {
            ...props,
            role: undefined,
            children: children.props.children,
          })
        }
      />
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}
