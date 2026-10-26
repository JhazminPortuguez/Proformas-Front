import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { NavTabs } from "@/components/ui/nav-tabs";
import { ProformasTable } from "@/components/proformas/proformas-table";
import { SolicitudesTable } from "@/components/proformas/solicitudes-table";
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
import { isValidDateOnly } from "@/lib/proformas";
import { can } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Proformas",
};

const ESTADOS: EstadoProforma[] = [
  "BORRADOR",
  "ENVIADA",
  "ACEPTADA",
  "RECHAZADA",
];

const PER_PAGE = 15;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function positiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
  const clienteId = positiveInt(first(params.cliente_id));
  const desdeParam = first(params.desde);
  const hastaParam = first(params.hasta);
  const desde = isValidDateOnly(desdeParam) ? desdeParam : "";
  const hasta = isValidDateOnly(hastaParam) ? hastaParam : "";

  let clientes: Cliente[];
  let proformas: Paginated<Proforma> | null = null;
  let solicitudes: Paginated<Solicitud> | null = null;

  try {
    const [clientesPage, listado] = await Promise.all([
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
        : getSolicitudes({ search, page, perPage: PER_PAGE }),
    ]);

    clientes = clientesPage.data;

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
        <PageHeader title="Proformas" />
        <NavTabs
          label="Secciones comerciales"
          current={tab}
          tabs={[
            {
              key: "proformas",
              label: "Proformas",
              href: "/proformas?tab=proformas",
            },
            {
              key: "solicitudes",
              label: "Solicitudes",
              href: "/proformas?tab=solicitudes",
            },
          ]}
          className="mb-6"
        />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Proformas"
        description="Emisión, envío y seguimiento comercial. Las solicitudes se convierten en proformas en borrador."
      />

      <NavTabs
        label="Secciones comerciales"
        current={tab}
        tabs={[
          {
            key: "proformas",
            label: "Proformas",
            href: "/proformas?tab=proformas",
          },
          {
            key: "solicitudes",
            label: "Solicitudes",
            href: "/proformas?tab=solicitudes",
          },
        ]}
        className="mb-6"
      />

      {tab === "proformas" && proformas ? (
        <ProformasTable
          proformas={proformas.data}
          meta={proformas.meta}
          query={{ search, estado, clienteId: clienteId ?? "", desde, hasta, page }}
          clientes={clientes}
          canDelete={can(user, "proformas.eliminar")}
        />
      ) : null}

      {tab === "solicitudes" && solicitudes ? (
        <SolicitudesTable
          solicitudes={solicitudes.data}
          meta={solicitudes.meta}
          clientes={clientes}
          search={search}
          canManage={can(user, "solicitudes.gestionar")}
        />
      ) : null}
    </>
  );
}
