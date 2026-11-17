import type {
  ErroresValidacion,
  ProductoInput,
  MovimientoInventario,
  Orden,
  OrdenItem,
  Producto,
  TipoMovimientoInventario,
} from "@/lib/api/types";
import type { EstadoTone } from "@/lib/estados";
import { roundMoney } from "@/lib/proformas";
import { filasParam } from "@/lib/paginacion";
import { buildQuery, formatNumber, parseDecimal } from "@/lib/utils";
import { decimalesDe, validarLargos } from "@/lib/validacion";

/* -------------------------------------------------------------------------- */
/* Movimientos                                                                 */
/* -------------------------------------------------------------------------- */

export interface MovimientoMeta {
  label: string;
  tone: EstadoTone;
  description: string;
}

export const MOVIMIENTO_META: Record<TipoMovimientoInventario, MovimientoMeta> =
  {
    ENTRADA: {
      label: "Entrada",
      tone: "success",
      description: "Ingreso de materiales al almacén.",
    },
    SALIDA: {
      label: "Salida",
      tone: "accent",
      description: "Retiro de materiales del almacén.",
    },
    AJUSTE: {
      label: "Ajuste",
      tone: "warning",
      description: "Corrección manual del stock físico.",
    },
    CONSUMO: {
      label: "Consumo",
      tone: "danger",
      description: "Materiales consumidos por una orden de servicio.",
    },
    DEVOLUCION: {
      label: "Devolución",
      tone: "success",
      description: "Material consumido que volvió al stock al cancelar una orden.",
    },
  };

/** El backend documenta mayúsculas, pero se toleran variantes heredadas. */
const ALIAS_MOVIMIENTO: Record<string, TipoMovimientoInventario> = {
  entrada: "ENTRADA",
  ingreso: "ENTRADA",
  salida: "SALIDA",
  egreso: "SALIDA",
  ajuste: "AJUSTE",
  correccion: "AJUSTE",
  consumo: "CONSUMO",
  consumido: "CONSUMO",
  devolucion: "DEVOLUCION",
  "devolución": "DEVOLUCION",
};

export function parseTipoMovimiento(
  value: string,
): TipoMovimientoInventario | null {
  const key = value.trim().toLowerCase().replaceAll(/[\s-]+/g, "_");

  return ALIAS_MOVIMIENTO[key] ?? null;
}

export function movimientoMeta(value: string): MovimientoMeta {
  const tipo = parseTipoMovimiento(value);

  if (tipo) return MOVIMIENTO_META[tipo];

  const clean = value.trim().replaceAll(/[_-]+/g, " ");

  return {
    label: clean
      ? clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
      : "Movimiento",
    tone: "neutral",
    description: "Movimiento sin descripción registrada.",
  };
}

/**
 * La cantidad llega con signo, pero el signo visible se deriva del tipo para
 * que una salida se lea siempre como negativa aunque el back envíe el valor
 * absoluto.
 */
export function movimientoSigno(
  tipo: TipoMovimientoInventario | string,
  cantidad: number,
): "+" | "−" | "" {
  const parsed = parseTipoMovimiento(tipo);

  if (parsed === "ENTRADA" || parsed === "DEVOLUCION") return "+";
  if (parsed === "SALIDA" || parsed === "CONSUMO") return "−";

  if (!Number.isFinite(cantidad) || cantidad === 0) return "";

  return cantidad < 0 ? "−" : "+";
}

export function formatCantidadMovimiento(
  movimiento: Pick<MovimientoInventario, "tipo" | "cantidad">,
): string {
  const signo = movimientoSigno(movimiento.tipo, movimiento.cantidad);
  const cantidad = Number.isFinite(movimiento.cantidad)
    ? Math.abs(movimiento.cantidad)
    : 0;

  return `${signo}${formatNumber(cantidad)}`;
}

export function movimientoProductoNombre(
  movimiento: Pick<MovimientoInventario, "producto" | "producto_id">,
): string {
  return movimiento.producto?.nombre ?? `Producto #${movimiento.producto_id}`;
}

export function movimientoOrdenNumero(
  movimiento: Pick<MovimientoInventario, "orden">,
): string | null {
  return movimiento.orden?.numero ?? null;
}

/* -------------------------------------------------------------------------- */
/* Productos y stock                                                           */
/* -------------------------------------------------------------------------- */

export function productoStockBajo(
  producto: Pick<Producto, "stock_actual" | "stock_minimo"> & {
    stock_bajo?: boolean;
  },
): boolean {
  if (typeof producto.stock_bajo === "boolean") return producto.stock_bajo;

  // Mínimo 0 = sin alerta (I-07), igual que el back.
  return producto.stock_minimo > 0 && producto.stock_actual <= producto.stock_minimo;
}

