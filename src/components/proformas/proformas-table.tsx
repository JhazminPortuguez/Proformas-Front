"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search } from "lucide-react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { ProformaEstadoChip } from "@/components/ui/status-chip";
import { SelectControl, TextFieldControl } from "@/components/ui/fields";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAnnouncer } from "@/components/ui/announcer";
import { useSyncedDraft } from "@/lib/hooks/use-synced-draft";
import { proformas as proformasApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  Cliente,
  EstadoProforma,
  PaginationMeta,
  Proforma,
} from "@/lib/api/types";
import {
  accionesProforma,
  formatDiaMes,
  proformaExpirada,
} from "@/lib/proformas";
import { buildQuery, formatDateOnly, formatMoney } from "@/lib/utils";
import {
  ProformaListActions,
  type ProformaActionRequest,
} from "./proforma-list-actions";

export interface ProformasQuery {
  search: string;
  estado: EstadoProforma | "";
  clienteId: number | "";
  desde: string;
  hasta: string;
  page: number;
}

interface ProformasTableProps {
  proformas: Proforma[];
  meta: PaginationMeta;
  query: ProformasQuery;
  clientes: Cliente[];
  canDelete: boolean;
  /** Hoy (`YYYY-MM-DD`) calculado en el servidor, para el aviso de validez. */
  hoy: string;
}

/** Nombre o razón social con su NIT/CI debajo. */
function ClienteCell({ proforma }: { proforma: Proforma }) {
  return (
    <div className="min-w-0">
      <p className="max-w-[18rem] truncate text-sm">
        {proforma.cliente?.nombre_razon ?? `Cliente #${proforma.cliente_id}`}
      </p>
      {proforma.cliente?.nit_ci ? (
        <p className="numeric text-xs text-muted">
          NIT/CI {proforma.cliente.nit_ci}
        </p>
      ) : null}
    </div>
  );
}

/** Fecha de validez; si la proforma enviada ya expiró, agrega un aviso. */
function ValidezCell({ proforma, hoy }: { proforma: Proforma; hoy: string }) {
  return (
    <div>
      <p className="numeric text-sm text-muted">
        {formatDateOnly(proforma.fecha_validez)}
      </p>
      {proformaExpirada(proforma, hoy) && proforma.fecha_validez ? (
        <p className="text-xs text-warning">
          Aviso: Expiró {formatDiaMes(proforma.fecha_validez)}
        </p>
      ) : null}
    </div>
  );
}

const ESTADO_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  { value: "BORRADOR", label: "Borrador" },
  { value: "ENVIADA", label: "Enviada" },
  { value: "ACEPTADA", label: "Aceptada" },
  { value: "RECHAZADA", label: "Rechazada" },
];

interface ActionTarget {
  proforma: Proforma;
  action: ProformaActionRequest;
}

