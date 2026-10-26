"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { SelectControl, TextFieldControl } from "@/components/ui/fields";
import { useSyncedDraft } from "@/lib/hooks/use-synced-draft";
import type { Cliente, EstadoOrden, User } from "@/lib/api/types";
import { ordenesHref, type OrdenesQuery } from "@/lib/ordenes";

interface OrdenesFiltrosProps {
  query: OrdenesQuery;
  clientes: readonly Cliente[];
  operarios: readonly User[];
  /** El filtro por operario solo se muestra si hay lista disponible. */
  mostrarOperario: boolean;
  className?: string;
}

const ESTADO_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "ASIGNADA", label: "Asignada" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "FINALIZADA", label: "Finalizada" },
  { value: "CANCELADA", label: "Cancelada" },
];

export function OrdenesFiltros({
  query,
  clientes,
  operarios,
  mostrarOperario,
  className,
}: OrdenesFiltrosProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useSyncedDraft(query.search);

  function navigate(next: Partial<OrdenesQuery>) {
    router.push(
      ordenesHref({
        ...query,
        search: searchInput.trim(),
        page: 1,
        ...next,
      }),
    );
  }

  function clearFilters() {
    setSearchInput("");

    const empty: OrdenesQuery = {
      search: "",
      estado: "",
      operarioId: "",
      clienteId: "",
      vista: query.vista,
      page: 1,
    };

    router.push(ordenesHref(empty));
  }

  const filtersActive = Boolean(
    query.search ||
      query.estado ||
      query.operarioId !== "" ||
      query.clienteId !== "",
  );

  const clienteOptions = [
    { value: "todos", label: "Todos los clientes" },
    ...clientes.map((cliente) => ({
      value: String(cliente.id),
      label: cliente.nombre_razon,
    })),
  ];

  const operarioOptions = [
    { value: "todos", label: "Todos los operarios" },
    ...operarios.map((operario) => ({
      value: String(operario.id),
      label: operario.name,
    })),
  ];

  return (
    <form
      role="search"
      aria-label="Filtros de órdenes"
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ search: searchInput.trim() });
      }}
      className={className}
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12 lg:items-end">
        <div className="md:col-span-2 lg:col-span-3">
          <TextFieldControl
            name="search"
            label="Buscar"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Número, cliente, proforma u observaciones…"
          />
        </div>

        <div className="lg:col-span-2">
          <SelectControl
            name="estado"
            label="Estado"
            value={query.estado || "todos"}
            onChange={(value) =>
              navigate({
                estado: value === "todos" ? "" : (value as EstadoOrden),
              })
            }
            options={ESTADO_OPTIONS}
          />
        </div>

        {mostrarOperario ? (
          <div className="lg:col-span-2">
            <SelectControl
              name="operario_id"
              label="Operario"
              value={
                query.operarioId === "" ? "todos" : String(query.operarioId)
              }
              onChange={(value) =>
                navigate({
                  operarioId: value === "todos" ? "" : Number(value),
                })
              }
              options={operarioOptions}
            />
          </div>
        ) : null}

        <div className={mostrarOperario ? "lg:col-span-3" : "lg:col-span-5"}>
          <SelectControl
            name="cliente_id"
            label="Cliente"
            value={query.clienteId === "" ? "todos" : String(query.clienteId)}
            onChange={(value) =>
              navigate({
                clienteId: value === "todos" ? "" : Number(value),
              })
            }
            options={clienteOptions}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-12 lg:justify-end">
          <Button type="submit" variant="secondary" size="md">
            <Search aria-hidden className="size-4" />
            Buscar
          </Button>

          {filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onPress={clearFilters}
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
