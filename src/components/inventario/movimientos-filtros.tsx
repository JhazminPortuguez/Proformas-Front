"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { SelectControl, TextFieldControl } from "@/components/ui/fields";
import { useSyncedDraft } from "@/lib/hooks/use-synced-draft";
import type { TipoMovimientoInventario } from "@/lib/api/types";
import {
  movimientosHref,
  type MovimientosQuery,
  type ProductoCatalogOption,
} from "@/lib/inventario";

interface MovimientosFiltrosProps {
  query: MovimientosQuery;
  productos: readonly ProductoCatalogOption[];
  className?: string;
}

const TIPO_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos los tipos" },
  { value: "ENTRADA", label: "Entrada" },
  { value: "SALIDA", label: "Salida" },
  { value: "AJUSTE", label: "Ajuste" },
  { value: "CONSUMO", label: "Consumo" },
];

export function MovimientosFiltros({
  query,
  productos,
  className,
}: MovimientosFiltrosProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useSyncedDraft(query.search);
  const [desde, setDesde] = useSyncedDraft(query.desde);
  const [hasta, setHasta] = useSyncedDraft(query.hasta);

  function navigate(next: Partial<MovimientosQuery>) {
    router.push(
      movimientosHref({
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
    router.push(
      movimientosHref({
        search: "",
        tipo: "",
        productoId: "",
        desde: "",
        hasta: "",
        page: 1,
      }),
    );
  }

  const filtersActive = Boolean(
    query.search || query.tipo || query.productoId !== "" || query.desde || query.hasta,
  );

  const productoOptions = [
    { id: 0, label: "Todos los productos", description: "" },
    ...productos,
  ];

  return (
    <form
      role="search"
      aria-label="Filtros de movimientos de inventario"
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
            label="Buscar movimiento"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Producto, motivo, orden o usuario…"
          />
        </div>

        <div className="lg:col-span-2">
          <SelectControl
            name="tipo"
            label="Tipo"
            value={query.tipo || "todos"}
            onChange={(value) =>
              navigate({
                tipo: value === "todos" ? "" : (value as TipoMovimientoInventario),
              })
            }
            options={TIPO_OPTIONS}
          />
        </div>

        <div className="lg:col-span-3">
          <CatalogSelect
            name="producto_id"
            label="Producto"
            value={query.productoId === "" ? "0" : String(query.productoId)}
            onChange={(value) =>
              navigate({ productoId: value === "0" ? "" : Number(value) })
            }
            options={productoOptions}
            placeholder="Todos los productos"
          />
        </div>

        <div className="lg:col-span-2">
          <TextFieldControl
            name="desde"
            label="Desde"
            type="date"
            value={desde}
            onChange={setDesde}
          />
        </div>

        <div className="lg:col-span-2">
          <TextFieldControl
            name="hasta"
            label="Hasta"
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