export function ProformasTable({
  proformas,
  meta,
  query,
  clientes,
  canDelete,
  hoy,
}: ProformasTableProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useSyncedDraft(query.search);
  const [desdeInput, setDesdeInput] = useSyncedDraft(query.desde);
  const [hastaInput, setHastaInput] = useSyncedDraft(query.hasta);
  const [target, setTarget] = useState<ActionTarget | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const clienteOptions = [
    { value: "todos", label: "Todos los clientes" },
    ...clientes.map((cliente) => ({
      value: String(cliente.id),
      label: cliente.nombre_razon,
    })),
  ];

  function navigate(next: Partial<ProformasQuery>) {
    const merged: ProformasQuery = { ...query, page: 1, ...next };
    const search = buildQuery({
      tab: "proformas",
      search: merged.search,
      estado: merged.estado,
      cliente_id: merged.clienteId,
      desde: merged.desde,
      hasta: merged.hasta,
      page: merged.page,
    });

    router.push(`/proformas${search}`);
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  function handleUnauthorized(error: unknown): boolean {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      router.replace("/login");
      router.refresh();

      return true;
    }

    return false;
  }

  function requestAction(proforma: Proforma, action: ProformaActionRequest) {
    setActionError(null);
    setTarget({ proforma, action });
  }

  async function confirmAction(reason?: string) {
    if (!target) return;

    setActionPending(true);
    setActionError(null);

    try {
      const { proforma, action } = target;

      switch (action) {
        case "enviar":
          await proformasApi.enviar(proforma.id);
          announce(`Proforma ${proforma.numero} enviada.`);
          break;
        case "aceptar":
          await proformasApi.aceptar(proforma.id);
          announce(`Proforma ${proforma.numero} aceptada.`);
          break;
        case "rechazar":
          await proformasApi.rechazar(proforma.id, reason ?? "");
          announce(`Proforma ${proforma.numero} rechazada.`);
          break;
        case "eliminar":
          await proformasApi.remove(proforma.id);
          announce(`Proforma ${proforma.numero} eliminada.`);
          break;
      }

      setTarget(null);
      refresh();
    } catch (error) {
      if (handleUnauthorized(error)) return;

      if (isApiError(error) && error.status === 403) {
        setActionError("No tienes permisos para realizar esta acción.");
      } else {
        setActionError(
          apiErrorMessage(error, "No pudimos completar la acción."),
        );
      }
    } finally {
      setActionPending(false);
    }
  }

  function clearFilters() {
    setSearchInput("");
    setDesdeInput("");
    setHastaInput("");
    router.push("/proformas?tab=proformas");
  }

  const filtersActive = Boolean(
    query.search ||
      query.estado ||
      query.clienteId !== "" ||
      query.desde ||
      query.hasta,
  );

  const dialogConfig = target
    ? dialogForAction(target.action, target.proforma.numero)
    : null;

  const columns: DataTableColumn<Proforma>[] = [
    {
      id: "numero",
      header: "Código",
      isRowHeader: true,
      cell: (proforma) => (
        <div className="min-w-0">
          <Link
            href={`/proformas/${proforma.id}`}
            className="font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {proforma.numero}
          </Link>
          {proforma.solicitud_id ? (
            <p className="text-xs text-muted">
              Desde solicitud #{proforma.solicitud_id}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "cliente",
      header: "Cliente",
      cell: (proforma) => <ClienteCell proforma={proforma} />,
    },
    {
      id: "emision",
      header: "Emisión",
      cell: (proforma) => (
        <span className="numeric text-sm text-muted">
          {formatDateOnly(proforma.fecha_emision)}
        </span>
      ),
    },
    {
      id: "validez",
      header: "Validez",
      cell: (proforma) => <ValidezCell proforma={proforma} hoy={hoy} />,
    },
    {
      id: "total",
      header: "Total",
      className: "text-end",
      cell: (proforma) => (
        <span className="numeric text-sm font-medium text-foreground">
          {formatMoney(proforma.total, proforma.moneda)}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: (proforma) => <ProformaEstadoChip estado={proforma.estado} />,
    },
    {
      id: "acciones",
      header: "Acciones",
      className: "text-end",
      cell: (proforma) => (
        <ProformaListActions
          proforma={proforma}
          acciones={accionesProforma(proforma, { canDelete })}
          display="icons"
          onRequestAction={(action) => requestAction(proforma, action)}
        />
      ),
    },
  ];

  return (
    <section aria-label="Listado de proformas">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="md"
            onPress={() => router.push("/proformas/nueva")}
          >
            <Plus aria-hidden className="size-4" />
            Nueva proforma
          </Button>
        </div>

        <form
          role="search"
          aria-label="Filtros de proformas"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({
              search: searchInput.trim(),
              desde: desdeInput.trim(),
              hasta: hastaInput.trim(),
            });
          }}
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-12 lg:items-end"
        >
          <div className="md:col-span-2 lg:col-span-3">
            <TextFieldControl
              name="search"
              label="Buscar"
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Número, cliente u observaciones…"
            />
          </div>

          <div className="lg:col-span-2">
            <SelectControl
              name="estado"
              label="Estado"
              value={query.estado || "todos"}
              onChange={(value) =>
                navigate({
                  estado:
                    value === "todos" ? "" : (value as EstadoProforma),
                })
              }
              options={ESTADO_OPTIONS}
            />
          </div>

          <div className="lg:col-span-3">
            <SelectControl
              name="cliente_id"
              label="Cliente"
              value={
                query.clienteId === "" ? "todos" : String(query.clienteId)
              }
              onChange={(value) =>
                navigate({
                  clienteId: value === "todos" ? "" : Number(value),
                })
              }
              options={clienteOptions}
            />
          </div>

          <div className="lg:col-span-2">
            <TextFieldControl
              name="desde"
              label="Desde"
              type="date"
              value={desdeInput}
              onChange={setDesdeInput}
            />
          </div>

          <div className="lg:col-span-2">
            <TextFieldControl
              name="hasta"
              label="Hasta"
              type="date"
              value={hastaInput}
              onChange={setHastaInput}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-12 lg:justify-end">
            <Button type="submit" variant="secondary" size="md">
              <Search aria-hidden className="size-4" />
              Buscar
            </Button>

            {filtersActive ? (
              <Button type="button" variant="ghost" size="md" onPress={clearFilters}>
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="hidden md:block">
        <DataTable
          ariaLabel="Proformas"
          columns={columns}
          rows={proformas}
          getRowId={(proforma) => proforma.id}
          isPending={isPending}
          meta={meta}
          onPageChange={(page) => navigate({ page })}
          emptyTitle={filtersActive ? "Sin coincidencias" : "Todavía no hay proformas"}
          emptyDescription={
            filtersActive
              ? "Ajusta la búsqueda, el estado o las fechas para ver más resultados."
              : "Crea la primera proforma para empezar a cotizar."
          }
          emptyIcon={<FileText aria-hidden className="size-5" />}
          emptyAction={
            filtersActive ? (
              <Button variant="tertiary" size="sm" onPress={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onPress={() => router.push("/proformas/nueva")}
              >
                <Plus aria-hidden className="size-4" />
                Nueva proforma
              </Button>
            )
          }
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
        {proformas.length === 0 ? (
          <EmptyState
            title={filtersActive ? "Sin coincidencias" : "Todavía no hay proformas"}
            description={
              filtersActive
                ? "Ajusta la búsqueda, el estado o las fechas para ver más resultados."
                : "Crea la primera proforma para empezar a cotizar."
            }
            icon={<FileText aria-hidden className="size-5" />}
            action={
              filtersActive ? (
                <Button variant="tertiary" size="sm" onPress={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => router.push("/proformas/nueva")}
                >
                  <Plus aria-hidden className="size-4" />
                  Nueva proforma
                </Button>
              )
            }
          />
        ) : (
          <ul className="space-y-3">
            {proformas.map((proforma) => (
              <li
                key={proforma.id}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/proformas/${proforma.id}`}
                      className="font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {proforma.numero}
                    </Link>
                    <p className="truncate text-sm text-muted">
                      {proforma.cliente?.nombre_razon ??
                        `Cliente #${proforma.cliente_id}`}
                    </p>
                    {proforma.cliente?.nit_ci ? (
                      <p className="numeric text-xs text-muted">
                        NIT/CI {proforma.cliente.nit_ci}
                      </p>
                    ) : null}
                  </div>

                  <ProformaEstadoChip estado={proforma.estado} />
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Total</dt>
                    <dd className="numeric font-medium text-foreground">
                      {formatMoney(proforma.total, proforma.moneda)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Emisión</dt>
                    <dd className="numeric text-foreground">
                      {formatDateOnly(proforma.fecha_emision)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">Validez</dt>
                    <dd>
                      <ValidezCell proforma={proforma} hoy={hoy} />
                    </dd>
                  </div>
                </dl>

                <div className="border-t border-border px-3 py-2">
                  <ProformaListActions
                    proforma={proforma}
                    acciones={accionesProforma(proforma, { canDelete })}
                    display="labels"
                    onRequestAction={(action) => requestAction(proforma, action)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <TablePagination
            meta={meta}
            onPageChange={(page) => navigate({ page })}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(target)}
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null);
            setActionError(null);
          }
        }}
        title={dialogConfig?.title ?? ""}
        description={dialogConfig?.description ?? ""}
        confirmLabel={dialogConfig?.confirmLabel}
        pendingLabel={dialogConfig?.pendingLabel}
        tone={dialogConfig?.tone}
        requireReason={target?.action === "rechazar"}
        reasonLabel="Motivo del rechazo"
        reasonPlaceholder="Explica por qué el cliente rechazó la propuesta…"
        onConfirm={confirmAction}
        isPending={actionPending}
        error={actionError}
      />
    </section>
  );
}

function dialogForAction(
  action: ProformaActionRequest,
  numero: string,
): {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  tone: "danger" | "warning" | "accent";
} {
  switch (action) {
    case "enviar":
      return {
        title: "Enviar proforma",
        description: `Se enviará la proforma ${numero} al cliente y quedará a la espera de su respuesta.`,
        confirmLabel: "Enviar",
        pendingLabel: "Enviando…",
        tone: "accent",
      };
    case "aceptar":
      return {
        title: "Aceptar proforma",
        description: `Se marcará la proforma ${numero} como aceptada. Confirma que el cliente dio su conformidad.`,
        confirmLabel: "Aceptar",
        pendingLabel: "Aceptando…",
        tone: "warning",
      };
    case "rechazar":
      return {
        title: "Rechazar proforma",
        description: `La proforma ${numero} quedará rechazada. El motivo se guarda en el historial.`,
        confirmLabel: "Rechazar",
        pendingLabel: "Rechazando…",
        tone: "danger",
      };
    case "eliminar":
      return {
        title: "Eliminar proforma",
        description: `¿Seguro que quieres eliminar la proforma ${numero}? Esta acción no se puede deshacer.`,
        confirmLabel: "Eliminar",
        pendingLabel: "Eliminando…",
        tone: "danger",
      };
  }
}
