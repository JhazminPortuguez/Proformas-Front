import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Search, Wrench } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { getPortalServicios, requireCliente } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Paginated, PortalServicio } from "@/lib/api/types";
import { formatDuracion, solicitarHref } from "@/lib/portal";
import { buildQuery, formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Catálogo de servicios",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const PAGINA_LINK =
  "inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export default async function PortalServiciosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCliente();
  const params = await searchParams;
  const search = first(params.search).trim();
  const parsedPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let result: Paginated<PortalServicio>;

  try {
    result = await getPortalServicios({ search, page });
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader title="Catálogo de servicios" />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  const { data: servicios, meta } = result;
  const href = (destino: number) =>
    `/portal/servicios${buildQuery({ search, page: destino > 1 ? destino : undefined })}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo de servicios"
        description="Elige un servicio y pide tu cotización. Los precios son referenciales: el precio final va en la proforma."
        wrap
      />

      <form role="search" action="/portal/servicios" className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex w-full flex-col gap-1 sm:max-w-sm">
          <label htmlFor="buscar-servicio" className="text-sm font-medium text-foreground">
            Buscar
          </label>
          <input
            id="buscar-servicio"
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Nombre o categoría…"
            className="h-10 w-full rounded-lg border border-border bg-field-background px-3 text-sm text-field-foreground placeholder:text-field-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
        </div>
        <button type="submit" className={`${PAGINA_LINK} h-10 gap-2`}>
          <Search aria-hidden className="size-4" />
          Buscar
        </button>
      </form>

      {servicios.length === 0 ? (
        <EmptyState
          title={search ? "Sin coincidencias" : "Todavía no hay servicios en el catálogo"}
          description={
            search
              ? `No encontramos servicios para "${search}".`
              : "Igual puedes pedir una cotización describiendo lo que necesitas."
          }
          icon={<Wrench aria-hidden className="size-5" />}
          action={
            <Link href={search ? "/portal/servicios" : solicitarHref()} className={PAGINA_LINK}>
              {search ? "Ver todo el catálogo" : "Solicitar cotización"}
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Servicios">
          {servicios.map((servicio) => (
            <li
              key={servicio.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <div className="space-y-1">
                {servicio.categoria ? (
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {servicio.categoria}
                  </p>
                ) : null}
                <h2 className="text-base font-semibold text-foreground">{servicio.nombre}</h2>
                {servicio.descripcion ? (
                  <p className="text-sm text-muted">{servicio.descripcion}</p>
                ) : null}
              </div>

              <dl className="mt-auto grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Precio base</dt>
                  <dd className="numeric font-medium text-foreground">
                    {formatMoney(servicio.precio_base)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Duración estimada</dt>
                  <dd className="flex items-center gap-1 text-foreground">
                    <Clock aria-hidden className="size-3.5 text-muted" />
                    {formatDuracion(servicio.duracion_estimada_min)}
                  </dd>
                </div>
              </dl>

              <Link
                href={solicitarHref(servicio.id)}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                aria-label={`Solicitar este servicio: ${servicio.nombre}`}
              >
                Solicitar este servicio
              </Link>
            </li>
          ))}
        </ul>
      )}

      {meta.last_page > 1 ? (
        <nav aria-label="Páginas del catálogo" className="flex items-center justify-between gap-3">
          {meta.current_page > 1 ? (
            <Link href={href(meta.current_page - 1)} className={PAGINA_LINK}>
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Página {meta.current_page} de {meta.last_page}
          </span>
          {meta.current_page < meta.last_page ? (
            <Link href={href(meta.current_page + 1)} className={PAGINA_LINK}>
              Siguiente
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
