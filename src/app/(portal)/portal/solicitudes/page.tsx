import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { ErrorState } from "@/components/ui/feedback";
import { NavTabs } from "@/components/ui/nav-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { PortalSolicitudesTable } from "@/components/portal/portal-solicitudes-table";
import { getPortalSolicitudes, requireCliente } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import { parseFilasPorPagina } from "@/lib/paginacion";
import { SOLICITUD_FILTROS, parseFiltro, portalListHref, solicitarHref } from "@/lib/portal";

export const metadata: Metadata = {
  title: "Mis solicitudes",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function PortalSolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCliente();
  const params = await searchParams;
  const filtro = parseFiltro(SOLICITUD_FILTROS, first(params.filtro));
  const parsedPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const perPage = parseFilasPorPagina(first(params.per_page));

  const header = (
    <PageHeader
      title="Mis solicitudes"
      description="Las cotizaciones que pediste y su estado."
      wrap
      actions={
        <Link
          href={solicitarHref()}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Plus aria-hidden className="size-4" />
          Solicitar cotización
        </Link>
      }
    />
  );

  let result;

  try {
    result = await getPortalSolicitudes({ estado: filtro.estado, page, perPage });
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        {header}
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      <NavTabs
        label="Filtrar solicitudes por estado"
        current={filtro.key}
        tabs={SOLICITUD_FILTROS.map((f) => ({
          key: f.key,
          label: f.label,
          href: portalListHref("/portal/solicitudes", { filtro: f.key }),
        }))}
      />

      <PortalSolicitudesTable
        solicitudes={result.data}
        meta={result.meta}
        filtro={filtro.key}
        perPage={perPage}
      />
    </div>
  );
}
