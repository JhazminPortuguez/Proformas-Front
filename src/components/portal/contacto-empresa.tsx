import { Mail, Phone } from "lucide-react";
import type { PortalEmpresa } from "@/lib/api/types";
import { telHref } from "@/lib/portal";
import { cn } from "@/lib/utils";

const ENLACE =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Datos de contacto reales de la empresa (tabla `empresas`). El portal no
 * acepta ni rechaza proformas: el cliente se comunica con la empresa.
 */
export function ContactoEmpresa({
  empresa,
  className,
}: {
  empresa: PortalEmpresa;
  className?: string;
}) {
  const { telefono, email } = empresa;

  return (
    <aside
      aria-label="Contacto de la empresa"
      className={cn("rounded-xl border border-border bg-surface-secondary/50 p-4", className)}
    >
      <p className="text-sm font-medium text-foreground">
        Para aceptar esta proforma, comunícate con nosotros
      </p>
      {empresa.nombre ? <p className="mt-0.5 text-xs text-muted">{empresa.nombre}</p> : null}

      {telefono || email ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {telefono ? (
            <a href={telHref(telefono)} className={ENLACE}>
              <Phone aria-hidden className="size-4" />
              <span>
                Llamar <span className="numeric">{telefono}</span>
              </span>
            </a>
          ) : null}
          {email ? (
            <a href={`mailto:${email}`} className={ENLACE}>
              <Mail aria-hidden className="size-4" />
              <span className="break-all">{email}</span>
            </a>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          La empresa todavía no registró un teléfono ni un correo de contacto.
        </p>
      )}
    </aside>
  );
}