/** El backend manda `valor_stock`; si falta, se estima con el costo promedio. */
export function productoValorStock(
  producto: Pick<Producto, "stock_actual" | "costo_promedio"> & {
    valor_stock?: number;
  },
): number {
  if (
    typeof producto.valor_stock === "number" &&
    Number.isFinite(producto.valor_stock)
  ) {
    return producto.valor_stock;
  }

  return roundMoney(producto.stock_actual * producto.costo_promedio);
}

export type StockEstado = "agotado" | "bajo" | "normal";

export interface StockEstadoMeta {
  estado: StockEstado;
  label: string;
  tone: EstadoTone;
  description: string;
}

export function productoStockEstado(
  producto: Pick<Producto, "stock_actual" | "stock_minimo"> & {
    stock_bajo?: boolean;
  },
): StockEstadoMeta {
  if (producto.stock_actual <= 0) {
    return {
      estado: "agotado",
      label: "Sin stock",
      tone: "danger",
      description: "No hay unidades disponibles.",
    };
  }

  if (productoStockBajo(producto)) {
    return {
      estado: "bajo",
      label: "Stock bajo",
      tone: "warning",
      description: "Está en el mínimo o por debajo de él.",
    };
  }

  return {
    estado: "normal",
    label: "Normal",
    tone: "success",
    description: "Stock por encima del mínimo configurado.",
  };
}

export function productoStockTexto(producto: Producto): string {
  return `${formatNumber(producto.stock_actual)} ${producto.unidad_medida}`;
}

export interface ProductoCatalogOption {
  id: number;
  label: string;
  description: string;
}

/** Opciones del CatalogSelect con stock y mínimo visibles al elegir. */
export function productoCatalogOptions(
  productos: readonly Producto[],
): ProductoCatalogOption[] {
  return productos.map((producto) => ({
    id: producto.id,
    label: producto.nombre,
    description: `Stock ${productoStockTexto(producto)} · mínimo ${formatNumber(
      producto.stock_minimo,
    )} ${producto.unidad_medida}`,
  }));
}

/* -------------------------------------------------------------------------- */
/* Materiales de una orden                                                     */
/* -------------------------------------------------------------------------- */

/** Solo líneas MATERIAL con producto asociado; las libres no mueven stock. */
export function ordenMateriales(items: readonly OrdenItem[] | undefined): OrdenItem[] {
  return (items ?? []).filter(
    (item) => item.tipo === "MATERIAL" && Boolean(item.producto),
  );
}

export function materialConsumidoCantidad(item: OrdenItem): number {
  if (
    typeof item.cantidad_consumida === "number" &&
    Number.isFinite(item.cantidad_consumida)
  ) {
    return Math.max(item.cantidad_consumida, 0);
  }

  if (
    typeof item.cantidad_pendiente === "number" &&
    Number.isFinite(item.cantidad_pendiente)
  ) {
    return Math.max(item.cantidad - item.cantidad_pendiente, 0);
  }

  return item.consumido ? item.cantidad : 0;
}

export function materialPendienteCantidad(item: OrdenItem): number {
  if (
    typeof item.cantidad_pendiente === "number" &&
    Number.isFinite(item.cantidad_pendiente)
  ) {
    return Math.max(item.cantidad_pendiente, 0);
  }

  if (item.consumido) return 0;

  return Math.max(item.cantidad - materialConsumidoCantidad(item), 0);
}

export function materialEstaConsumido(item: OrdenItem): boolean {
  if (typeof item.consumido === "boolean") return item.consumido;

  return materialPendienteCantidad(item) <= 0;
}

export function materialStockInsuficiente(item: OrdenItem): boolean {
  const pendiente = materialPendienteCantidad(item);

  if (pendiente <= 0 || !item.producto) return false;

  return item.producto.stock_actual < pendiente;
}

export function materialesPendientes(
  items: readonly OrdenItem[] | undefined,
): OrdenItem[] {
  return ordenMateriales(items).filter(
    (item) => materialPendienteCantidad(item) > 0,
  );
}

export function materialesStockInsuficiente(
  items: readonly OrdenItem[] | undefined,
): OrdenItem[] {
  return ordenMateriales(items).filter(materialStockInsuficiente);
}

export function ordenTieneMateriales(
  orden: Pick<Orden, "items">,
): boolean {
  return ordenMateriales(orden.items).length > 0;
}

/* -------------------------------------------------------------------------- */
/* Estado de la URL                                                            */
/* -------------------------------------------------------------------------- */

export type InventarioTab = "existencias" | "movimientos";

export type FiltroActivo = "" | "activo" | "inactivo";

export interface ExistenciasQuery {
  search: string;
  bajoStock: boolean;
  activo: FiltroActivo;
  page: number;
  /** Filas por página (15, 25 o 50); sin dato, 15. */
  perPage?: number;
}

export interface MovimientosQuery {
  search: string;
  tipo: TipoMovimientoInventario | "";
  productoId: number | "";
  desde: string;
  hasta: string;
  page: number;
  /** Filas por página (15, 25 o 50); sin dato, 15. */
  perPage?: number;
}

