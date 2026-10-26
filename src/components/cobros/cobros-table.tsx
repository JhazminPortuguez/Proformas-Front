"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Eye, HandCoins, ReceiptText } from "lucide-react";
import { Button } from "@heroui/react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { TablePagination } from "@/components/ui/table-pagination";
import type { CuentaPorCobrar, PaginationMeta } from "@/lib/api/types";
import {
  COBROS_QUERY_VACIA,
  cobroDetalleHref,
  cobrosHref,
  cuentaClienteNombre,
  cuentaEstaVencida,
  cuentaOrdenHref,
  cuentaOrdenNumero,
  cuentaPagosCount,
  cuentaProgreso,
  cuentaSaldo,
  cuentaTotalPagado,
  puedeRegistrarPago,
  type CobrosQuery,
} from "@/lib/cobros";
import { cn, formatDateOnly, formatMoney, formatNumber } from "@/lib/utils";
import { EstadoCobroChip, VencidaChip } from "./chips";

interface CobrosTableProps {
  cuentas: CuentaPorCobrar[];
  meta: PaginationMeta;
  query: CobrosQuery;
  /** Permiso de UI para registrar pagos (`pagos.registrar`). */
  canPay: boolean;
  onPagar: (cuenta: CuentaPorCobrar) => void;
}

