import { Alert } from "@heroui/react";
import type { Orden, OrdenItem } from "@/lib/api/types";
import { StatusChip } from "@/components/ui/status-chip";
import {
  materialConsumidoCantidad,
  materialEstaConsumido,
  materialPendienteCantidad,
  materialStockInsuficiente,
  materialesStockInsuficiente,
  ordenMateriales,
} from "@/lib/inventario";
import { ordenItemTitle, ordenItemUnidad } from "@/lib/ordenes";
import { formatMoney, formatNumber } from "@/lib/utils";

function MaterialEstadoChip({ item }: { item: OrdenItem }) {
  if (materialEstaConsumido(item)) {
    return <StatusChip tone="success">Consumido</StatusChip>;
  }

  if (materialStockInsuficiente(item)) {
    return <StatusChip tone="danger">Stock insuficiente</StatusChip>;
  }

  return <StatusChip tone="warning">Pendiente</StatusChip>;
}

function MaterialCosto({ item }: { item: OrdenItem }) {
  return (
    <span className="numeric text-sm text-muted whitespace-nowrap">
      {formatMoney(item.producto?.costo_promedio ?? item.precio_unitario)}
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
        <table className="w-full min-w-[860px] text-sm">
          <caption className="sr-only">
            Materiales de la orden {orden.numero}
          </caption>
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-start">
              <th scope="col" className="px-3 py-2.5 text-start font-medium text-muted">
                Material
              </th>
              <th scope="col" className="px-3 py-2.5 text-end font-medium text-muted">
                Requerido
              </th>
              <th scope="col" className="px-3 py-2.5 text-end font-medium text-muted">
                Consumido
              </th>
              <th scope="col" className="px-3 py-2.5 text-end font-medium text-muted">
                Pendiente
              </th>
              <th scope="col" className="px-3 py-2.5 text-end font-medium text-muted">
                Stock actual
              </th>
              <th scope="col" className="px-3 py-2.5 text-end font-medium text-muted">
                Costo prom.
              </th>
              <th scope="col" className="px-3 py-2.5 text-start font-medium text-muted">
                Estado
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
                    <p className="text-xs text-muted">
                      {item.producto?.nombre ?? "Sin producto"} · {unidad}
                    </p>
                  </td>
                  <td className="numeric px-3 py-3 text-end align-top whitespace-nowrap">
                    {formatNumber(item.cantidad)}
                  </td>
                  <td className="numeric px-3 py-3 text-end align-top whitespace-nowrap">
                    {formatNumber(materialConsumidoCantidad(item))}
                  </td>
                  <td className="numeric px-3 py-3 text-end align-top font-medium whitespace-nowrap">
                    {formatNumber(materialPendienteCantidad(item))}
                  </td>
                  <td className="numeric px-3 py-3 text-end align-top whitespace-nowrap">
                    {item.producto ? (
                      <span
                        className={
                          materialStockInsuficiente(item)
                            ? "font-medium text-danger"
                            : undefined
                        }
                      >
                        {formatNumber(item.producto.stock_actual)} {unidad}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 text-end align-top">
                    <MaterialCosto item={item} />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <MaterialEstadoChip item={item} />
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
              <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {ordenItemTitle(item)}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {item.producto?.nombre ?? "Sin producto"} · {unidad}
                  </p>
                </div>
                <MaterialEstadoChip item={item} />
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Requerido</dt>
                  <dd className="numeric text-foreground">
                    {formatNumber(item.cantidad)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Consumido</dt>
                  <dd className="numeric text-foreground">
                    {formatNumber(materialConsumidoCantidad(item))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Pendiente</dt>
                  <dd className="numeric font-medium text-foreground">
                    {formatNumber(materialPendienteCantidad(item))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Stock actual</dt>
                  <dd
                    className={
                      materialStockInsuficiente(item)
                        ? "numeric font-medium text-danger"
                        : "numeric text-foreground"
                    }
                  >
                    {item.producto
                      ? `${formatNumber(item.producto.stock_actual)} ${unidad}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Costo promedio</dt>
                  <dd>
                    <MaterialCosto item={item} />
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
