"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { SelectControl, TextFieldControl } from "@/components/ui/fields";
import { useSyncedDraft } from "@/lib/hooks/use-synced-draft";
import type { Cliente, EstadoCobro } from "@/lib/api/types";
import {
  COBROS_QUERY_VACIA,
  cobrosHref,
  type CobrosQuery,
} from "@/lib/cobros";

interface CobrosFiltrosProps {
  query: CobrosQuery;
  clientes: readonly Cliente[];
  className?: string;
}

const ESTADO_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "PARCIAL", label: "Parcial" },
  { value: "PAGADA", label: "Pagada" },
  { value: "VENCIDA", label: "Solo vencidas" },
];

/**
 * Filtros del listado. El estado y el cliente navegan al instante; la búsqueda
 * y el rango de vencimiento se aplican al enviar el formulario.
 */
export function CobrosFiltros({
  query,
  clientes,
  className,
}: CobrosFiltrosProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useSyncedDraft(query.search);
  const [desde, setDesde] = useSyncedDraft(query.desde);
  const [hasta, setHasta] = useSyncedDraft(query.hasta);

  function navigate(next: Partial<CobrosQuery>) {
    router.push(
      cobrosHref({
        ...query,
        search: searchInput.trim(),
        desde,
        hasta,
        page: 1,
        ...next,
      }),
    );
  }

  function clearFilters() {
    setSearchInput("");
    setDesde("");
    setHasta("");
    router.push(cobrosHref({ ...COBROS_QUERY_VACIA }));
  }

  const filtersActive = Boolean(
    query.search ||
      query.estado ||
      query.vencida ||
      query.clienteId !== "" ||
      query.desde ||
      query.hasta,
  );

  const clienteOptions = [
    { id: 0, label: "Todos los clientes" },
    ...clientes.map((cliente) => ({
      id: cliente.id,
      label: cliente.nombre_razon,
    })),
  ];

  const estadoValue = query.vencida ? "VENCIDA" : query.estado || "todos";

  return (
    <form
      role="search"
      aria-label="Filtros de cuentas por cobrar"
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
            label="Buscar cuenta"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Número, cliente u orden…"
          />
        </div>

        <div className="lg:col-span-2">
          <SelectControl
            name="estado"
            label="Estado"
            value={estadoValue}
            onChange={(value) => {
              if (value === "todos") {
                navigate({ estado: "", vencida: false });

                return;
              }

              if (value === "VENCIDA") {
                navigate({ estado: "", vencida: true });

                return;
              }

              navigate({ estado: value as EstadoCobro, vencida: false });
            }}
            options={ESTADO_OPTIONS}
          />
        </div>

        <div className="lg:col-span-3">
          <CatalogSelect
            name="cliente_id"
            label="Cliente"
            value={query.clienteId === "" ? "0" : String(query.clienteId)}
            onChange={(value) =>
              navigate({ clienteId: value === "0" ? "" : Number(value) })
            }
            options={clienteOptions}
            placeholder="Todos los clientes"
          />
        </div>

        <div className="lg:col-span-2">
          <TextFieldControl
            name="desde"
            label="Vence desde"
            type="date"
            value={desde}
            onChange={setDesde}
          />
        </div>

        <div className="lg:col-span-2">
          <TextFieldControl
            name="hasta"
            label="Vence hasta"
            type="date"
            value={hasta}
            onChange={setHasta}
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
