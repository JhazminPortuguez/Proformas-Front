import type { Producto } from "@/lib/api/types";
import { StatusChip } from "@/components/ui/status-chip";
import { movimientoMeta, productoStockEstado } from "@/lib/inventario";

export function StockEstadoChip({
  producto,
}: {
  producto: Pick<Producto, "stock_actual" | "stock_minimo"> & {
    stock_bajo?: boolean;
  };
}) {
  const meta = productoStockEstado(producto);

  return <StatusChip tone={meta.tone}>{meta.label}</StatusChip>;
}

export function MovimientoTipoChip({ tipo }: { tipo: string }) {
  const meta = movimientoMeta(tipo);

  return <StatusChip tone={meta.tone}>{meta.label}</StatusChip>;
}
