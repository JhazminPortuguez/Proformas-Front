"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ClipboardList, FilePlus2 } from "lucide-react";
import { Button } from "@heroui/react";
import { EmptyState } from "@/components/ui/feedback";
import { OrdenEstadoChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/ui/table-pagination";
import type { Orden, PaginationMeta, User } from "@/lib/api/types";
import { parseOrdenEstado, ordenEstadoMeta } from "@/lib/estados";
import {
  ORDENES_TABLERO_ESTADOS,
  accionesOrden,
  ordenClienteNombre,
  ordenFechaProgramadaTexto,
  ordenMontoCierre,
  ordenOperarioNombre,
  ordenProformaNumero,
  ordenesHref,
  ordenesSinFiltros,
  ordenesVacio,
  type AccionesOrdenOpciones,
  type OrdenesQuery,
} from "@/lib/ordenes";
import { formatNumber } from "@/lib/utils";
import { OrdenActions } from "./orden-actions";

interface OrdenesBoardProps {
  ordenes: Orden[];
  meta: PaginationMeta;
  query: OrdenesQuery;
  operarios: readonly User[];
  permisos: AccionesOrdenOpciones;
}

export function OrdenesBoard({
  ordenes,
  meta,
  query,
  operarios,
  permisos,
}: OrdenesBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const vacio = ordenesVacio(query);

  const canceladas = ordenes.filter(
    (orden) => parseOrdenEstado(orden.estado) === "CANCELADA",
  );

  function navigatePage(page: number) {
    startTransition(() => {
      router.push(ordenesHref({ ...query, page }));
    });
  }

  if (ordenes.length === 0) {
    return (
      <section aria-label="Tablero de órdenes de servicio">
        <EmptyState
          title={vacio.title}
          description={vacio.description}
          icon={<ClipboardList aria-hidden className="size-5" />}
          action={
            vacio.limpiar ? (
              <Button
                variant="tertiary"
                size="sm"
                onPress={() =>
                  router.push(ordenesHref(ordenesSinFiltros(query)))
                }
              >
                Limpiar filtros
              </Button>
            ) : query.estado ? undefined : (
              <Button
                variant="primary"
                size="sm"
                onPress={() => router.push("/proformas?estado=ACEPTADA")}
              >
                <FilePlus2 aria-hidden className="size-4" />
                Ver proformas aceptadas
              </Button>
            )
          }
        />
      </section>
    );
  }

  return (
    <section
      aria-label="Tablero de órdenes de servicio"
      aria-busy={isPending}
      className={isPending ? "pointer-events-none opacity-60 transition-opacity" : undefined}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ORDENES_TABLERO_ESTADOS.map((estado) => {
          const items = ordenes.filter(
            (orden) => parseOrdenEstado(orden.estado) === estado,
          );
          const headingId = `tablero-${estado.toLowerCase()}`;

          return (
            <section
              key={estado}
              aria-labelledby={headingId}
              className="flex min-w-0 flex-col rounded-xl border border-border bg-surface-secondary/50 p-3"
            >
              <header className="mb-3 flex items-center justify-between gap-2">
                <h3
                  id={headingId}
                  className="text-sm font-semibold text-foreground"
                >
                  {ordenEstadoMeta(estado).label}
                </h3>
                <span className="numeric rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                  {formatNumber(items.length)}
                </span>
              </header>

              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
                  Sin órdenes en este estado.
                </p>
              ) : (
                <ul className="flex flex-1 flex-col gap-2">
                  {items.map((orden) => (
                    <li
                      key={orden.id}
                      className="rounded-lg border border-border bg-surface p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/ordenes/${orden.id}`}
                            className="text-sm font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                          >
                            {orden.numero}
                          </Link>
                          <p className="truncate text-sm text-muted">
                            {ordenClienteNombre(orden)}
                          </p>
                          {orden.cliente?.nit_ci ? (
                            <p className="numeric text-xs text-muted">
                              NIT/CI {orden.cliente.nit_ci}
                            </p>
                          ) : null}
                        </div>
                        <OrdenEstadoChip estado={orden.estado} />
                      </div>

                      <dl className="mt-2 space-y-1 text-xs">
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-muted">Proforma</dt>
                          <dd className="truncate text-foreground">
                            <Link
                              href={`/proformas/${orden.proforma_id}`}
                              className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            >
                              {ordenProformaNumero(orden)}
                            </Link>
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-muted">Operario</dt>
                          <dd className="truncate text-foreground">
                            {ordenOperarioNombre(orden)}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-muted">Programada</dt>
                          <dd className="numeric text-foreground">
                            {ordenFechaProgramadaTexto(orden)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-2 border-t border-border pt-1">
                        <OrdenActions
                          ordenId={orden.id}
                          numero={orden.numero}
                          acciones={Array.from(
                            accionesOrden(orden, permisos),
                          )}
                          operarios={operarios}
                          montoCierre={ordenMontoCierre(orden)}
                          display="icons"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {canceladas.length > 0 ? (
        <section
          aria-labelledby="tablero-canceladas"
          className="mt-6 rounded-xl border border-border bg-surface p-4"
        >
          <header className="mb-3 flex items-center justify-between gap-2">
            <h3
              id="tablero-canceladas"
              className="text-sm font-semibold text-foreground"
            >
              Canceladas
            </h3>
            <span className="numeric rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted">
              {formatNumber(canceladas.length)}
            </span>
          </header>

          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {canceladas.map((orden) => (
              <li
                key={orden.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-secondary/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/ordenes/${orden.id}`}
                    className="text-sm font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {orden.numero}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {ordenClienteNombre(orden)}
                  </p>
                  {orden.motivo_cancelacion ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">
                      Motivo: {orden.motivo_cancelacion}
                    </p>
                  ) : null}
                </div>
                <OrdenEstadoChip estado={orden.estado} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-4">
        <TablePagination meta={meta} onPageChange={navigatePage} />
      </div>
    </section>
  );
}
