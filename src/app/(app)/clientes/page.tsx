import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { getClientes, requireUser } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Cliente, ClienteEstado, Paginated } from "@/lib/api/types";
import { can } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Clientes",
};

const ESTADOS: ClienteEstado[] = ["prospecto", "activo", "inactivo"];

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const search = first(params.search).trim();
  const estadoParam = first(params.estado);
  const estado = ESTADOS.includes(estadoParam as ClienteEstado)
    ? (estadoParam as ClienteEstado)
    : "";
  const parsedPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let result: Paginated<Cliente>;

  try {
    result = await getClientes({ search, estado, page });
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader title="Clientes" />
        <ErrorState
          message={apiErrorMessage(error)}
          action={<RetryButton />}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Directorio comercial: prospectos, clientes activos y cuentas inactivas."
      />

      <ClientesTable
        clientes={result.data}
        meta={result.meta}
        query={{ search, estado, page }}
        canDelete={can(user, "clientes.eliminar")}
      />
    </>
  );
}
