"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, CreditCard } from "lucide-react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { useAnnouncer } from "@/components/ui/announcer";
import { pagos as pagosApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { PagoCuenta } from "@/lib/api/types";
import {
  metodoPagoLabel,
  pagosAnuladosCount,
  pagosVigentes,
  puedeAnularPago,
} from "@/lib/cobros";
import { cn, formatDateOnly, formatDateTime, formatMoney, formatNumber } from "@/lib/utils";
import { PagoEstadoChip } from "./chips";

interface PagosTableProps {
  pagos: readonly PagoCuenta[];
  /** Solo admin (`pagos.anular`); el backend sigue validando. */
  canAnular: boolean;
}

const ICON_ACTION =
  "grid size-9 place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-danger-soft hover:text-danger-soft-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function PagosTable({ pagos, canAnular }: PagosTableProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [isPending, startTransition] = useTransition();
  const [pagoAAnular, setPagoAAnular] = useState<PagoCuenta | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vigentes = pagosVigentes(pagos);
  const anulados = pagosAnuladosCount(pagos);

  function closeAnular() {
    setPagoAAnular(null);
    setError(null);
  }

  async function anular(motivo?: string) {
    if (!pagoAAnular) return;

    setAnulando(true);
    setError(null);

    try {
      await pagosApi.anular(pagoAAnular.id, motivo ?? "");
      announce(`Pago de ${formatMoney(pagoAAnular.monto)} anulado.`);
      setPagoAAnular(null);
      startTransition(() => router.refresh());
    } catch (caught) {
      if (
        isApiError(caught) &&
        (caught.status === 401 || caught.status === 419)
      ) {
        router.replace("/login");
        router.refresh();

        return;
      }

      setError(
        isApiError(caught) && caught.status === 403
          ? "Solo un administrador puede anular pagos."
          : apiErrorMessage(caught, "No pudimos anular el pago."),
      );
    } finally {
      setAnulando(false);
    }
  }

  const columns: DataTableColumn<PagoCuenta>[] = [
    {
      id: "fecha",
      header: "Fecha",
      isRowHeader: true,
      cell: (pago) => (
        <div className="min-w-0">
          <p className="numeric text-sm text-foreground">
            {formatDateOnly(pago.fecha_pago)}
          </p>
          <p className="numeric text-xs text-muted">
            Registrado {formatDateTime(pago.created_at)}
          </p>
        </div>
      ),
    },
    {
      id: "monto",
      header: "Monto",
      className: "text-end",
      cell: (pago) => (
        <span
          className={cn(
            "numeric text-sm font-semibold whitespace-nowrap",
            pago.anulado ? "text-muted line-through" : "text-foreground",
          )}
        >
          {formatMoney(pago.monto)}
        </span>
      ),
    },
    {
      id: "metodo",
      header: "Método",
      cell: (pago) => (
        <span className="text-sm text-foreground">
          {metodoPagoLabel(pago.metodo)}
        </span>
      ),
    },
    {
      id: "referencia",
      header: "Referencia",
      className: "hidden lg:table-cell",
      cell: (pago) => (
        <span
          className="block max-w-[13rem] truncate text-sm text-muted"
          title={pago.referencia ?? undefined}
        >
          {pago.referencia?.trim() || "—"}
        </span>
      ),
    },
    {
      id: "usuario",
      header: "Registró",
      className: "hidden xl:table-cell",
      cell: (pago) => (
        <span className="block max-w-[10rem] truncate text-sm text-muted">
          {pago.usuario?.name ?? "—"}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: (pago) => (
        <div className="flex flex-col items-start gap-1">
          <PagoEstadoChip pago={pago} />
          {pago.anulado && pago.anulador?.name ? (
            <span className="text-[11px] text-muted">
              por {pago.anulador.name}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "motivo",
      header: "Motivo de anulación",
      className: "hidden xl:table-cell",
      cell: (pago) =>
        pago.anulado ? (
          <span
            className="block max-w-[14rem] truncate text-sm text-muted"
            title={pago.motivo_anulacion ?? undefined}
          >
            {pago.motivo_anulacion?.trim() || "Sin motivo registrado"}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
  ];

  if (canAnular) {
    columns.push({
      id: "acciones",
      header: "Acciones",
      className: "w-16",
      cell: (pago) =>
        puedeAnularPago(pago, canAnular) ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isIconOnly
              className={ICON_ACTION}
              aria-label={`Anular pago de ${formatMoney(pago.monto)}`}
              onPress={() => {
                setError(null);
                setPagoAAnular(pago);
              }}
            >
              <Ban aria-hidden className="size-4" />
            </Button>
          </div>
        ) : (
          <span className="block text-end text-xs text-muted">—</span>
        ),
    });
  }

  return (
    <section aria-label="Pagos de la cuenta">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Pagos</h2>
        <p className="numeric text-xs text-muted">
          {formatNumber(vigentes.length)}{" "}
          {vigentes.length === 1 ? "pago vigente" : "pagos vigentes"}
          {anulados > 0
            ? ` · ${formatNumber(anulados)} ${
                anulados === 1 ? "anulado" : "anulados"
              }`
            : ""}
        </p>
      </div>

      <div className="hidden md:block">
        <DataTable
          ariaLabel="Pagos de la cuenta"
          columns={columns}
          rows={[...pagos]}
          getRowId={(pago) => pago.id}
          isPending={isPending}
          emptyTitle="Todavía no hay pagos registrados"
          emptyDescription="El primer pago aparecerá acá y actualizará el saldo de la cuenta."
          emptyIcon={<CreditCard aria-hidden className="size-5" />}
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
        {pagos.length === 0 ? (
          <EmptyState
            title="Todavía no hay pagos registrados"
            description="El primer pago aparecerá acá y actualizará el saldo de la cuenta."
            icon={<CreditCard aria-hidden className="size-5" />}
          />
        ) : (
          <ul className="space-y-3" aria-label="Pagos de la cuenta">
            {pagos.map((pago) => (
              <li
                key={pago.id}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "numeric text-base font-semibold",
                        pago.anulado ? "text-muted line-through" : "text-foreground",
                      )}
                    >
                      {formatMoney(pago.monto)}
                    </p>
                    <p className="numeric text-xs text-muted">
                      {formatDateOnly(pago.fecha_pago)} ·{" "}
                      {metodoPagoLabel(pago.metodo)}
                    </p>
                  </div>

                  <PagoEstadoChip pago={pago} />
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Referencia</dt>
                    <dd className="truncate text-foreground">
                      {pago.referencia?.trim() || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Registró</dt>
                    <dd className="truncate text-foreground">
                      {pago.usuario?.name ?? "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">Registrado</dt>
                    <dd className="numeric text-foreground">
                      {formatDateTime(pago.created_at)}
                    </dd>
                  </div>
                  {pago.anulado ? (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted">
                        Anulación
                        {pago.anulador?.name ? ` · ${pago.anulador.name}` : ""}
                      </dt>
                      <dd className="text-foreground">
                        {pago.motivo_anulacion?.trim() ||
                          "Sin motivo registrado."}
                        {pago.anulado_at
                          ? ` · ${formatDateTime(pago.anulado_at)}`
                          : ""}
                      </dd>
                    </div>
                  ) : null}
                  {pago.observaciones?.trim() ? (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted">Observaciones</dt>
                      <dd className="text-foreground">{pago.observaciones}</dd>
                    </div>
                  ) : null}
                </dl>

                {puedeAnularPago(pago, canAnular) ? (
                  <div className="flex justify-end border-t border-border px-4 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      aria-label={`Anular pago de ${formatMoney(pago.monto)}`}
                      onPress={() => {
                        setError(null);
                        setPagoAAnular(pago);
                      }}
                    >
                      <Ban aria-hidden className="size-4" />
                      Anular pago
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={pagoAAnular !== null}
        onOpenChange={(open) => {
          if (!open && !anulando) closeAnular();
        }}
        title="Anular pago"
        description={
          pagoAAnular
            ? `El pago de ${formatMoney(
                pagoAAnular.monto,
              )} del ${formatDateOnly(
                pagoAAnular.fecha_pago,
              )} dejará de contar para el saldo y volverá al historial como anulado.`
            : ""
        }
        confirmLabel="Anular pago"
        pendingLabel="Anulando…"
        tone="danger"
        requireReason
        reasonLabel="Motivo de la anulación"
        reasonPlaceholder="Explica por qué se anula el pago…"
        onConfirm={anular}
        isPending={anulando}
        error={error}
      />
    </section>
  );
}
