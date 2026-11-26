"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Percent, Plus, Power, Search, Trash2 } from "lucide-react";
import { Button, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import { useAnnouncer } from "@/components/ui/announcer";
import { useSyncedDraft } from "@/lib/hooks/use-synced-draft";
import { promociones as promocionesApi } from "@/lib/api/client";
import { mensajeDeError } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  EstadoPromocion,
  PaginationMeta,
  Producto,
  Promocion,
  Servicio,
} from "@/lib/api/types";
import { filasParam } from "@/lib/paginacion";
import { ESTADO_PROMOCION, alcanceTexto } from "@/lib/promociones";
import { buildQuery, formatDateNumeric, formatNumber } from "@/lib/utils";
import { PromocionFormDrawer, toPromocionInput } from "./promocion-form-drawer";

interface Query {
  search: string;
  estado: EstadoPromocion | "";
  page: number;
  perPage?: number;
}

interface PromocionesTableProps {
  promociones: Promocion[];
  meta: PaginationMeta;
  query: Query;
  servicios: Servicio[];
  productos: Producto[];
  hoy: string;
}

const ESTADO_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  ...(Object.keys(ESTADO_PROMOCION) as EstadoPromocion[]).map((estado) => ({
    value: estado,
    label: ESTADO_PROMOCION[estado].label,
  })),
];

