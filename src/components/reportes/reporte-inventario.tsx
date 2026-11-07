import { BarChart } from "@/components/reportes/bar-chart";
import {
  ReporteBloque,
  ReporteKpis,
  ReporteTabla,
} from "@/components/reportes/reporte-ui";
import type {
  ReporteConsumoProducto,
  ReporteInventario,
  ReporteStockBajo,
} from "@/lib/api/types";
import { formatMoney, formatNumber } from "@/lib/utils";

/** Cuántos productos entran en el gráfico; la tabla los muestra todos. */
const TOP_GRAFICO = 10;

function nombreProducto(producto: ReporteConsumoProducto): string {
  return producto.nombre?.trim() || `Producto #${producto.producto_id}`;
}

function conUnidad(cantidad: number, unidad: string | null): string {
  return unidad ? `${formatNumber(cantidad)} ${unidad}` : formatNumber(cantidad);
}

const COLUMNAS_CONSUMO = [
  { header: "Producto", cell: (producto: ReporteConsumoProducto) => nombreProducto(producto) },
  { header: "Unidad", cell: (producto: ReporteConsumoProducto) => producto.unidad_medida || "—" },
  { header: "Cantidad consumida", numeric: true, cell: (producto: ReporteConsumoProducto) => formatNumber(producto.cantidad) },
  { header: "Costo", numeric: true, cell: (producto: ReporteConsumoProducto) => formatMoney(producto.costo) },
];

const COLUMNAS_STOCK = [
  { header: "Producto", cell: (producto: ReporteStockBajo) => producto.nombre },
  { header: "Stock actual", numeric: true, cell: (producto: ReporteStockBajo) => conUnidad(producto.stock_actual, producto.unidad_medida) },
  { header: "Mínimo", numeric: true, cell: (producto: ReporteStockBajo) => conUnidad(producto.stock_minimo, producto.unidad_medida) },
  { header: "Faltante", numeric: true, cell: (producto: ReporteStockBajo) => conUnidad(producto.faltante, producto.unidad_medida) },
];

export function ReporteInventarioView({ data }: { data: ReporteInventario }) {
  const { consumo, productos, stock_bajo: stockBajo } = data;
  const top = productos.slice(0, TOP_GRAFICO);

  return (
    <div className="space-y-6">
      <ReporteKpis
        label="Indicadores de inventario"
        kpis={[
          {
            label: "Costo del consumo",
            value: formatMoney(consumo.costo_total),
            hint: "Cantidad × costo unitario de cada consumo",
          },
          { label: "Productos consumidos", value: formatNumber(consumo.productos) },
          { label: "Movimientos de consumo", value: formatNumber(consumo.movimientos) },
          {
            label: "Con stock bajo",
            value: formatNumber(stockBajo.length),
            hint: "Hoy, sin importar el periodo",
          },
        ]}
      />

      <ReporteBloque
        id="reporte-inventario-consumo"
        title="Consumo de materiales"
        description="Materiales consumidos en las órdenes del periodo, por producto."
      >
        {productos.length === 0 ? (
          <ReporteTabla
            label="Consumo de materiales"
            columns={COLUMNAS_CONSUMO}
            rows={productos}
            getRowKey={(producto) => producto.producto_id}
            empty="No se consumieron materiales en este periodo."
          />
        ) : (
          <div className="space-y-4">
            <BarChart
              ariaLabel={`Gráfico del costo de los ${formatNumber(top.length)} materiales con más costo consumido`}
              horizontal
              money
              labels={top.map(nombreProducto)}
              series={[
                {
                  label: "Costo",
                  tone: "accent",
                  data: top.map((producto) => producto.costo),
                },
              ]}
            />
            <ReporteTabla
              label="Consumo de materiales"
              columns={COLUMNAS_CONSUMO}
              rows={productos}
              getRowKey={(producto) => producto.producto_id}
              empty="No se consumieron materiales en este periodo."
              footer={["Total", "", "", formatMoney(consumo.costo_total)]}
            />
          </div>
        )}
      </ReporteBloque>

      <ReporteBloque
        id="reporte-inventario-stock"
        title="Productos con stock bajo"
        description="Stock actual en o por debajo del mínimo. Es la situación de hoy."
      >
        <ReporteTabla
          label="Productos con stock bajo"
          columns={COLUMNAS_STOCK}
          rows={stockBajo}
          getRowKey={(producto) => producto.id}
          empty="Ningún producto está por debajo de su stock mínimo."
        />
      </ReporteBloque>
    </div>
  );
}