function activoParam(activo: FiltroActivo): "" | 1 | 0 {
  if (activo === "activo") return 1;
  if (activo === "inactivo") return 0;

  return "";
}

export function existenciasHref(query: ExistenciasQuery): string {
  return `/inventario${buildQuery({
    tab: "existencias",
    search: query.search.trim(),
    bajo_stock: query.bajoStock ? 1 : "",
    activo: activoParam(query.activo),
    per_page: filasParam(query.perPage),
    page: query.page > 1 ? query.page : "",
  })}`;
}

export function movimientosHref(query: MovimientosQuery): string {
  return `/inventario${buildQuery({
    tab: "movimientos",
    search: query.search.trim(),
    tipo: query.tipo,
    producto_id: query.productoId,
    desde: query.desde,
    hasta: query.hasta,
    per_page: filasParam(query.perPage),
    page: query.page > 1 ? query.page : "",
  })}`;
}

export function inventarioTabHref(tab: InventarioTab): string {
  return `/inventario?tab=${tab}`;
}

/** Enlace desde existencias a los movimientos de un producto concreto. */
export function movimientosDeProductoHref(productoId: number): string {
  return movimientosHref({
    search: "",
    tipo: "",
    productoId,
    desde: "",
    hasta: "",
    page: 1,
  });
}

/* -------------------------------------------------------------------------- */
/* Formulario de producto                                                     */
/* -------------------------------------------------------------------------- */

export interface ProductoBorrador {
  nombre: string;
  unidad_medida: string;
  precio_unitario: string;
  costo: string;
  stock_minimo: string;
  /** Solo al crear: se registra como movimiento de ENTRADA. */
  stock_inicial: string;
  activo: boolean;
}

type CampoNumerico = {
  clave: string;
  valor: string;
  /** "El precio de venta", "El costo"… */
  sujeto: string;
  decimales: number;
  obligatorio?: string;
};

function validarNumero(errores: ErroresValidacion, campo: CampoNumerico) {
  const texto = campo.valor.trim();

  if (!texto) {
    if (campo.obligatorio) errores[campo.clave] = [campo.obligatorio];

    return;
  }

  const numero = parseDecimal(texto);

  if (!Number.isFinite(numero)) {
    errores[campo.clave] = [`${campo.sujeto} debe ser numérico.`];
  } else if (numero < 0) {
    errores[campo.clave] = [`${campo.sujeto} no puede ser negativo.`];
  } else if (decimalesDe(texto) > campo.decimales) {
    errores[campo.clave] = [
      `${campo.sujeto} debe tener como máximo ${campo.decimales} decimales.`,
    ];
  }
}

/**
 * Validación del formulario de producto antes de enviar. Mismas reglas y
 * textos que StoreProductoRequest/UpdateProductoRequest (MensajesProducto).
 * Las claves de error son las del back (`precio_unitario`, `costo_promedio`,
 * `stock_actual`), así los 422 caen en el mismo campo.
 */
export function validarProducto(
  form: ProductoBorrador,
  { esNuevo }: { esNuevo: boolean },
): ErroresValidacion {
  const errores: ErroresValidacion = {};

  if (!form.nombre.trim()) {
    errores.nombre = ["El nombre del producto es obligatorio."];
  }

  validarNumero(errores, {
    clave: "precio_unitario",
    valor: form.precio_unitario,
    sujeto: "El precio de venta",
    decimales: 2,
    obligatorio: "El precio de venta es obligatorio.",
  });
  validarNumero(errores, {
    clave: "stock_minimo",
    valor: form.stock_minimo,
    sujeto: "El stock mínimo",
    decimales: 3,
  });

  if (esNuevo) {
    validarNumero(errores, {
      clave: "costo_promedio",
      valor: form.costo,
      sujeto: "El costo",
      decimales: 2,
    });
    validarNumero(errores, {
      clave: "stock_actual",
      valor: form.stock_inicial,
      sujeto: "El stock inicial",
      decimales: 3,
    });
  }

  return validarLargos(errores, [
    ["nombre", "nombre", form.nombre, 200],
    ["unidad_medida", "unidad de medida", form.unidad_medida, 30],
  ]);
}

/** Payload de alta: el stock inicial solo viaja si es mayor que 0. */
export function productoPayload(form: ProductoBorrador): ProductoInput {
  const stock = form.stock_inicial.trim() ? parseDecimal(form.stock_inicial) : 0;

  return {
    nombre: form.nombre.trim(),
    unidad_medida: form.unidad_medida.trim() || null,
    precio_unitario: parseDecimal(form.precio_unitario),
    costo_promedio: form.costo.trim() ? parseDecimal(form.costo) : 0,
    stock_minimo: form.stock_minimo.trim() ? parseDecimal(form.stock_minimo) : 0,
    ...(stock > 0 ? { stock_actual: stock } : {}),
    activo: form.activo,
  };
}
