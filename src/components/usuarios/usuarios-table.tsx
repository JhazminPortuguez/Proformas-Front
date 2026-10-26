"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldAlert, Trash2, UserRound } from "lucide-react";
import {
  Alert,
  Button,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextField,
} from "@heroui/react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAnnouncer } from "@/components/ui/announcer";
import { useSyncedDraft } from "@/lib/hooks/use-synced-draft";
import { usuarios as usuariosApi } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { PaginationMeta, Rol, User } from "@/lib/api/types";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import { buildQuery } from "@/lib/utils";

interface Query {
  search: string;
  page: number;
}

interface UsuariosTableProps {
  usuarios: User[];
  meta: PaginationMeta;
  query: Query;
  currentUserId: number;
}

const ROLES: Rol[] = ["admin", "operario", "cliente"];

interface Override {
  rol?: Rol;
  activo?: boolean;
}

export function UsuariosTable({
  usuarios,
  meta,
  query,
  currentUserId,
}: UsuariosTableProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useSyncedDraft(query.search);
  const [optimisticUsers, applyOptimistic] = useOptimistic(
    usuarios,
    (state: User[], patch: Override & { id: number }) =>
      state.map((usuario) =>
        usuario.id === patch.id ? { ...usuario, ...patch } : usuario,
      ),
  );
  const [pendingRow, setPendingRow] = useState<number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  function updateUser(id: number, patch: Override) {
    setRowError(null);
    startTransition(async () => {
      setPendingRow(id);
      applyOptimistic({ id, ...patch });

      try {
        await usuariosApi.update(id, patch);
        announce("Usuario actualizado.");
        router.refresh();
      } catch (error) {
        if (handleUnauthorized(error)) return;

        if (isApiError(error) && error.status === 403) {
          setRowError("Solo un administrador puede modificar usuarios.");
        } else {
          setRowError(
            apiErrorMessage(error, "No pudimos actualizar el usuario."),
          );
        }
      } finally {
        setPendingRow(null);
      }
    });
  }

  async function confirmDelete() {
    if (!toDelete) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await usuariosApi.remove(toDelete.id);
      announce("Usuario eliminado.");
      setToDelete(null);
      refresh();
    } catch (error) {
      if (handleUnauthorized(error)) return;

      if (isApiError(error) && error.status === 403) {
        setDeleteError("Solo un administrador puede eliminar usuarios.");
      } else if (isApiError(error) && error.status === 409) {
        setDeleteError(
          "El usuario tiene registros asociados. Desactívalo en lugar de eliminarlo.",
        );
      } else {
        setDeleteError(
          apiErrorMessage(error, "No pudimos eliminar el usuario."),
        );
      }
    } finally {
      setDeletePending(false);
    }
  }

  const columns: DataTableColumn<User>[] = [
    {
      id: "usuario",
      header: "Usuario",
      isRowHeader: true,
      cell: (usuario) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-medium text-foreground">
            {usuario.name}
            {usuario.id === currentUserId ? (
              <span className="text-xs font-normal text-muted">(tú)</span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted">{usuario.email}</p>
        </div>
      ),
    },
    {
      id: "rol",
      header: "Rol",
      cell: (usuario) => {
        const rol = usuario.rol;
        const disabled =
          pendingRow === usuario.id || usuario.id === currentUserId;
        const opciones =
          usuario.cliente_id === null && usuario.rol !== "cliente"
            ? ROLES.filter((option) => option !== "cliente")
            : ROLES;

        return (
          <div className="flex flex-col gap-1.5">
            <Select
              aria-label={`Rol de ${usuario.name}`}
              selectedKey={rol}
              isDisabled={disabled}
              onSelectionChange={(key) => {
                if (key === null || key === rol) return;

                void updateUser(usuario.id, { rol: String(key) as Rol });
              }}
              className="w-36"
            >
              <Select.Trigger aria-label={`Rol de ${usuario.name}`}>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {opciones.map((option) => (
                    <ListBox.Item
                      key={option}
                      id={option}
                      textValue={ROLE_LABELS[option]}
                    >
                      <div className="flex flex-col">
                        <span>{ROLE_LABELS[option]}</span>
                        <span className="text-xs text-muted">
                          {ROLE_DESCRIPTIONS[option]}
                        </span>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {usuario.id === currentUserId ? (
              <span className="text-[11px] text-muted">
                No puedes cambiar tu propio rol
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "estado",
      header: "Activo",
      cell: (usuario) => {
        const activo = usuario.activo;
        const disabled =
          pendingRow === usuario.id || usuario.id === currentUserId;

        return (
          <Switch
            aria-label={`Activo: ${usuario.name}`}
            size="sm"
            isSelected={activo}
            isDisabled={disabled}
            onChange={(value) => void updateUser(usuario.id, { activo: value })}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Label className="text-xs">{activo ? "Activo" : "Inactivo"}</Label>
            </Switch.Content>
          </Switch>
        );
      },
    },
    {
      id: "acciones",
      header: "Acciones",
      className: "text-end",
      cell: (usuario) => {
        const isSelf = usuario.id === currentUserId;

        return (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={
                isSelf
                  ? "No puedes eliminar tu propia cuenta"
                  : `Eliminar ${usuario.name}`
              }
              className="size-9 text-danger"
              isDisabled={isSelf}
              onPress={() => {
                setDeleteError(null);
                setToDelete(usuario);
              }}
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <section aria-label="Listado de usuarios">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const search = buildQuery({ search: searchInput.trim(), page: 1 });

            router.push(`/usuarios${search}`);
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <TextField
            aria-label="Buscar usuarios"
            name="search"
            value={searchInput}
            onChange={setSearchInput}
            className="w-full sm:w-72"
          >
            <Label className="sr-only">Buscar usuarios</Label>
            <Input
              aria-label="Buscar usuarios"
              type="search"
              fullWidth
              placeholder="Buscar por nombre o email…"
            />
          </TextField>

          <Button type="submit" variant="secondary" size="md">
            <Search aria-hidden className="size-4" />
            Buscar
          </Button>

          {query.search ? (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onPress={() => {
                setSearchInput("");
                router.push("/usuarios");
              }}
            >
              Limpiar
            </Button>
          ) : null}
        </form>

        <p className="flex items-center gap-1.5 text-xs text-muted">
          <ShieldAlert aria-hidden className="size-3.5" />
          Los cambios de rol se aplican de inmediato.
        </p>
      </div>

      <div className="mb-3 text-xs text-muted" role="note">
        Los usuarios se registran desde la pantalla pública de registro. Aquí
        asignas el rol de operario o desactivas cuentas.
      </div>

      {rowError ? (
        <Alert status="danger" className="mb-3" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{rowError}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <DataTable
        ariaLabel="Usuarios"
        columns={columns}
        rows={optimisticUsers}
        getRowId={(usuario) => usuario.id}
        isPending={isPending}
        meta={meta}
        onPageChange={(page) => {
          const search = buildQuery({ search: query.search, page });

          router.push(`/usuarios${search}`);
        }}
        emptyTitle={
          query.search ? "Sin coincidencias" : "Todavía no hay usuarios"
        }
        emptyDescription={
          query.search
            ? "Prueba con otro nombre o correo."
            : "Los usuarios aparecen aquí cuando se registran."
        }
        emptyIcon={<UserRound aria-hidden className="size-5" />}
      />

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Eliminar usuario"
        description={
          toDelete
            ? `¿Seguro que quieres eliminar a ${toDelete.name}? Si tiene actividad asociada, desactívalo en lugar de eliminarlo.`
            : ""
        }
        onConfirm={confirmDelete}
        isPending={deletePending}
        error={deleteError}
      />
    </section>
  );
}
