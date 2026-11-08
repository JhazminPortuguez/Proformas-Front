import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ErrorState } from "@/components/ui/feedback";
import { NavTabs } from "@/components/ui/nav-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { ContactoEmpresa } from "@/components/portal/contacto-empresa";
import { PortalProformasTable } from "@/components/portal/portal-proformas-table";
import { getPortalEmpresa, getPortalProformas, requireCliente } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import { parseFilasPorPagina } from "@/lib/paginacion";
import { PROFORMA_FILTROS, parseFiltro, portalListHref } from "@/lib/portal";

export const metadata: Metadata = {
  title: "Mis proformas",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function PortalProformasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCliente();
  const params = await searchParams;
  const filtro = parseFiltro(PROFORMA_FILTROS, first(params.filtro));
  const parsedPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const perPage = parseFilasPorPagina(first(params.per_page));

  const header = (
    <PageHeader
      title="Mis proformas"
      description="Las proformas que te enviamos. Puedes ver el detalle y descargar el PDF."
      wrap
    />
  );

  let datos;

  try {
    datos = await Promise.all([
      getPortalProformas({ estado: filtro.estado, page, perPage }),
      getPortalEmpresa(),
    ]);
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

  const [{ data: proformas, meta }, empresa] = datos;
  const hayPorRevisar = proformas.some((proforma) => proforma.estado === "ENVIADA");

  return (
    <div className="flex flex-col gap-6">
      {header}

      <NavTabs
        label="Filtrar proformas por estado"
        current={filtro.key}
        tabs={PROFORMA_FILTROS.map((f) => ({
          key: f.key,
          label: f.label,
          href: portalListHref("/portal/proformas", { filtro: f.key }),
        }))}
      />

      {hayPorRevisar ? <ContactoEmpresa empresa={empresa} /> : null}

      <PortalProformasTable
        proformas={proformas}
        meta={meta}
        filtro={filtro.key}
        perPage={perPage}
      />
    </div>
  );
}
