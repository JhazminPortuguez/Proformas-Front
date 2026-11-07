"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { Button } from "@heroui/react";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { SelectControl, TextFieldControl } from "@/components/ui/fields";
import { useSyncedDraft } from "@/lib/hooks/use-synced-draft";
import type { ReporteClienteOpcion, User } from "@/lib/api/types";
import {
  REPORTES,
  mesActualBolivia,
  reportesHref,
  type ReportesQuery,
} from "@/lib/reportes";

interface ReportesFiltrosProps {
  query: ReportesQuery;
  clientes: readonly ReporteClienteOpcion[];
  operarios: readonly User[];
}

export function ReportesFiltros({
  query,
  clientes,
  operarios,
}: ReportesFiltrosProps) {
  const router = useRouter();
  const { filtros } = REPORTES[query.tab];
  const [desde, setDesde] = useSyncedDraft(query.desde);
  const [hasta, setHasta] = useSyncedDraft(query.hasta);
  const [error, setError] = useState<string | undefined>();

  function aplicar(next: Partial<ReportesQuery> = {}) {
    const destino = { ...query, desde, hasta, ...next };

    if (!destino.desde || !destino.hasta) {
      setError("Elige la fecha inicial y la final.");

      return;
    }

    if (destino.hasta < destino.desde) {
      setError("La fecha final no puede ser anterior a la inicial.");

      return;
    }

    setError(undefined);
    router.push(reportesHref(destino));
  }

  function mesActual() {
    const mes = mesActualBolivia();

    setDesde(mes.desde);
    setHasta(mes.hasta);
    setError(undefined);
    router.push(reportesHref({ ...query, ...mes }));
  }

  const clienteOptions = [
    { id: 0, label: "Todos los clientes" },
    ...clientes.map((cliente) => ({
      id: cliente.id,
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
      aria-label="Filtros del reporte"
      onSubmit={(event) => {
        event.preventDefault();
        aplicar();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-2">
          <TextFieldControl
            name="desde"
            label="Desde"
            type="date"
            value={desde}
            onChange={setDesde}
            error={error}
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

        {filtros.cliente ? (
          <div className="lg:col-span-3">
            <CatalogSelect
              name="cliente_id"
              label="Cliente"
              value={query.clienteId === "" ? "0" : String(query.clienteId)}
              onChange={(value) =>
                aplicar({ clienteId: value === "0" ? "" : Number(value) })
              }
              options={clienteOptions}
              placeholder="Todos los clientes"
            />
          </div>
        ) : null}

        {filtros.operario ? (
          <div className="lg:col-span-2">
            <SelectControl
              name="operario_id"
              label="Operario"
              value={
                query.operarioId === "" ? "todos" : String(query.operarioId)
              }
              onChange={(value) =>
                aplicar({ operarioId: value === "todos" ? "" : Number(value) })
              }
              options={operarioOptions}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3 lg:justify-end">
          <Button type="submit" variant="secondary" size="md">
            <Filter aria-hidden className="size-4" />
            Aplicar
          </Button>
          <Button type="button" variant="ghost" size="md" onPress={mesActual}>
            Mes actual
          </Button>
        </div>
      </div>
    </form>
  );
}
