import { Alert } from "@heroui/react";
import type { Orden, OrdenItem } from "@/lib/api/types";
import {
  materialConsumidoCantidad,
  materialStockInsuficiente,
  materialesStockInsuficiente,
  ordenMateriales,
} from "@/lib/inventario";
import { ordenItemTitle, ordenItemUnidad } from "@/lib/ordenes";
import { formatDateOnly, formatNumber } from "@/lib/utils";

/** El back solo fija `consumido_at` cuando la línea se consumió por completo. */
function FechaConsumo({ item }: { item: OrdenItem }) {
  if (!item.consumido_at) return <span className="text-muted">—</span>;

  return (
    <time dateTime={item.consumido_at} className="numeric">
      {formatDateOnly(item.consumido_at)}
    </time>
  );
}

function StockActual({ item, unidad }: { item: OrdenItem; unidad: string }) {
  if (!item.producto) return <>—</>;

  return (
    <span
      className={
        materialStockInsuficiente(item) ? "font-medium text-danger" : undefined
      }
    >
      {formatNumber(item.producto.stock_actual)} {unidad}
    </span>
  );
}

/**
 * Solo materiales con producto: los ítems LIBRE no mueven inventario y los
 * servicios no tienen stock. La tabla no edita cantidades; el consumo se hace
 * desde el diálogo con validación.
 */
export function OrdenMaterialesTable({ orden }: { orden: Orden }) {
  const materiales = ordenMateriales(orden.items);
  const insuficientes = materialesStockInsuficiente(orden.items);

  if (materiales.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        La orden no tiene materiales con producto asociado.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {insuficientes.length > 0 ? (
        <Alert status="warning" className="items-start">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Stock insuficiente para completar el consumo</Alert.Title>
            <Alert.Description>
              {insuficientes
                .map((item) => ordenItemTitle(item))
                .join(", ")}
              . Revisa el inventario antes de consumir o registra una entrada.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">
            Materiales de la orden {orden.numero}
          </caption>
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-start">
              <th scope="col" className="px-3 py-2.5 text-start font-medium text-muted">
                Ítem
              </th>
              <th scope="col" className="px-3 py-2.5 text-start font-medium text-muted">
                Unidad
              </th>
              <th scope="col" className="px-3 py-2.5 text-end font-medium text-muted">
                Cantidad prevista
              </th>
              <th scope="col" className="px-3 py-2.5 text-end font-medium text-muted">
                Cantidad consumida
              </th>
              <th scope="col" className="px-3 py-2.5 text-start font-medium text-muted">
                Fecha de consumo
              </th>
              <th scope="col" className="px-3 py-2.5 text-end font-medium text-muted">
                Stock actual
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-separator">
            {materiales.map((item) => {
              const unidad = ordenItemUnidad(item);

              return (
                <tr key={item.id}>
                  <td className="px-3 py-3 align-top">
                    <p className="font-medium text-foreground">
                      {ordenItemTitle(item)}
                    </p>
                    {item.producto?.nombre &&
                    item.producto.nombre !== ordenItemTitle(item) ? (
                      <p className="text-xs text-muted">{item.producto.nombre}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top text-foreground">{unidad}</td>
                  <td className="numeric px-3 py-3 text-end align-top whitespace-nowrap">
                    {formatNumber(item.cantidad)}
                  </td>
                  <td className="numeric px-3 py-3 text-end align-top whitespace-nowrap">
                    {formatNumber(materialConsumidoCantidad(item))}
                  </td>
                  <td className="px-3 py-3 align-top whitespace-nowrap">
                    <FechaConsumo item={item} />
                  </td>
                  <td className="numeric px-3 py-3 text-end align-top whitespace-nowrap">
                    <StockActual item={item} unidad={unidad} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-label={`Materiales de la orden ${orden.numero}`}>
        {materiales.map((item) => {
          const unidad = ordenItemUnidad(item);

          return (
            <li
              key={item.id}
              className="overflow-hidden rounded-xl border border-border bg-surface"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="font-medium text-foreground">
                  {ordenItemTitle(item)}
                </p>
                <p className="truncate text-sm text-muted">
                  {item.producto?.nombre ?? "Sin producto"} · {unidad}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Cantidad prevista</dt>
                  <dd className="numeric text-foreground">
                    {formatNumber(item.cantidad)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Cantidad consumida</dt>
                  <dd className="numeric text-foreground">
                    {formatNumber(materialConsumidoCantidad(item))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Fecha de consumo</dt>
                  <dd className="text-foreground">
                    <FechaConsumo item={item} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Stock actual</dt>
                  <dd className="numeric text-foreground">
                    <StockActual item={item} unidad={unidad} />
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted">
        El consumo descuenta stock y queda registrado en el historial de la
        orden.
      </p>
    </div>
  );
}
