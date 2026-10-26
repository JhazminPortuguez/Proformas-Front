import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { NavTabs } from "@/components/ui/nav-tabs";
import { ClienteEstadoChip } from "@/components/ui/status-chip";
import { ClienteCobrosTab } from "@/components/clientes/cliente-cobros-tab";
import { ClienteEditarAction } from "@/components/clientes/cliente-editar-action";
import { ClienteOrdenesTab } from "@/components/clientes/cliente-ordenes-tab";
import { ClienteProformasTab } from "@/components/clientes/cliente-proformas-tab";
import { ClienteResumenCards, ClienteResumenTab } from "@/components/clientes/cliente-resumen";
import { ClienteServiciosTab } from "@/components/clientes/cliente-servicios-tab";
import {
  getCliente,
  getClienteResumen,
  getCuentasPorCobrar,
  getHistorialServicios,
  getOrdenes,
  getProformas,
  requireUser,
} from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  ClienteResumen,
  CuentaPorCobrar,
  HistorialServicio,
  Orden,
  Paginated,
  Proforma,
} from "@/lib/api/types";
import {
  clienteTabHref,
  contar,
  parseClienteTab,
  type ClienteTab,
} from "@/lib/clientes";
import { can } from "@/lib/permissions";

const PER_PAGE = 15;

const ACTION_LINK_GHOST =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

type ListadoTab =
  | { tab: "resumen" }
  | { tab: "proformas"; data: Paginated<Proforma> }
  | { tab: "ordenes"; data: Paginated<Orden> }
  | { tab: "cobros"; data: Paginated<CuentaPorCobrar> }
  | { tab: "servicios"; data: Paginated<HistorialServicio> };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function positiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Sólo se pide el listado de la pestaña activa; los conteos vienen del resumen. */
async function cargarListado(
  clienteId: number,
  tab: ClienteTab,
  page: number,
): Promise<ListadoTab> {
  switch (tab) {
    case "proformas":
      return {
        tab,
        data: await getProformas({ clienteId, page, perPage: PER_PAGE }),
      };
    case "ordenes":
      return {
        tab,
        data: await getOrdenes({ clienteId, page, perPage: PER_PAGE }),
      };
    case "cobros":
      return {
        tab,
        data: await getCuentasPorCobrar({ clienteId, page, perPage: PER_PAGE }),
      };
    case "servicios":
      return {
        tab,
        data: await getHistorialServicios({
          clienteId,
          page,
          perPage: PER_PAGE,
        }),
      };
    default:
      return { tab: "resumen" };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const clienteId = Number.parseInt(id, 10);

  if (!Number.isFinite(clienteId) || clienteId <= 0) {
    return { title: "Ficha de cliente" };
  }

  try {
    const cliente = await getCliente(clienteId);

    return { title: `${cliente.nombre_razon} · Clientes` };
  } catch {
    return { title: "Ficha de cliente" };
  }
}

export default async function ClienteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const clienteId = Number.parseInt(id, 10);

  if (!Number.isFinite(clienteId) || clienteId <= 0) {
    notFound();
  }

  const tab = parseClienteTab(first(query.tab));
  const page = positiveInt(first(query.page)) ?? 1;

  let resumen: ClienteResumen;
  let listado: ListadoTab;

  try {
    [resumen, listado] = await Promise.all([
      getClienteResumen(clienteId),
      cargarListado(clienteId, tab, page),
    ]);
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    if (isApiError(error) && error.status === 404) {
      notFound();
    }

    return (
      <>
        <PageHeader
          title="Ficha de cliente"
          back={
            <Link href="/clientes" className={ACTION_LINK_GHOST}>
              <ArrowLeft aria-hidden className="size-4" />
              Volver a clientes
            </Link>
          }
        />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  const cliente = resumen.cliente;
  const puedeEditar = can(user, "clientes.editar");

  return (
    <>
      <PageHeader
        wrap
        title={cliente.nombre_razon}
        description={`${
          cliente.nit_ci ? `NIT / CI ${cliente.nit_ci}` : "Sin NIT / CI registrado"
        } · ${contar(resumen.proformas.total, "proforma", "proformas")} · ${contar(
          resumen.ordenes.total,
          "orden",
          "órdenes",
        )}`}
        back={
          <Link href="/clientes" className={ACTION_LINK_GHOST}>
            <ArrowLeft aria-hidden className="size-4" />
            Volver a clientes
          </Link>
        }
        actions={
          puedeEditar ? <ClienteEditarAction cliente={cliente} /> : null
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <ClienteEstadoChip estado={cliente.estado} />

        <span className="inline-flex items-center gap-1.5">
          <Phone aria-hidden className="size-4 shrink-0 text-muted" />
          {cliente.telefono ? (
            <a
              href={`tel:${cliente.telefono}`}
              className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {cliente.telefono}
            </a>
          ) : (
            <span className="text-muted">Sin teléfono</span>
          )}
        </span>

        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Mail aria-hidden className="size-4 shrink-0 text-muted" />
          {cliente.email ? (
            <a
              href={`mailto:${cliente.email}`}
              className="break-all underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {cliente.email}
            </a>
          ) : (
            <span className="text-muted">Sin correo</span>
          )}
        </span>

        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin aria-hidden className="size-4 shrink-0 text-muted" />
          {cliente.direccion ? (
            <span className="break-words">{cliente.direccion}</span>
          ) : (
            <span className="text-muted">Sin dirección</span>
          )}
        </span>
      </div>

      <ClienteResumenCards resumen={resumen} clienteId={cliente.id} />

      <NavTabs
        label="Secciones del cliente"
        current={tab}
        tabs={[
          {
            key: "resumen",
            label: "Resumen",
            href: clienteTabHref(cliente.id, "resumen"),
          },
          {
            key: "proformas",
            label: "Proformas",
            href: clienteTabHref(cliente.id, "proformas"),
            count: resumen.proformas.total,
          },
          {
            key: "ordenes",
            label: "Órdenes",
            href: clienteTabHref(cliente.id, "ordenes"),
            count: resumen.ordenes.total,
          },
          {
            key: "cobros",
            label: "Cobros",
            href: clienteTabHref(cliente.id, "cobros"),
            count: resumen.cobros.cuentas,
          },
          {
            key: "servicios",
            label: "Servicios",
            href: clienteTabHref(cliente.id, "servicios"),
            count: resumen.servicios.realizados,
          },
        ]}
        className="mb-6"
      />

      {tab === "resumen" ? (
        <ClienteResumenTab cliente={cliente} resumen={resumen} />
      ) : null}

      {listado.tab === "proformas" ? (
        <ClienteProformasTab
          clienteId={cliente.id}
          proformas={listado.data.data}
          meta={listado.data.meta}
        />
      ) : null}

      {listado.tab === "ordenes" ? (
        <ClienteOrdenesTab
          clienteId={cliente.id}
          ordenes={listado.data.data}
          meta={listado.data.meta}
        />
      ) : null}

      {listado.tab === "cobros" ? (
        <ClienteCobrosTab
          clienteId={cliente.id}
          cuentas={listado.data.data}
          meta={listado.data.meta}
        />
      ) : null}

      {listado.tab === "servicios" ? (
        <ClienteServiciosTab
          clienteId={cliente.id}
          servicios={listado.data.data}
          meta={listado.data.meta}
        />
      ) : null}
    </>
  );
}
