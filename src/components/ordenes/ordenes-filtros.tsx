"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { SelectControl, TextFieldControl } from "@/components/ui/fields";
import { useSyncedDraft } from "@/lib/hooks/use-synced-draft";
import type { Cliente, User } from "@/lib/api/types";
import {
  ordenesFiltrosActivos,
  ordenesHref,
  ordenesSinFiltros,
  type OrdenesQuery,
} from "@/lib/ordenes";

interface OrdenesFiltrosProps {
  query: OrdenesQuery;
  clientes: readonly Cliente[];
  operarios: readonly User[];
  /** El filtro por operario solo se muestra si hay lista disponible. */
  mostrarOperario: boolean;
  className?: string;
}

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

  // El estado se elige con las pestañas: limpiar filtros no cambia de pestaña.
  function clearFilters() {
    setSearchInput("");
    router.push(ordenesHref(ordenesSinFiltros(query)));
  }

  const filtersActive = ordenesFiltrosActivos(query);

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
        <div className="md:col-span-2 lg:col-span-4">
          <TextFieldControl
            name="search"
            label="Buscar"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Número, cliente, proforma u observaciones…"
          />
        </div>

        {mostrarOperario ? (
          <div className="lg:col-span-3">
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

        <div className={mostrarOperario ? "lg:col-span-5" : "lg:col-span-8"}>
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
