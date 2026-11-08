import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, Inbox, Plus, Wrench } from "lucide-react";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { ProformaEstadoChip, SolicitudEstadoChip } from "@/components/ui/status-chip";
import { getPortalResumen, requireCliente } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { PortalResumen } from "@/lib/api/types";
import { solicitarHref } from "@/lib/portal";
import { formatDateTimeNumeric, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mi portal",
};

const BOTON_PRIMARIO =
  "inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const TARJETA_LINK =
  "flex h-full flex-col gap-1 rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const ACCESOS = [
  {
    href: "/portal/servicios",
    titulo: "Catálogo de servicios",
    texto: "Mira los servicios, sus precios base y la duración estimada.",
    icono: Wrench,
  },
  {
    href: "/portal/proformas",
    titulo: "Mis proformas",
    texto: "Consulta las proformas que te enviamos y descarga el PDF.",
    icono: FileText,
  },
  {
    href: "/portal/solicitudes",
    titulo: "Mis solicitudes",
    texto: "Sigue el estado de las cotizaciones que pediste.",
    icono: Inbox,
  },
] as const;

function cantidades(resumen: PortalResumen) {
  return [
    { label: "Solicitudes pendientes", value: resumen.solicitudes.PENDIENTE ?? 0, href: "/portal/solicitudes?filtro=pendiente" },
    { label: "Solicitudes atendidas", value: resumen.solicitudes.ATENDIDA ?? 0, href: "/portal/solicitudes?filtro=atendida" },
    { label: "Proformas por revisar", value: resumen.proformas.ENVIADA ?? 0, href: "/portal/proformas?filtro=por-revisar" },
    { label: "Proformas aceptadas", value: resumen.proformas.ACEPTADA ?? 0, href: "/portal/proformas?filtro=aceptadas" },
    { label: "Proformas rechazadas", value: resumen.proformas.RECHAZADA ?? 0, href: "/portal/proformas?filtro=rechazadas" },
  ];
}

export default async function PortalPage() {
  const user = await requireCliente();
  const nombre = user.name.split(" ")[0];

  let resumen: PortalResumen | null = null;
  let error: unknown = null;

  try {
    resumen = await getPortalResumen();
  } catch (caught) {
    if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
      redirect("/login");
    }

    error = caught;
  }

  const ultimo = resumen?.ultimo ?? null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Mi portal</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Hola, {nombre}
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Pide cotizaciones y sigue tus solicitudes y proformas.
          </p>
        </div>
        <Link href={solicitarHref()} className={BOTON_PRIMARIO}>
          <Plus aria-hidden className="size-4" />
          Solicitar cotización
        </Link>
      </header>

      {error || !resumen ? (
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      ) : (
        <>
          <section
            aria-labelledby="ultimo-titulo"
            className="rounded-xl border border-border bg-surface p-5"
          >
            <h2 id="ultimo-titulo" className="text-sm font-semibold text-foreground">
              Lo último
            </h2>
            {ultimo ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs text-muted">
                    {ultimo.tipo === "proforma" ? "Proforma" : "Solicitud"} ·{" "}
                    <span className="numeric">{formatDateTimeNumeric(ultimo.fecha)}</span>
                  </p>
                  <Link
                    href={`/portal/${ultimo.tipo === "proforma" ? "proformas" : "solicitudes"}/${ultimo.id}`}
                    className="block truncate font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {ultimo.numero ?? ultimo.descripcion}
                  </Link>
                </div>
                {ultimo.tipo === "proforma" ? (
                  <ProformaEstadoChip estado={ultimo.estado} />
                ) : (
                  <SolicitudEstadoChip estado={ultimo.estado} />
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Todavía no tienes solicitudes ni proformas. Empieza pidiendo una cotización.
              </p>
            )}
          </section>

          <section aria-labelledby="resumen-titulo" className="space-y-3">
            <h2 id="resumen-titulo" className="text-sm font-semibold text-foreground">
              Resumen
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {cantidades(resumen).map((dato) => (
                <li key={dato.label}>
                  <Link href={dato.href} className={TARJETA_LINK}>
                    <span className="text-xs text-muted">{dato.label}</span>
                    <span className="numeric text-2xl font-semibold text-foreground">
                      {formatNumber(dato.value)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section aria-labelledby="accesos-titulo" className="space-y-3">
        <h2 id="accesos-titulo" className="text-sm font-semibold text-foreground">
          Accesos directos
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {ACCESOS.map(({ href, titulo, texto, icono: Icono }) => (
            <li key={href}>
              <Link href={href} className={`${TARJETA_LINK} gap-2`}>
                <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                  <Icono aria-hidden className="size-4" />
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  {titulo}
                  <ArrowRight aria-hidden className="size-3.5 text-muted" />
                </span>
                <span className="text-sm text-muted">{texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
