"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Eye, FileText, Plus, Search } from "lucide-react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { SolicitudEstadoChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAnnouncer } from "@/components/ui/announcer";
import { solicitudes as solicitudesApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Cliente, PaginationMeta, Solicitud } from "@/lib/api/types";
import { parseSolicitudEstado } from "@/lib/estados";
import { buildQuery, formatDateOnly, formatNumber } from "@/lib/utils";
import { SolicitudDetailDrawer } from "./solicitud-detail-drawer";
import { SolicitudFormDrawer } from "./solicitud-form-drawer";

interface SolicitudesTableProps {
  solicitudes: Solicitud[];
  meta: PaginationMeta;
  clientes: Cliente[];
  search: string;
  canManage: boolean;
}

function estaConvertida(solicitud: Solicitud): boolean {
  return (
    Boolean(solicitud.proforma_id) ||
    parseSolicitudEstado(solicitud.estado) === "CONVERTIDA"
  );
}

export function SolicitudesTable({
  solicitudes,
  meta,
  clientes,
  search,
  canManage,
}: SolicitudesTableProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSession, setDrawerSession] = useState(0);
  const [detail, setDetail] = useState<Solicitud | null>(null);
  const [toConvert, setToConvert] = useState<Solicitud | null>(null);
  const [convertPending, setConvertPending] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

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

  function navigatePage(next: number) {
    const query = buildQuery({ tab: "solicitudes", search, page: next });

    router.push(`/proformas${query}`);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = buildQuery({
      tab: "solicitudes",
      search: searchInput.trim(),
      page: 1,
    });

    router.push(`/proformas${query}`);
  }

  function openCreate() {
    setDrawerSession((value) => value + 1);
    setDrawerOpen(true);
  }

  async function confirmConvert() {
    if (!toConvert) return;

    setConvertPending(true);
    setConvertError(null);

    try {
      const proforma = await solicitudesApi.convertir(toConvert.id);

      if (!proforma?.id) {
        setConvertError(
          "No pudimos identificar la proforma creada. Revisa el listado antes de reintentar.",
        );

        return;
      }

      announce(
        `Solicitud convertida en la proforma ${
          proforma.numero ?? `#${proforma.id}`
        }. Revisa precios antes de enviarla.`,
      );
      setToConvert(null);
      router.push(`/proformas/${proforma.id}/editar`);
      router.refresh();
    } catch (error) {
      if (handleUnauthorized(error)) return;

      if (isApiError(error) && error.status === 409) {
        setConvertError(
          "La solicitud ya fue convertida o no admite más cambios.",
        );
      } else {
        setConvertError(
          apiErrorMessage(error, "No pudimos convertir la solicitud."),
        );
      }
    } finally {
      setConvertPending(false);
    }
  }

  const columns: DataTableColumn<Solicitud>[] = [
    {
      id: "cliente",
      header: "Cliente",
      isRowHeader: true,
      cell: (solicitud) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {solicitud.cliente?.nombre_razon ??
              `Cliente #${solicitud.cliente_id}`}
          </p>
          {solicitud.numero ? (
            <p className="numeric text-xs text-muted">{solicitud.numero}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "descripcion",
      header: "Descripción",
      cell: (solicitud) => (
        <span className="block max-w-[28rem] truncate text-sm">
          {solicitud.descripcion}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: (solicitud) => <SolicitudEstadoChip estado={solicitud.estado} />,
    },
    {
      id: "fecha",
      header: "Fecha",
      cell: (solicitud) => (
        <span className="numeric text-sm text-muted">
          {formatDateOnly(solicitud.fecha ?? solicitud.created_at)}
        </span>
      ),
    },
    {
      id: "items",
      header: "Ítems",
      className: "hidden sm:table-cell text-end",
      cell: (solicitud) => (
        <span className="numeric text-sm text-muted">
          {formatNumber(solicitud.items?.length ?? 0)}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      className: "text-end",
      cell: (solicitud) => {
        const convertida = estaConvertida(solicitud);
        const referencia = solicitud.numero ?? `#${solicitud.id}`;

        return (
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-foreground"
              aria-label={`Ver solicitud ${referencia}`}
              onPress={() => setDetail(solicitud)}
            >
              <Eye aria-hidden className="size-4" />
              Ver
            </Button>

            {convertida && solicitud.proforma_id ? (
              <Link
                href={`/proformas/${solicitud.proforma_id}`}
                aria-label={`Ver proforma de la solicitud ${referencia}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <FileText aria-hidden className="size-4" />
                Proforma
              </Link>
            ) : null}

            {!convertida && canManage ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-9"
                aria-label={`Convertir solicitud ${referencia}`}
                onPress={() => {
                  setConvertError(null);
                  setToConvert(solicitud);
                }}
              >
                <ArrowRightLeft aria-hidden className="size-4" />
                Convertir
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <section aria-label="Listado de solicitudes">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          role="search"
          onSubmit={submitSearch}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <TextField
            aria-label="Buscar solicitudes"
            name="search"
            value={searchInput}
            onChange={setSearchInput}
            className="w-full sm:w-80"
          >
            <Label className="sr-only">Buscar solicitudes</Label>
            <Input
              aria-label="Buscar solicitudes"
              type="search"
              fullWidth
              placeholder="Cliente o descripción…"
            />
          </TextField>

          <Button type="submit" variant="secondary" size="md">
            <Search aria-hidden className="size-4" />
            Buscar
          </Button>
        </form>

        <Button variant="primary" size="md" onPress={openCreate}>
          <Plus aria-hidden className="size-4" />
          Nueva solicitud
        </Button>
      </div>

      <div className="hidden md:block">
        <DataTable
          ariaLabel="Solicitudes"
          columns={columns}
          rows={solicitudes}
          getRowId={(solicitud) => solicitud.id}
          isPending={isPending}
          meta={meta}
          onPageChange={navigatePage}
          emptyTitle="Todavía no hay solicitudes"
          emptyDescription="Registra lo que pide un cliente para convertir la solicitud en una proforma."
          emptyIcon={<FileText aria-hidden className="size-5" />}
          emptyAction={
            <Button variant="primary" size="sm" onPress={openCreate}>
              <Plus aria-hidden className="size-4" />
              Nueva solicitud
            </Button>
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
        {solicitudes.length === 0 ? (
          <EmptyState
            title="Todavía no hay solicitudes"
            description="Registra lo que pide un cliente para convertir la solicitud en una proforma."
            icon={<FileText aria-hidden className="size-5" />}
            action={
              <Button variant="primary" size="sm" onPress={openCreate}>
                <Plus aria-hidden className="size-4" />
                Nueva solicitud
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {solicitudes.map((solicitud) => {
              const convertida = estaConvertida(solicitud);
              const referencia = solicitud.numero ?? `#${solicitud.id}`;

              return (
                <li
                  key={solicitud.id}
                  className="overflow-hidden rounded-xl border border-border bg-surface"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {solicitud.cliente?.nombre_razon ??
                          `Cliente #${solicitud.cliente_id}`}
                      </p>
                      <p className="numeric text-xs text-muted">
                        {solicitud.numero ?? `Solicitud #${solicitud.id}`}
                      </p>
                    </div>
                    <SolicitudEstadoChip estado={solicitud.estado} />
                  </div>

                  <div className="px-4 py-3">
                    <p className="line-clamp-2 text-sm text-foreground">
                      {solicitud.descripcion}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="numeric">
                        {formatDateOnly(
                          solicitud.fecha ?? solicitud.created_at,
                        )}
                      </span>
                      <span className="numeric">
                        {formatNumber(solicitud.items?.length ?? 0)} ítems
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 border-t border-border px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 text-foreground"
                      aria-label={`Ver solicitud ${referencia}`}
                      onPress={() => setDetail(solicitud)}
                    >
                      <Eye aria-hidden className="size-4" />
                      Ver
                    </Button>

                    {convertida && solicitud.proforma_id ? (
                      <Link
                        href={`/proformas/${solicitud.proforma_id}`}
                        aria-label={`Ver proforma de la solicitud ${referencia}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        <FileText aria-hidden className="size-4" />
                        Proforma
                      </Link>
                    ) : null}

                    {!convertida && canManage ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-9"
                        aria-label={`Convertir solicitud ${referencia}`}
                        onPress={() => {
                          setConvertError(null);
                          setToConvert(solicitud);
                        }}
                      >
                        <ArrowRightLeft aria-hidden className="size-4" />
                        Convertir
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

      <SolicitudFormDrawer
        key={drawerSession}
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        clientes={clientes}
        onSaved={() => {
          setDrawerOpen(false);
          setDrawerSession((value) => value + 1);
          refresh();
        }}
      />

      <SolicitudDetailDrawer
        isOpen={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        solicitud={detail}
      />

      <ConfirmDialog
        isOpen={Boolean(toConvert)}
        onOpenChange={(open) => {
          if (!open) {
            setToConvert(null);
            setConvertError(null);
          }
        }}
        title="Convertir solicitud"
        description={
          toConvert
            ? `Se creará una proforma en borrador con las líneas de la solicitud ${
                toConvert.numero ?? `#${toConvert.id}`
              }. Podrás ajustar precios y datos antes de enviarla.`
            : ""
        }
        confirmLabel="Convertir"
        pendingLabel="Convirtiendo…"
        tone="accent"
        onConfirm={confirmConvert}
        isPending={convertPending}
        error={convertError}
      />
    </section>
  );
}
