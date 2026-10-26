"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";
import { Button, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAnnouncer } from "@/components/ui/announcer";
import { ActivoChip, CatalogoChip } from "@/components/ui/status-chip";
import { useSyncedDraft } from "@/lib/hooks/use-synced-draft";
import { servicios as serviciosApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { PaginationMeta, Servicio } from "@/lib/api/types";
import { buildQuery, formatMoney, formatNumber } from "@/lib/utils";
import { ServicioFormDrawer } from "./servicio-form-drawer";

type Filtro = "" | "activo" | "inactivo";

interface Query {
  search: string;
  activo: Filtro;
  visible: Filtro;
  page: number;
}

interface ServiciosTableProps {
  servicios: Servicio[];
  meta: PaginationMeta;
  query: Query;
  canDelete: boolean;
  canManage: boolean;
}

const ACTIVO_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Activos e inactivos" },
  { value: "activo", label: "Solo activos" },
  { value: "inactivo", label: "Solo inactivos" },
];

const VISIBLE_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Todo el catálogo" },
  { value: "activo", label: "Visible al cliente" },
  { value: "inactivo", label: "Ocultos" },
];

export function ServiciosTable({
  servicios,
  meta,
  query,
  canDelete,
  canManage,
}: ServiciosTableProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useSyncedDraft(query.search);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [editing, setEditing] = useState<Servicio | null>(null);
  const [toDelete, setToDelete] = useState<Servicio | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function navigate(next: Partial<Query>) {
    const merged: Query = { ...query, page: 1, ...next };
    const search = buildQuery({
      search: merged.search,
      activo: merged.activo === "" ? "" : merged.activo === "activo" ? 1 : 0,
      visible_catalogo:
        merged.visible === "" ? "" : merged.visible === "activo" ? 1 : 0,
      page: merged.page,
    });

    router.push(`/servicios${search}`);
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

  function openEdit(servicio: Servicio) {
    setEditing(servicio);
    setSession((value) => value + 1);
    setDrawerOpen(true);
  }

  async function confirmDelete() {
    if (!toDelete) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await serviciosApi.remove(toDelete.id);
      announce("Servicio eliminado.");
      setToDelete(null);
      refresh();
    } catch (error) {
      if (handleUnauthorized(error)) return;

      if (isApiError(error) && error.status === 403) {
        setDeleteError("Solo un administrador puede eliminar servicios.");
      } else if (isApiError(error) && error.status === 409) {
        setDeleteError(
          "El servicio está en uso. Desactívalo en lugar de eliminarlo.",
        );
      } else {
        setDeleteError(
          apiErrorMessage(error, "No pudimos eliminar el servicio."),
        );
      }
    } finally {
      setDeletePending(false);
    }
  }

  const filtersActive = Boolean(query.search || query.activo || query.visible);

  const columns: DataTableColumn<Servicio>[] = [
    {
      id: "nombre",
      header: "Servicio",
      isRowHeader: true,
      cell: (servicio) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{servicio.nombre}</p>
          <p className="truncate text-xs text-muted">
            {servicio.categoria ?? "Sin categoría"}
          </p>
        </div>
      ),
    },
    {
      id: "precio",
      header: "Precio base",
      cell: (servicio) => (
        <span className="numeric text-sm">{formatMoney(servicio.precio_base)}</span>
      ),
    },
    {
      id: "duracion",
      header: "Duración",
      className: "hidden md:table-cell",
      cell: (servicio) => (
        <span className="numeric text-sm text-muted">
          {servicio.duracion_estimada_min !== null
            ? `${formatNumber(servicio.duracion_estimada_min)} min`
            : "—"}
        </span>
      ),
    },
    {
      id: "activo",
      header: "Estado",
      cell: (servicio) => <ActivoChip activo={servicio.activo} />,
    },
    {
      id: "catalogo",
      header: "Catálogo",
      className: "hidden sm:table-cell",
      cell: (servicio) => (
        <CatalogoChip visible={servicio.visible_catalogo} />
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      className: "text-end",
      cell: (servicio) => (
        <div className="flex items-center justify-end gap-1">
          {canManage ? (
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={`Editar ${servicio.nombre}`}
              className="size-9"
              onPress={() => openEdit(servicio)}
            >
              <Pencil aria-hidden className="size-4" />
            </Button>
          ) : null}

          {canDelete ? (
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={`Eliminar ${servicio.nombre}`}
              className="size-9 text-danger"
              onPress={() => {
                setDeleteError(null);
                setToDelete(servicio);
              }}
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section aria-label="Listado de servicios">
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
            aria-label="Buscar servicios"
            name="search"
            value={searchInput}
            onChange={setSearchInput}
            className="w-full sm:w-64"
          >
            <Label className="sr-only">Buscar servicios</Label>
            <Input
              aria-label="Buscar servicios"
              type="search"
              fullWidth
              placeholder="Buscar por nombre o categoría…"
            />
          </TextField>

          <Button type="submit" variant="secondary" size="md">
            <Search aria-hidden className="size-4" />
            Buscar
          </Button>

          <Select
            aria-label="Filtrar por estado"
            selectedKey={query.activo || "todos"}
            onSelectionChange={(key) => {
              if (key === null) return;

              navigate({
                activo:
                  key === "todos" ? "" : (String(key) as Exclude<Filtro, "">),
              });
            }}
            className="w-full sm:w-44"
          >
            <Select.Trigger aria-label="Filtrar por estado">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {ACTIVO_OPTIONS.map((option) => (
                  <ListBox.Item
                    key={option.value}
                    id={option.value}
                    textValue={option.label}
                  >
                    {option.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            aria-label="Filtrar por visibilidad en el catálogo"
            selectedKey={query.visible || "todos"}
            onSelectionChange={(key) => {
              if (key === null) return;

              navigate({
                visible:
                  key === "todos" ? "" : (String(key) as Exclude<Filtro, "">),
              });
            }}
            className="w-full sm:w-48"
          >
            <Select.Trigger aria-label="Filtrar por visibilidad en el catálogo">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {VISIBLE_OPTIONS.map((option) => (
                  <ListBox.Item
                    key={option.value}
                    id={option.value}
                    textValue={option.label}
                  >
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
                router.push("/servicios");
              }}
            >
              Limpiar
            </Button>
          ) : null}
        </form>

        {canManage ? (
          <Button variant="primary" onPress={openCreate}>
            <Plus aria-hidden className="size-4" />
            Nuevo servicio
          </Button>
        ) : null}
      </div>

      <DataTable
        ariaLabel="Servicios"
        columns={columns}
        rows={servicios}
        getRowId={(servicio) => servicio.id}
        isPending={isPending}
        meta={meta}
        onPageChange={(page) => navigate({ page })}
        emptyTitle={
          filtersActive ? "Sin coincidencias" : "Todavía no hay servicios"
        }
        emptyDescription={
          filtersActive
            ? "Ajusta la búsqueda o los filtros para ver más resultados."
            : "Crea el primer servicio para armar proformas."
        }
        emptyIcon={<Wrench aria-hidden className="size-5" />}
        emptyAction={
          filtersActive ? (
            <Button
              variant="tertiary"
              size="sm"
              onPress={() => navigate({ search: "", activo: "", visible: "" })}
            >
              Limpiar filtros
            </Button>
          ) : canManage ? (
            <Button variant="primary" size="sm" onPress={openCreate}>
              <Plus aria-hidden className="size-4" />
              Nuevo servicio
            </Button>
          ) : null
        }
      />

      <ServicioFormDrawer
        key={session}
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        servicio={editing}
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
        title="Eliminar servicio"
        description={
          toDelete
            ? `¿Seguro que quieres eliminar «${toDelete.nombre}»? Si está en uso, conviene desactivarlo.`
            : ""
        }
        onConfirm={confirmDelete}
        isPending={deletePending}
        error={deleteError}
      />
    </section>
  );
}
