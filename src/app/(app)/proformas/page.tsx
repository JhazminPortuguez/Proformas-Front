import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { NavTabs, type NavTab } from "@/components/ui/nav-tabs";
import { ProformasTable } from "@/components/proformas/proformas-table";
import {
  SolicitudesTable,
  type SolicitudFiltroEstado,
} from "@/components/proformas/solicitudes-table";
import {
  getClientes,
  getProformas,
  getSolicitudes,
  requireUser,
} from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  Cliente,
  EstadoProforma,
  Paginated,
  Proforma,
  Solicitud,
} from "@/lib/api/types";
import { isValidDateOnly, todayDateOnly } from "@/lib/proformas";
import { can } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Proformas y Solicitudes",
};

const TITULO = "Proformas y Solicitudes";

const ESTADOS: EstadoProforma[] = [
  "BORRADOR",
  "ENVIADA",
  "ACEPTADA",
  "RECHAZADA",
];

const ESTADOS_SOLICITUD: SolicitudFiltroEstado[] = ["PENDIENTE", "ATENDIDA"];

const PER_PAGE = 15;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function positiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Contadores de las pestañas: total de proformas y solicitudes pendientes,
 * leídos de `meta.total` de los listados existentes. Si fallan, la pestaña
 * se muestra sin contador en vez de romper la pantalla.
 */
async function contarPestanas(): Promise<{
  proformas?: number;
  solicitudes?: number;
}> {
  const [proformas, solicitudes] = await Promise.allSettled([
    getProformas({ perPage: 1 }),
    getSolicitudes({ estado: "PENDIENTE", perPage: 1 }),
  ]);

  return {
    proformas:
      proformas.status === "fulfilled" ? proformas.value.meta.total : undefined,
    solicitudes:
      solicitudes.status === "fulfilled"
        ? solicitudes.value.meta.total
        : undefined,
  };
}

function pestanas(counts: {
  proformas?: number;
  solicitudes?: number;
}): NavTab[] {
  return [
    {
      key: "proformas",
      label: "Proformas",
      href: "/proformas?tab=proformas",
      count: counts.proformas,
    },
    {
      key: "solicitudes",
      label: "Solicitudes",
      href: "/proformas?tab=solicitudes",
      count: counts.solicitudes,
    },
  ];
}

export default async function ProformasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const tab = first(params.tab) === "solicitudes" ? "solicitudes" : "proformas";
  const page = positiveInt(first(params.page)) ?? 1;

  const search = first(params.search).trim();
  const estadoParam = first(params.estado);
  const estado = ESTADOS.includes(estadoParam as EstadoProforma)
    ? (estadoParam as EstadoProforma)
    : "";
  const estadoSolicitud = ESTADOS_SOLICITUD.includes(
    estadoParam as SolicitudFiltroEstado,
  )
    ? (estadoParam as SolicitudFiltroEstado)
    : "";
  const clienteId = positiveInt(first(params.cliente_id));
  const desdeParam = first(params.desde);
  const hastaParam = first(params.hasta);
  const desde = isValidDateOnly(desdeParam) ? desdeParam : "";
  const hasta = isValidDateOnly(hastaParam) ? hastaParam : "";

  let clientes: Cliente[];
  let proformas: Paginated<Proforma> | null = null;
  let solicitudes: Paginated<Solicitud> | null = null;
  let counts: { proformas?: number; solicitudes?: number };

  try {
    const [clientesPage, listado, conteos] = await Promise.all([
      getClientes({ perPage: 100 }),
      tab === "proformas"
        ? getProformas({
            search,
            estado,
            clienteId: clienteId ?? "",
            desde,
            hasta,
            page,
            perPage: PER_PAGE,
          })
        : getSolicitudes({
            search,
            estado: estadoSolicitud,
            page,
            perPage: PER_PAGE,
          }),
      contarPestanas(),
    ]);

    clientes = clientesPage.data;
    counts = conteos;

    if (tab === "proformas") {
      proformas = listado as Paginated<Proforma>;
    } else {
      solicitudes = listado as Paginated<Solicitud>;
    }
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader title={TITULO} />
        <NavTabs
          label="Secciones comerciales"
          current={tab}
          tabs={pestanas({})}
          className="mb-6"
        />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={TITULO}
        description="Emisión, envío y seguimiento comercial. Las solicitudes se convierten en proformas en borrador."
      />

      <NavTabs
        label="Secciones comerciales"
        current={tab}
        tabs={pestanas(counts)}
        className="mb-6"
      />

      {tab === "proformas" && proformas ? (
        <ProformasTable
          proformas={proformas.data}
          meta={proformas.meta}
          query={{ search, estado, clienteId: clienteId ?? "", desde, hasta, page }}
          clientes={clientes}
          canDelete={can(user, "proformas.eliminar")}
          hoy={todayDateOnly()}
        />
      ) : null}

      {tab === "solicitudes" && solicitudes ? (
        <SolicitudesTable
          solicitudes={solicitudes.data}
          meta={solicitudes.meta}
          clientes={clientes}
          search={search}
          estado={estadoSolicitud}
          canManage={can(user, "solicitudes.gestionar")}
        />
      ) : null}
    </>
  );
}
