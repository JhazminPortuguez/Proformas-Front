import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { NavTabs } from "@/components/ui/nav-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { OrdenesFiltros } from "@/components/ordenes/ordenes-filtros";
import { OrdenesTable } from "@/components/ordenes/ordenes-table";
import { OrdenesBoard } from "@/components/ordenes/ordenes-board";
import { OrdenesVista } from "@/components/ordenes/ordenes-vista";
import {
  getClientes,
  getOrdenes,
  getUsuarios,
  requireUser,
} from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  Cliente,
  EstadoOrden,
  Orden,
  Paginated,
  User,
} from "@/lib/api/types";
import { parseOrdenEstado } from "@/lib/estados";
import {
  ordenesPestanas,
  type AccionesOrdenOpciones,
  type OrdenesQuery,
  type VistaOrdenes,
} from "@/lib/ordenes";
import { can } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Órdenes de servicio",
};

const PER_PAGE = 15;

const ACTION_LINK =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function positiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Los operarios solo se listan para admin; un fallo no rompe el listado. */
async function cargarOperarios(user: User): Promise<User[]> {
  if (!can(user, "usuarios.ver")) return [];

  try {
    const page = await getUsuarios({
      rol: "operario",
      activo: true,
      perPage: 100,
    });

    return page.data;
  } catch {
    return [];
  }
}

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const page = positiveInt(first(params.page)) ?? 1;
  const search = first(params.search).trim();
  const estado: EstadoOrden | "" =
    parseOrdenEstado(first(params.estado)) ?? "";
  const operarioId = positiveInt(first(params.operario_id));
  const clienteId = positiveInt(first(params.cliente_id));
  const vista: VistaOrdenes =
    first(params.vista) === "tablero" ? "tablero" : "tabla";

  const query: OrdenesQuery = {
    search,
    estado,
    operarioId: operarioId ?? "",
    clienteId: clienteId ?? "",
    vista,
    page,
  };

  const permisos: AccionesOrdenOpciones = {
    canAssign: can(user, "ordenes.asignar"),
    canCancel: can(user, "ordenes.cancelar"),
    canClose: can(user, "ordenes.cerrar"),
  };

  let ordenes: Paginated<Orden>;
  let operarios: User[] = [];
  let clientes: Cliente[] = [];

  try {
    const [listado, clientesPage, operariosLista] = await Promise.all([
      getOrdenes({
        search,
        estado,
        operarioId: operarioId ?? "",
        clienteId: clienteId ?? "",
        page,
        perPage: PER_PAGE,
      }),
      getClientes({ perPage: 100 }),
      cargarOperarios(user),
    ]);

    ordenes = listado;
    clientes = clientesPage.data;
    operarios = operariosLista;
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader title="Órdenes de servicio" />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Órdenes de servicio"
        description="Ejecución de los servicios vendidos: asignación de operarios, avance del trabajo y cierre administrativo."
        actions={
          <Link href="/proformas?estado=ACEPTADA" className={ACTION_LINK}>
            <FilePlus2 aria-hidden className="size-4" />
            Crear desde una proforma aceptada
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <OrdenesVista query={query} />
        <p className="numeric text-sm text-muted">
          {formatNumber(ordenes.meta.total)}{" "}
          {ordenes.meta.total === 1 ? "orden" : "órdenes"}
        </p>
      </div>

      <NavTabs
        label="Estados de las órdenes"
        current={estado || "todas"}
        tabs={ordenesPestanas(query)}
        className="mb-4"
      />

      <OrdenesFiltros
        query={query}
        clientes={clientes}
        operarios={operarios}
        mostrarOperario={operarios.length > 0}
        className="mb-4"
      />

      {vista === "tabla" ? (
        <OrdenesTable
          ordenes={ordenes.data}
          meta={ordenes.meta}
          query={query}
          operarios={operarios}
          permisos={permisos}
        />
      ) : (
        <OrdenesBoard
          ordenes={ordenes.data}
          meta={ordenes.meta}
          query={query}
          operarios={operarios}
          permisos={permisos}
        />
      )}
    </>
  );
}
