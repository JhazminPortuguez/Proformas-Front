"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAnnouncer } from "@/components/ui/announcer";
import { productos as productosApi } from "@/lib/api/client";
import { mensajeDeError } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { PaginationMeta, Producto } from "@/lib/api/types";
import {
  productoCatalogOptions,
  type ExistenciasQuery,
  type ProductoCatalogOption,
} from "@/lib/inventario";
import { AjustarStockDialog } from "./ajustar-stock-dialog";
import { ExistenciasFiltros } from "./existencias-filtros";
import { ExistenciasTable } from "./existencias-table";
import { ProductoFormDrawer } from "./producto-form-drawer";
import { RegistrarEntradaDialog } from "./registrar-entrada-dialog";

type DialogKind = "entrada" | "ajuste" | "producto";

/** Acción sobre un producto que se confirma antes de enviarla. */
type Confirmacion = { tipo: "activo" | "eliminar"; producto: Producto };

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
  /** Alta, edición, activar/desactivar y eliminar productos (solo admin). */
  canManage?: boolean;
}

export function ExistenciasView({
  productos,
  meta,
  query,
  catalogo,
  canAdjust,
  canManage = false,
}: ExistenciasViewProps) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [session, setSession] = useState(0);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [errorConfirmacion, setErrorConfirmacion] = useState<string | null>(null);
  const router = useRouter();
  const { announce } = useAnnouncer();

  function pedirConfirmacion(tipo: Confirmacion["tipo"], producto: Producto) {
    setErrorConfirmacion(null);
    setConfirmacion({ tipo, producto });
  }

  async function confirmar() {
    if (!confirmacion || confirmando) return;

    const { tipo, producto } = confirmacion;

    setConfirmando(true);
    setErrorConfirmacion(null);

    try {
      if (tipo === "eliminar") {
        await productosApi.remove(producto.id);
        announce(`Producto ${producto.nombre} eliminado.`);
      } else {
        await productosApi.update(producto.id, { activo: !producto.activo });
        announce(
          `Producto ${producto.nombre} ${producto.activo ? "desactivado" : "activado"}.`,
        );
      }

      setConfirmacion(null);
      router.refresh();
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        router.replace("/login");

        return;
      }

      // 409: está en proformas u órdenes o tiene movimientos; el back dice cuál.
      setErrorConfirmacion(
        mensajeDeError(
          caught,
          tipo === "eliminar"
            ? "No pudimos eliminar el producto."
            : "No pudimos cambiar el estado del producto.",
        ),
      );
    } finally {
      setConfirmando(false);
    }
  }

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

        {canAdjust || canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <Button variant="secondary" size="md" onPress={() => open("producto")}>
                <Plus aria-hidden className="size-4" />
                Nuevo producto
              </Button>
            ) : null}
            {canAdjust ? (
              <>
                <Button variant="primary" size="md" onPress={() => open("entrada")}>
                  <PackagePlus aria-hidden className="size-4" />
                  Registrar entrada
                </Button>
                <Button variant="secondary" size="md" onPress={() => open("ajuste")}>
                  <SlidersHorizontal aria-hidden className="size-4" />
                  Ajustar stock
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <ExistenciasTable
        productos={productos}
        meta={meta}
        query={query}
        canAdjust={canAdjust}
        canManage={canManage}
        onEntrada={(producto) => open("entrada", producto)}
        onAjuste={(producto) => open("ajuste", producto)}
        onEditar={(producto) => open("producto", producto)}
        onCambiarActivo={(producto) => pedirConfirmacion("activo", producto)}
        onEliminar={(producto) => pedirConfirmacion("eliminar", producto)}
      />

      {canManage ? (
        <>
          <ProductoFormDrawer
            key={`producto-${session}`}
            isOpen={dialog?.kind === "producto"}
            onOpenChange={(abierto) => {
              if (!abierto) setDialog(null);
            }}
            producto={dialog?.kind === "producto" ? selected : null}
          />

          <ConfirmDialog
            isOpen={Boolean(confirmacion)}
            onOpenChange={(abierto) => {
              if (!abierto && !confirmando) setConfirmacion(null);
            }}
            title={
              confirmacion?.tipo === "eliminar"
                ? "Eliminar producto"
                : confirmacion?.producto.activo
                  ? "Desactivar producto"
                  : "Activar producto"
            }
            description={
              !confirmacion
                ? ""
                : confirmacion.tipo === "eliminar"
                  ? `Se eliminará ${confirmacion.producto.nombre}. Solo es posible si nunca tuvo movimientos ni está en proformas u órdenes; si no, desactívalo.`
                  : confirmacion.producto.activo
                    ? `${confirmacion.producto.nombre} dejará de ofrecerse en proformas nuevas. Su stock y su historial se conservan.`
                    : `${confirmacion.producto.nombre} volverá a ofrecerse en proformas nuevas.`
            }
            confirmLabel={
              confirmacion?.tipo === "eliminar"
                ? "Eliminar"
                : confirmacion?.producto.activo
                  ? "Desactivar"
                  : "Activar"
            }
            pendingLabel={confirmacion?.tipo === "eliminar" ? "Eliminando…" : "Guardando…"}
            tone={confirmacion?.tipo === "eliminar" ? "danger" : "accent"}
            onConfirm={confirmar}
            isPending={confirmando}
            error={errorConfirmacion}
          />
        </>
      ) : null}

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