const LINK =
  "font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const ICON_ACTION =
  "grid size-9 place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function CobrosTable({
  cuentas,
  meta,
  query,
  canPay,
  onPagar,
}: CobrosTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const filtersActive = Boolean(
    query.search ||
      query.estado ||
      query.vencida ||
      query.clienteId !== "" ||
      query.desde ||
      query.hasta,
  );

  function navigatePage(page: number) {
    startTransition(() => {
      router.push(cobrosHref({ ...query, page }));
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.push(cobrosHref({ ...COBROS_QUERY_VACIA }));
    });
  }

  const columns: DataTableColumn<CuentaPorCobrar>[] = [
    {
      id: "numero",
      header: "Cuenta",
      isRowHeader: true,
      cell: (cuenta) => (
        <div className="min-w-0">
          <Link href={cobroDetalleHref(cuenta.id)} className={LINK}>
            {cuenta.numero}
          </Link>
          <p className="numeric text-xs text-muted">
            {cuentaPagosCount(cuenta)}{" "}
            {cuentaPagosCount(cuenta) === 1 ? "pago" : "pagos"}
          </p>
        </div>
      ),
    },
    {
      id: "cliente",
      header: "Cliente",
      cell: (cuenta) => (
        <Link
          href={`/clientes/${cuenta.cliente_id}`}
          className="block max-w-[15rem] truncate text-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {cuentaClienteNombre(cuenta)}
        </Link>
      ),
    },
    {
      id: "orden",
      header: "Orden",
      className: "hidden md:table-cell",
      cell: (cuenta) => (
        <Link
          href={cuentaOrdenHref(cuenta)}
          className="text-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {cuentaOrdenNumero(cuenta)}
        </Link>
      ),
    },
    {
      id: "emision",
      header: "Emisión",
      className: "hidden xl:table-cell",
      cell: (cuenta) => (
        <span className="numeric text-sm whitespace-nowrap text-muted">
          {formatDateOnly(cuenta.fecha_emision)}
        </span>
      ),
    },
    {
      id: "vencimiento",
      header: "Vencimiento",
      cell: (cuenta) => {
        const vencida = cuentaEstaVencida(cuenta);

        return (
          <span
            className={cn(
              "numeric text-sm whitespace-nowrap",
              vencida ? "font-medium text-danger" : "text-muted",
            )}
          >
            {formatDateOnly(cuenta.fecha_vencimiento)}
          </span>
        );
      },
    },
    {
      id: "total",
      header: "Total",
      className: "hidden lg:table-cell text-end",
      cell: (cuenta) => (
        <span className="numeric text-sm whitespace-nowrap text-muted">
          {formatMoney(cuenta.monto_total)}
        </span>
      ),
    },
    {
      id: "pagado",
      header: "Pagado",
      className: "hidden lg:table-cell text-end",
      cell: (cuenta) => (
        <span className="numeric text-sm whitespace-nowrap text-muted">
          {formatMoney(cuentaTotalPagado(cuenta))}
        </span>
      ),
    },
    {
      id: "saldo",
      header: "Saldo",
      className: "text-end",
      cell: (cuenta) => (
        <span
          className={cn(
            "numeric text-sm font-semibold whitespace-nowrap",
            cuentaSaldo(cuenta) > 0 ? "text-foreground" : "text-muted",
          )}
        >
          {formatMoney(cuentaSaldo(cuenta))}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: (cuenta) => <EstadoCobroChip estado={cuenta.estado_cobro} />,
    },
    {
      id: "vencida",
      header: "Mora",
      className: "hidden sm:table-cell",
      cell: (cuenta) => <VencidaChip cuenta={cuenta} />,
    },
    {
      id: "acciones",
      header: "Acciones",
      className: "w-24",
      cell: (cuenta) => (
        <div className="flex items-center justify-end gap-0.5">
          <Link
            href={cobroDetalleHref(cuenta.id)}
            className={ICON_ACTION}
            aria-label={`Ver cobro ${cuenta.numero}`}
          >
            <Eye aria-hidden className="size-4" />
          </Link>

          {puedeRegistrarPago(cuenta, canPay) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isIconOnly
              className="size-9 text-muted"
              aria-label={`Registrar pago ${cuenta.numero}`}
              onPress={() => onPagar(cuenta)}
            >
              <HandCoins aria-hidden className="size-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const emptyTitle = filtersActive
    ? "Sin cuentas para estos filtros"
    : "Todavía no hay cuentas por cobrar";
  const emptyDescription = filtersActive
    ? "Ajusta la búsqueda, el estado, el cliente o el rango de vencimiento."
    : "Las cuentas se generan al cerrar una orden de servicio.";

  const emptyAction = filtersActive ? (
    <Button variant="tertiary" size="sm" onPress={clearFilters}>
      Limpiar filtros
    </Button>
  ) : null;

  return (
    <section aria-label="Listado de cuentas por cobrar">
      <div className="hidden md:block">
        <DataTable
          ariaLabel="Cuentas por cobrar"
          columns={columns}
          rows={cuentas}
          getRowId={(cuenta) => cuenta.id}
          isPending={isPending}
          meta={meta}
          onPageChange={navigatePage}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyIcon={<ReceiptText aria-hidden className="size-5" />}
          emptyAction={emptyAction}
        />
      </div>

      <div
        className={
          isPending
            ? "pointer-events-none opacity-60 transition-opacity md:hidden"
            : "md:hidden"
        }
        aria-busy={isPending}
      >
        {cuentas.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            icon={<ReceiptText aria-hidden className="size-5" />}
            action={emptyAction}
          />
        ) : (
          <ul className="space-y-3" aria-label="Cuentas por cobrar">
            {cuentas.map((cuenta) => {
              const saldo = cuentaSaldo(cuenta);
              const progreso = cuentaProgreso(cuenta);

              return (
                <li
                  key={cuenta.id}
                  className="overflow-hidden rounded-xl border border-border bg-surface"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                      <Link
                        href={cobroDetalleHref(cuenta.id)}
                        className={cn(LINK, "block truncate")}
                      >
                        {cuenta.numero}
                      </Link>
                      <p className="truncate text-sm text-muted">
                        {cuentaClienteNombre(cuenta)}
                      </p>
                    </div>

                    <EstadoCobroChip estado={cuenta.estado_cobro} />
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Orden</dt>
                      <dd className="text-foreground">
                        <Link href={cuentaOrdenHref(cuenta)} className={LINK}>
                          {cuentaOrdenNumero(cuenta)}
                        </Link>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Vencimiento</dt>
                      <dd
                        className={cn(
                          "numeric text-foreground",
                          cuentaEstaVencida(cuenta) && "font-medium text-danger",
                        )}
                      >
                        {formatDateOnly(cuenta.fecha_vencimiento)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Emisión</dt>
                      <dd className="numeric text-foreground">
                        {formatDateOnly(cuenta.fecha_emision)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Mora</dt>
                      <dd>
                        <VencidaChip cuenta={cuenta} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Total</dt>
                      <dd className="numeric text-foreground">
                        {formatMoney(cuenta.monto_total)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Pagado</dt>
                      <dd className="numeric text-foreground">
                        {formatMoney(cuentaTotalPagado(cuenta))}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-muted">
                        Saldo · {formatNumber(progreso)}% pagado
                      </dt>
                      <dd className="numeric mt-0.5 text-base font-semibold text-foreground">
                        {formatMoney(saldo)}
                      </dd>
                      <span
                        aria-hidden
                        className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-secondary"
                      >
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{ width: `${progreso}%` }}
                        />
                      </span>
                    </div>
                  </dl>

                  <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2">
                    <Link
                      href={cobroDetalleHref(cuenta.id)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      <Eye aria-hidden className="size-4" />
                      Ver
                    </Link>

                    {puedeRegistrarPago(cuenta, canPay) ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onPress={() => onPagar(cuenta)}
                      >
                        <HandCoins aria-hidden className="size-4" />
                        Registrar pago
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4">
          <TablePagination meta={meta} onPageChange={navigatePage} />
        </div>
      </div>
    </section>
  );
}