export function PromocionesTable({
  promociones,
  meta,
  query,
  servicios,
  productos,
  hoy,
}: PromocionesTableProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useSyncedDraft(query.search);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [editing, setEditing] = useState<Promocion | null>(null);
  const [toDelete, setToDelete] = useState<Promocion | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  function navigate(next: Partial<Query>) {
    const merged: Query = { ...query, page: 1, ...next };

    router.push(
      `/promociones${buildQuery({
        search: merged.search,
        estado: merged.estado,
        per_page: filasParam(merged.perPage),
        page: merged.page,
      })}`,
    );
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

  function openCreate() {
    setEditing(null);
    setSession((value) => value + 1);
    setDrawerOpen(true);
  }

  function openEdit(promocion: Promocion) {
    setEditing(promocion);
    setSession((value) => value + 1);
    setDrawerOpen(true);
  }

  async function toggleActiva(promocion: Promocion) {
    if (toggling !== null) return;

    setToggling(promocion.id);

    try {
      await promocionesApi.update(promocion.id, {
        ...toPromocionInput({
          nombre: promocion.nombre,
          tipo: promocion.tipo,
          valor: promocion.valor === null ? "" : String(promocion.valor),
          aplica_a: promocion.aplica_a,
          servicio_id: promocion.servicio_id ? String(promocion.servicio_id) : "",
          producto_id: promocion.producto_id ? String(promocion.producto_id) : "",
          vigente_desde: promocion.vigente_desde,
          vigente_hasta: promocion.vigente_hasta,
          activa: promocion.activa,
        }),
        activa: !promocion.activa,
      });
      announce(promocion.activa ? "Promoción desactivada." : "Promoción activada.");
      refresh();
    } catch (error) {
      if (handleUnauthorized(error)) return;

      announce(mensajeDeError(error, "No pudimos cambiar el estado de la promoción."));
    } finally {
      setToggling(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await promocionesApi.remove(toDelete.id);
      announce("Promoción eliminada.");
      setToDelete(null);
      refresh();
    } catch (error) {
      if (handleUnauthorized(error)) return;

      setDeleteError(mensajeDeError(error, "No pudimos eliminar la promoción."));
    } finally {
      setDeletePending(false);
    }
  }

  const filtersActive = Boolean(query.search || query.estado);

  const columns: DataTableColumn<Promocion>[] = [
    {
      id: "nombre",
      header: "Promoción",
      isRowHeader: true,
      cell: (promocion) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{promocion.nombre}</p>
          <p className="truncate text-xs text-muted">{alcanceTexto(promocion)}</p>
        </div>
      ),
    },
    {
      id: "descuento",
      header: "Descuento",
      cell: (promocion) => (
        <div>
          <p className="numeric text-sm font-medium">{promocion.etiqueta}</p>
          <p className="text-xs text-muted">{promocion.tipo_etiqueta}</p>
        </div>
      ),
    },
    {
      id: "vigencia",
      header: "Vigencia",
      className: "hidden md:table-cell",
      cell: (promocion) => (
        <span className="numeric text-sm whitespace-nowrap">
          {formatDateNumeric(promocion.vigente_desde)} al {formatDateNumeric(promocion.vigente_hasta)}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: (promocion) => (
        <StatusChip tone={ESTADO_PROMOCION[promocion.estado].tone}>
          {ESTADO_PROMOCION[promocion.estado].label}
        </StatusChip>
      ),
    },
    {
      id: "usos",
      header: "Usos",
      className: "hidden sm:table-cell text-end",
      cell: (promocion) => (
        <span className="numeric text-sm text-muted">{formatNumber(promocion.usos ?? 0)}</span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      className: "text-end",
      cell: (promocion) => (
        <div className="flex items-center justify-end gap-1">
          <ActionTooltip label="Editar">
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={`Editar ${promocion.nombre}`}
              className="size-9"
              onPress={() => openEdit(promocion)}
            >
              <Pencil aria-hidden className="size-4" />
            </Button>
          </ActionTooltip>

          <ActionTooltip label={promocion.activa ? "Desactivar" : "Activar"}>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={`${promocion.activa ? "Desactivar" : "Activar"} ${promocion.nombre}`}
              className="size-9"
              isDisabled={toggling !== null}
              onPress={() => toggleActiva(promocion)}
            >
              <Power aria-hidden className="size-4" />
            </Button>
          </ActionTooltip>

          {(promocion.usos ?? 0) === 0 ? (
            <ActionTooltip label="Eliminar">
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={`Eliminar ${promocion.nombre}`}
                className="size-9 text-danger"
                onPress={() => {
                  setDeleteError(null);
                  setToDelete(promocion);
                }}
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
            </ActionTooltip>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section aria-label="Listado de promociones">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ search: searchInput.trim() });
          }}
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
        >
          <TextField
            aria-label="Buscar promociones"
            name="search"
            value={searchInput}
            onChange={setSearchInput}
            className="w-full sm:w-64"
          >
            <Label className="sr-only">Buscar promociones</Label>
            <Input aria-label="Buscar promociones" type="search" fullWidth placeholder="Buscar por nombre…" />
          </TextField>

          <Button type="submit" variant="secondary" size="md">
            <Search aria-hidden className="size-4" />
            Buscar
          </Button>

          <Select
            aria-label="Filtrar por estado"
            selectedKey={query.estado || "todos"}
            onSelectionChange={(key) => {
              if (key === null) return;

              navigate({ estado: key === "todos" ? "" : (String(key) as EstadoPromocion) });
            }}
            className="w-full sm:w-48"
          >
            <Select.Trigger aria-label="Filtrar por estado">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {ESTADO_OPTIONS.map((option) => (
                  <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                    {option.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          {filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onPress={() => {
                setSearchInput("");
                router.push("/promociones");
              }}
            >
              Limpiar
            </Button>
          ) : null}
        </form>

        <Button variant="primary" onPress={openCreate}>
          <Plus aria-hidden className="size-4" />
          Nueva promoción
        </Button>
      </div>

      <DataTable
        ariaLabel="Promociones"
        columns={columns}
        rows={promociones}
        getRowId={(promocion) => promocion.id}
        isPending={isPending}
        meta={meta}
        onPageChange={(page) => navigate({ page })}
        onPerPageChange={(perPage) => navigate({ perPage })}
        emptyTitle={filtersActive ? "Sin coincidencias" : "Todavía no hay promociones"}
        emptyDescription={
          filtersActive
            ? "Ajusta la búsqueda o el filtro para ver más resultados."
            : "Crea una promoción para ofrecer descuentos en las proformas."
        }
        emptyIcon={<Percent aria-hidden className="size-5" />}
        emptyAction={
          filtersActive ? (
            <Button variant="tertiary" size="sm" onPress={() => navigate({ search: "", estado: "" })}>
              Limpiar filtros
            </Button>
          ) : (
            <Button variant="primary" size="sm" onPress={openCreate}>
              <Plus aria-hidden className="size-4" />
              Nueva promoción
            </Button>
          )
        }
      />

      <PromocionFormDrawer
        key={session}
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        promocion={editing}
        servicios={servicios}
        productos={productos}
        hoy={hoy}
        onSaved={() => {
          setDrawerOpen(false);
          refresh();
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Eliminar promoción"
        description={
          toDelete
            ? `¿Seguro que quieres eliminar «${toDelete.nombre}»? Todavía no se usó en ninguna proforma.`
            : ""
        }
        onConfirm={confirmDelete}
        isPending={deletePending}
        error={deleteError}
      />
    </section>
  );
}
