import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { PromocionesTable } from "@/components/promociones/promociones-table";
import { getProductos, getPromociones, getServicios, requireUser } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { EstadoPromocion, Paginated, Producto, Promocion, Servicio } from "@/lib/api/types";
import { parseFilasPorPagina } from "@/lib/paginacion";
import { ESTADO_PROMOCION } from "@/lib/promociones";
import { todayDateOnly } from "@/lib/proformas";

export const metadata: Metadata = {
  title: "Promociones",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Ronda C: catálogo de promociones (solo el administrador). */
export default async function PromocionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["admin"]);
  const params = await searchParams;

  const search = first(params.search).trim();
  const estadoParam = first(params.estado);
  const estado = (estadoParam in ESTADO_PROMOCION ? estadoParam : "") as EstadoPromocion | "";
  const parsedPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const perPage = parseFilasPorPagina(first(params.per_page));

  let result: Paginated<Promocion>;
  let servicios: Servicio[] = [];
  let productos: Producto[] = [];

  try {
    const [promociones, serviciosPage, productosPage] = await Promise.all([
      getPromociones({ search, estado, page, perPage }),
      getServicios({ activo: true, perPage: 20 }).catch(() => null),
      getProductos({ activo: true, perPage: 20 }).catch(() => null),
    ]);

    result = promociones;
    servicios = serviciosPage?.data ?? [];
    productos = productosPage?.data ?? [];
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader title="Promociones" />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Promociones"
        description="Descuentos por porcentaje, monto fijo o 2x1 que se eligen en cada línea de la proforma. Una promoción ya usada no se elimina: se desactiva."
      />

      <PromocionesTable
        promociones={result.data}
        meta={result.meta}
        query={{ search, estado, page, perPage }}
        servicios={servicios}
        productos={productos}
        hoy={todayDateOnly()}
      />
    </>
  );
}
