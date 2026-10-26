"use client";

import { useState } from "react";
import { PackagePlus, SlidersHorizontal } from "lucide-react";
import { Button } from "@heroui/react";
import type { PaginationMeta, Producto } from "@/lib/api/types";
import {
  productoCatalogOptions,
  type ExistenciasQuery,
  type ProductoCatalogOption,
} from "@/lib/inventario";
import { AjustarStockDialog } from "./ajustar-stock-dialog";
import { ExistenciasFiltros } from "./existencias-filtros";
import { ExistenciasTable } from "./existencias-table";
import { RegistrarEntradaDialog } from "./registrar-entrada-dialog";

type DialogKind = "entrada" | "ajuste";

interface DialogState {
  kind: DialogKind;
  producto: Producto | null;
}

interface ExistenciasViewProps {
  productos: Producto[];
  meta: PaginationMeta;
  query: ExistenciasQuery;
  catalogo: readonly ProductoCatalogOption[];
  canAdjust: boolean;
}

export function ExistenciasView({
  productos,
  meta,
  query,
  catalogo,
  canAdjust,
}: ExistenciasViewProps) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [session, setSession] = useState(0);

  function open(kind: DialogKind, producto?: Producto) {
    setDialog({ kind, producto: producto ?? null });
    setSession((value) => value + 1);
  }

  const selected = dialog?.producto ?? null;
  const selectedOption = selected
    ? productoCatalogOptions([selected])[0]
    : null;
  const opciones =
    selectedOption && !catalogo.some((option) => option.id === selectedOption.id)
      ? [selectedOption, ...catalogo]
      : catalogo;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <ExistenciasFiltros query={query} className="min-w-0 flex-1" />

        {canAdjust ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="md" onPress={() => open("entrada")}>
              <PackagePlus aria-hidden className="size-4" />
              Registrar entrada
            </Button>
            <Button variant="secondary" size="md" onPress={() => open("ajuste")}>
              <SlidersHorizontal aria-hidden className="size-4" />
              Ajustar stock
            </Button>
          </div>
        ) : null}
      </div>

      <ExistenciasTable
        productos={productos}
        meta={meta}
        query={query}
        canAdjust={canAdjust}
        onEntrada={(producto) => open("entrada", producto)}
        onAjuste={(producto) => open("ajuste", producto)}
      />

      {canAdjust ? (
        <>
          <RegistrarEntradaDialog
            key={`entrada-${session}`}
            isOpen={dialog?.kind === "entrada"}
            onOpenChange={(open) => {
              if (!open) setDialog(null);
            }}
            productos={opciones}
            productoId={selected?.id ?? null}
          />

          <AjustarStockDialog
            key={`ajuste-${session}`}
            isOpen={dialog?.kind === "ajuste"}
            onOpenChange={(open) => {
              if (!open) setDialog(null);
            }}
            productos={opciones}
            productoId={selected?.id ?? null}
          />
        </>
      ) : null}
    </div>
  );
}
