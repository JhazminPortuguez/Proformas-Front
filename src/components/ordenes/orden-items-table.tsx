import type { Orden } from "@/lib/api/types";
import {
  ordenItemTitle,
  ordenItemTotal,
  ordenItemUnidad,
  tipoOrdenItemLabel,
} from "@/lib/ordenes";
import { formatMoney, formatNumber } from "@/lib/utils";

/** Snapshot de los ítems de la orden: no se recalcula desde la proforma. */
export function OrdenItemsTable({ orden }: { orden: Orden }) {
  const items = orden.items ?? [];

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        La orden no tiene ítems registrados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">
          Ítems de la orden de servicio {orden.numero}
        </caption>
        <thead>
          <tr className="border-b border-border bg-surface-secondary text-start">
            <th scope="col" className="px-3 py-2.5 text-start font-medium text-muted">
              Tipo
            </th>
            <th scope="col" className="px-3 py-2.5 text-start font-medium text-muted">
              Descripción
            </th>
            <th scope="col" className="px-3 py-2.5 text-start font-medium text-muted">
              Unidad
            </th>
            <th scope="col" className="px-3 py-2.5 text-end font-medium text-muted">
              Cantidad
            </th>
            <th scope="col" className="px-3 py-2.5 text-end font-medium text-muted">
              Precio unit.
            </th>
            <th scope="col" className="px-3 py-2.5 text-end font-medium text-muted">
              Total
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-separator">
          {items.map((item) => {
            const title = ordenItemTitle(item);
            const catalogo =
              item.tipo === "SERVICIO"
                ? item.servicio?.nombre
                : item.tipo === "MATERIAL"
                  ? item.producto?.nombre
                  : null;

            return (
              <tr key={item.id}>
                <td className="px-3 py-3 align-top">
                  <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {tipoOrdenItemLabel(item.tipo)}
                  </span>
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="font-medium text-foreground">{title}</p>
                  {catalogo && catalogo !== title ? (
                    <p className="text-xs text-muted">Catálogo: {catalogo}</p>
                  ) : null}
                </td>
                <td className="px-3 py-3 align-top text-muted">
                  {ordenItemUnidad(item)}
                </td>
                <td className="numeric px-3 py-3 text-end align-top whitespace-nowrap">
                  {formatNumber(item.cantidad)}
                </td>
                <td className="numeric px-3 py-3 text-end align-top whitespace-nowrap">
                  {formatMoney(item.precio_unitario)}
                </td>
                <td className="numeric px-3 py-3 text-end align-top font-medium whitespace-nowrap">
                  {formatMoney(ordenItemTotal(item))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
