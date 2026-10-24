import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { ServiciosTable } from "@/components/servicios/servicios-table";
import { getServicios, requireUser } from "@/lib/api/server";
import { errorMessage, isApiError } from "@/lib/api/types";
import type { Paginated, Servicio } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Servicios",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function triState(value: string): "" | "activo" | "inactivo" {
  if (value === "1") return "activo";
  if (value === "0") return "inactivo";

  return "";
}

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const search = first(params.search).trim();
  const activo = triState(first(params.activo));
  const visible = triState(first(params.visible_catalogo));
  const parsedPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let result: Paginated<Servicio>;

  try {
    result = await getServicios({
      search,
      activo: activo === "" ? "" : activo === "activo",
      visible_catalogo: visible === "" ? "" : visible === "activo",
      page,
    });
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader title="Servicios" />
        <ErrorState
          message={errorMessage(error)}
          action={<RetryButton />}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Servicios"
        description="Catálogo interno de servicios, precios base y visibilidad en el portal del cliente."
      />

      <ServiciosTable
        servicios={result.data}
        meta={result.meta}
        query={{ search, activo, visible, page }}
        canDelete={user.rol === "admin"}
        canManage={user.rol === "admin"}
      />
    </>
  );
}
