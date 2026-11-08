import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ErrorState } from "@/components/ui/feedback";
import { NotFoundState } from "@/components/ui/not-found-state";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { SolicitudEstadoChip } from "@/components/ui/status-chip";
import { ProformaAsociada } from "@/components/portal/portal-solicitudes-table";
import { getPortalSolicitud, requireCliente } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import { formatDateTimeNumeric, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Solicitud",
};

const VOLVER =
  "inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export default async function PortalSolicitudPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCliente();
  const { id } = await params;
  const solicitudId = Number.parseInt(id, 10);

  if (!Number.isFinite(solicitudId) || solicitudId <= 0) notFound();

  const volver = (
    <Link href="/portal/solicitudes" className={VOLVER}>
      <ArrowLeft aria-hidden className="size-4" />
      Volver a mis solicitudes
    </Link>
  );

  let solicitud;

  try {
    solicitud = await getPortalSolicitud(solicitudId);
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader title="Solicitud" back={volver} />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  if (!solicitud) {
    return (
      <>
        <PageHeader title="Solicitud" back={volver} />
        <NotFoundState
          title="No encontramos esta solicitud"
          description="Puede que no exista o que no sea tuya."
          backHref="/portal/solicitudes"
          backLabel="Volver a mis solicitudes"
        />
      </>
    );
  }

  const items = solicitud.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Solicitud de cotización" back={volver} />

      <section
        aria-label="Datos de la solicitud"
        className="grid gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-3"
      >
        <div>
          <p className="text-xs text-muted">Enviada</p>
          <p className="numeric mt-1 text-sm text-foreground">
            {formatDateTimeNumeric(solicitud.fecha)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Estado</p>
          <div className="mt-1">
            <SolicitudEstadoChip estado={solicitud.estado} />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted">Proforma</p>
          <p className="mt-1 text-sm">
            <ProformaAsociada solicitud={solicitud} />
          </p>
        </div>
        <div className="sm:col-span-3">
          <p className="text-xs text-muted">Descripción</p>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground">
            {solicitud.descripcion}
          </p>
        </div>
      </section>

      <section aria-labelledby="items-titulo" className="space-y-3">
        <h2 id="items-titulo" className="text-sm font-semibold text-foreground">
          Ítems ({formatNumber(items.length)})
        </h2>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-foreground">{item.descripcion}</p>
                <p className="numeric text-sm text-muted">
                  {formatNumber(item.cantidad)} {item.unidad_medida ?? ""}
                </p>
              </div>
              {item.observaciones ? (
                <p className="mt-1 text-sm text-muted">{item.observaciones}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
