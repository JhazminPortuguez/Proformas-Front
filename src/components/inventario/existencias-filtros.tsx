"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { SelectControl, TextFieldControl } from "@/components/ui/fields";
import { useSyncedDraft } from "@/lib/hooks/use-synced-draft";
import {
  existenciasHref,
  type ExistenciasQuery,
  type FiltroActivo,
} from "@/lib/inventario";

interface ExistenciasFiltrosProps {
  query: ExistenciasQuery;
  className?: string;
}

const BAJO_STOCK_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Todo el stock" },
  { value: "bajo", label: "Solo bajo stock" },
];

const ACTIVO_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Activos e inactivos" },
  { value: "activo", label: "Solo activos" },
  { value: "inactivo", label: "Solo inactivos" },
];

export function ExistenciasFiltros({
  query,
  className,
}: ExistenciasFiltrosProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useSyncedDraft(query.search);

  function navigate(next: Partial<ExistenciasQuery>) {
    router.push(
      existenciasHref({
        ...query,
        search: searchInput.trim(),
        page: 1,
        ...next,
      }),
    );
  }

  function clearFilters() {
    setSearchInput("");
    router.push(
      existenciasHref({
        search: "",
        bajoStock: false,
        activo: "",
        page: 1,
      }),
    );
  }

  const filtersActive = Boolean(query.search || query.bajoStock || query.activo);

  return (
    <form
      role="search"
      aria-label="Filtros de existencias"
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ search: searchInput.trim() });
      }}
      className={className}
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12 lg:items-end">
        <div className="md:col-span-2 lg:col-span-5">
          <TextFieldControl
            name="search"
            label="Buscar producto"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Nombre, descripción o unidad…"
          />
        </div>

        <div className="lg:col-span-3">
          <SelectControl
            name="bajo_stock"
            label="Stock"
            value={query.bajoStock ? "bajo" : "todos"}
            onChange={(value) =>
              navigate({ bajoStock: value === "bajo" })
            }
            options={BAJO_STOCK_OPTIONS}
          />
        </div>

        <div className="lg:col-span-3">
          <SelectControl
            name="activo"
            label="Estado del producto"
            value={query.activo || "todos"}
            onChange={(value) =>
              navigate({
                activo: value === "todos" ? "" : (value as FiltroActivo),
              })
            }
            options={ACTIVO_OPTIONS}
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
