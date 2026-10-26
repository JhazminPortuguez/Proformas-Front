"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import { Button, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAnnouncer } from "@/components/ui/announcer";
import { ClienteEstadoChip } from "@/components/ui/status-chip";
import { useSyncedDraft } from "@/lib/hooks/use-synced-draft";
import { clientes as clientesApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Cliente, ClienteEstado, PaginationMeta } from "@/lib/api/types";
import { buildQuery, formatNumber } from "@/lib/utils";
import { ClienteFormDrawer } from "./cliente-form-drawer";

interface Query {
  search: string;
  estado: ClienteEstado | "";
  page: number;
}

interface ClientesTableProps {
  clientes: Cliente[];
  meta: PaginationMeta;
  query: Query;
  canDelete: boolean;
}

const ESTADO_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  { value: "prospecto", label: "Prospecto" },
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

export function ClientesTable({
  clientes,
  meta,
  query,
  canDelete,
}: ClientesTableProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useSyncedDraft(query.search);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [toDelete, setToDelete] = useState<Cliente | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function navigate(next: Partial<Query>) {
    const merged: Query = { ...query, page: 1, ...next };
    const search = buildQuery({
      search: merged.search,
      estado: merged.estado,
      page: merged.page,
    });

    router.push(`/clientes${search}`);
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

  function openEdit(cliente: Cliente) {
    setEditing(cliente);
    setSession((value) => value + 1);
    setDrawerOpen(true);
  }

  async function confirmDelete() {
    if (!toDelete) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await clientesApi.remove(toDelete.id);
      announce("Cliente eliminado.");
      setToDelete(null);
      refresh();
    } catch (error) {
      if (handleUnauthorized(error)) return;

      if (isApiError(error) && error.status === 403) {
        setDeleteError("Solo un administrador puede eliminar clientes.");
      } else if (isApiError(error) && error.status === 409) {
        setDeleteError(
          "El cliente tiene proformas asociadas. Inactívalo en lugar de eliminarlo.",
        );
      } else {
        setDeleteError(
          apiErrorMessage(error, "No pudimos eliminar el cliente."),
        );
      }
    } finally {
      setDeletePending(false);
    }
  }

  const filtersActive = Boolean(query.search || query.estado);
  const showOrdenesCount = clientes.some(
    (cliente) => typeof cliente.ordenes_count === "number",
  );

  const columns: DataTableColumn<Cliente>[] = [
    {
      id: "nombre",
      header: "Cliente",
      isRowHeader: true,
      cell: (cliente) => (
        <div className="min-w-0">
          <Link
            href={`/clientes/${cliente.id}`}
            className="block truncate font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {cliente.nombre_razon}
          </Link>
          {cliente.direccion ? (
            <p className="truncate text-xs text-muted">{cliente.direccion}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "nit",
      header: "NIT / CI",
      className: "hidden sm:table-cell",
      cell: (cliente) => (
        <span className="numeric text-sm text-muted">{cliente.nit_ci ?? "—"}</span>
      ),
    },
    {
      id: "telefono",
      header: "Teléfono",
      className: "hidden md:table-cell",
      cell: (cliente) => (
        <span className="numeric text-sm">{cliente.telefono ?? "—"}</span>
      ),
    },
    {
      id: "email",
      header: "Email",
      className: "hidden lg:table-cell",
      cell: (cliente) => (
        <span className="block max-w-[16rem] truncate text-sm">
          {cliente.email ?? "—"}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: (cliente) => <ClienteEstadoChip estado={cliente.estado} />,
    },
    {
      id: "proformas",
      header: "Proformas",
      className: "hidden sm:table-cell text-end",
      cell: (cliente) => (
        <span className="numeric text-sm text-muted">
          {formatNumber(cliente.proformas_count ?? 0)}
        </span>
      ),
    },
    ...(showOrdenesCount
      ? [
          {
            id: "ordenes",
            header: "Órdenes",
            className: "hidden sm:table-cell text-end",
            cell: (cliente: Cliente) => (
              <span className="numeric text-sm text-muted">
                {typeof cliente.ordenes_count === "number"
                  ? formatNumber(cliente.ordenes_count)
                  : "—"}
              </span>
            ),
          } satisfies DataTableColumn<Cliente>,
        ]
      : []),
    {
      id: "acciones",
      header: "Acciones",
      className: "text-end",
      cell: (cliente) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/clientes/${cliente.id}`}
            className="grid size-9 place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            aria-label={`Ver historial de ${cliente.nombre_razon}`}
          >
            <History aria-hidden className="size-4" />
          </Link>

          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label={`Editar ${cliente.nombre_razon}`}
            className="size-9"
            onPress={() => openEdit(cliente)}
          >
            <Pencil aria-hidden className="size-4" />
          </Button>

          {canDelete ? (
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={`Eliminar ${cliente.nombre_razon}`}
              className="size-9 text-danger"
              onPress={() => {
                setDeleteError(null);
                setToDelete(cliente);
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
    <section aria-label="Listado de clientes">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ search: searchInput.trim() });
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <TextField
            aria-label="Buscar clientes"
            name="search"
            value={searchInput}
            onChange={setSearchInput}
            className="w-full sm:w-72"
          >
            <Label className="sr-only">Buscar clientes</Label>
            <Input
              aria-label="Buscar clientes"
              type="search"
              fullWidth
              placeholder="Buscar por nombre, NIT o email…"
            />
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

              navigate({
                estado: key === "todos" ? "" : (String(key) as ClienteEstado),
              });
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
                router.push("/clientes");
              }}
            >
              Limpiar
            </Button>
          ) : null}
        </form>

        <Button variant="primary" onPress={openCreate}>
          <Plus aria-hidden className="size-4" />
          Nuevo cliente
        </Button>
      </div>

      <DataTable
        ariaLabel="Clientes"
        columns={columns}
        rows={clientes}
        getRowId={(cliente) => cliente.id}
        isPending={isPending}
        meta={meta}
        onPageChange={(page) => navigate({ page })}
        emptyTitle={filtersActive ? "Sin coincidencias" : "Todavía no hay clientes"}
        emptyDescription={
          filtersActive
            ? "Ajusta la búsqueda o el filtro de estado para ver más resultados."
            : "Crea el primer cliente para empezar a generar proformas."
        }
        emptyIcon={<UserRound aria-hidden className="size-5" />}
        emptyAction={
          filtersActive ? (
            <Button variant="tertiary" size="sm" onPress={() => navigate({ search: "", estado: "" })}>
              Limpiar filtros
            </Button>
          ) : (
            <Button variant="primary" size="sm" onPress={openCreate}>
              <Plus aria-hidden className="size-4" />
              Nuevo cliente
            </Button>
          )
        }
      />

      <ClienteFormDrawer
        key={session}
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        cliente={editing}
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
        title="Eliminar cliente"
        description={
          toDelete
            ? `¿Seguro que quieres eliminar a ${toDelete.nombre_razon}? Esta acción no se puede deshacer.`
            : ""
        }
        onConfirm={confirmDelete}
        isPending={deletePending}
        error={deleteError}
      />
    </section>
  );
}
