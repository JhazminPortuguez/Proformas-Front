import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@heroui/react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { NavTabs } from "@/components/ui/nav-tabs";
import { ExistenciasView } from "@/components/inventario/existencias-view";
import { InventarioResumenCards } from "@/components/inventario/inventario-resumen";
import { MovimientosFiltros } from "@/components/inventario/movimientos-filtros";
import { MovimientosTable } from "@/components/inventario/movimientos-table";
import {
  getInventario,
  getInventarioResumen,
  getMovimientosInventario,
  requireUser,
} from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  InventarioResumen,
  MovimientoInventario,
  Paginated,
  Producto,
} from "@/lib/api/types";
import {
  existenciasHref,
  inventarioTabHref,
  parseTipoMovimiento,
  productoCatalogOptions,
  type ExistenciasQuery,
  type FiltroActivo,
  type InventarioTab,
  type MovimientosQuery,
} from "@/lib/inventario";
import { can } from "@/lib/permissions";
import { isValidDateOnly } from "@/lib/proformas";

export const metadata: Metadata = {
  title: "Inventario",
};

const PER_PAGE = 15;

const TAB_KEYS = ["existencias", "movimientos"] as const;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function positiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseActivo(value: string): FiltroActivo {
  if (value === "1" || value === "activo") return "activo";
  if (value === "0" || value === "inactivo") return "inactivo";

  return "";
}

function parseFecha(value: string): string {
  return isValidDateOnly(value) ? value.trim() : "";
}

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const tabParam = first(params.tab);
  const tab: InventarioTab = TAB_KEYS.includes(tabParam as InventarioTab)
    ? (tabParam as InventarioTab)
    : "existencias";

  const search = first(params.search).trim();
  const page = positiveInt(first(params.page)) ?? 1;

  const existenciasQuery: ExistenciasQuery = {
    search,
    bajoStock:
      first(params.bajo_stock) === "1" ||
      first(params.bajo_stock) === "true",
    activo: parseActivo(first(params.activo)),
    page,
  };

  const tipoParam = first(params.tipo);
  const movimientoQuery: MovimientosQuery = {
    search,
    tipo: parseTipoMovimiento(tipoParam) ?? "",
    productoId: positiveInt(first(params.producto_id)) ?? "",
    desde: parseFecha(first(params.desde)),
    hasta: parseFecha(first(params.hasta)),
    page,
  };

  let resumen: InventarioResumen;
  let existencias: Paginated<Producto> | null = null;
  let movimientos: Paginated<MovimientoInventario> | null = null;
  let catalogoProductos: Producto[] = [];

  try {
    const [resumenData, catalogoPage, existenciasPage, movimientosPage] =
      await Promise.all([
        getInventarioResumen(),
        getInventario({ page: 1, perPage: 100 }),
        tab === "existencias"
          ? getInventario({
              search,
              bajoStock: existenciasQuery.bajoStock,
              activo:
                existenciasQuery.activo === ""
                  ? ""
                  : existenciasQuery.activo === "activo",
              page,
              perPage: PER_PAGE,
            })
          : Promise.resolve(null),
        tab === "movimientos"
          ? getMovimientosInventario({
              search,
              productoId: movimientoQuery.productoId,
              tipo: movimientoQuery.tipo,
              desde: movimientoQuery.desde,
              hasta: movimientoQuery.hasta,
              page,
              perPage: PER_PAGE,
            })
          : Promise.resolve(null),
      ]);

    resumen = resumenData;
    catalogoProductos = catalogoPage.data;
    existencias = existenciasPage;
    movimientos = movimientosPage;
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader
          title="Inventario"
          description="Existencias, movimientos y consumo de materiales."
        />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  const catalogo = productoCatalogOptions(catalogoProductos);
  const puedeAjustar = can(user, "inventario.ajustar");

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Stock de materiales, valorización y trazabilidad de cada movimiento."
      />

      <InventarioResumenCards resumen={resumen} />

      {resumen.bajo_stock > 0 ? (
        <Alert status="warning" className="mb-5 items-start">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              {resumen.bajo_stock === 1
                ? "Hay 1 producto bajo el stock mínimo"
                : `Hay ${resumen.bajo_stock} productos bajo el stock mínimo`}
            </Alert.Title>
            <Alert.Description>
              Revisa las existencias y registra una entrada para reponer.{" "}
              <Link
                href={existenciasHref({
                  search: "",
                  bajoStock: true,
                  activo: "",
                  page: 1,
                })}
                className="font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Ver solo bajo stock
              </Link>
              .
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <NavTabs
        label="Secciones de inventario"
        current={tab}
        tabs={[
          {
            key: "existencias",
            label: "Existencias",
            href: inventarioTabHref("existencias"),
            count: resumen.productos,
          },
          {
            key: "movimientos",
            label: "Movimientos",
            href: inventarioTabHref("movimientos"),
            count: resumen.movimientos_mes,
          },
        ]}
        className="mb-6"
      />

      {tab === "existencias" && existencias ? (
        <ExistenciasView
          productos={existencias.data}
          meta={existencias.meta}
          query={existenciasQuery}
          catalogo={catalogo}
          canAdjust={puedeAjustar}
        />
      ) : null}

      {tab === "movimientos" && movimientos ? (
        <div>
          <MovimientosFiltros
            query={movimientoQuery}
            productos={catalogo}
            className="mb-4"
          />
          <MovimientosTable
            movimientos={movimientos.data}
            meta={movimientos.meta}
            query={movimientoQuery}
          />
        </div>
      ) : null}
    </>
  );
}
