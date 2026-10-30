export type Rol = "admin" | "operario" | "cliente";

export interface User {
  id: number;
  name: string;
  email: string;
  rol: Rol;
  activo: boolean;
  cliente_id: number | null;
  empresa_id: number | null;
}

export type ClienteEstado = "prospecto" | "activo" | "inactivo";

export interface Cliente {
  id: number;
  nombre_razon: string;
  nit_ci: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  estado: ClienteEstado;
  proformas_count?: number;
  ordenes_count?: number;
}

/* -------------------------------------------------------------------------- */
/* Ficha e historial de clientes                                              */
/* -------------------------------------------------------------------------- */

export interface ClienteResumenProformas {
  total: number;
  por_estado: Record<EstadoProforma, number>;
  monto_total: number;
  monto_aceptado: number;
}

export interface ClienteResumenOrdenes {
  total: number;
  activas: number;
  pendientes: number;
  asignadas: number;
  en_proceso: number;
  finalizadas: number;
  canceladas: number;
}

export interface ClienteResumenCobros {
  cuentas: number;
  saldo: number;
  vencidas: number;
  monto_total: number;
  total_pagado: number;
}

export interface ClienteResumenServicios {
  realizados: number;
  monto: number;
}

export interface ClienteResumen {
  cliente: Cliente;
  proformas: ClienteResumenProformas;
  ordenes: ClienteResumenOrdenes;
  cobros: ClienteResumenCobros;
  servicios: ClienteResumenServicios;
}

/** Línea de servicio ejecutada dentro de una orden del cliente. */
export interface HistorialServicio {
  id: number;
  orden_id: number;
  orden_numero: string | null;
  orden_estado: EstadoOrden | null;
  /** Fecha date-only (`YYYY-MM-DD`). */
  fecha: string;
  servicio_id: number;
  servicio_nombre: string | null;
  descripcion: string | null;
  cantidad: number;
  total_linea: number;
  operario_nombre: string | null;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_base: number;
  duracion_estimada_min: number | null;
  categoria: string | null;
  activo: boolean;
  visible_catalogo: boolean;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_unitario: number;
  unidad_medida: string;
  activo: boolean;
  stock_actual: number;
  stock_minimo: number;
  costo_promedio: number;
  /** Derivados que expone `GET /inventario`. */
  stock_bajo?: boolean;
  valor_stock?: number;
  movimientos_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Inventario                                                                 */
/* -------------------------------------------------------------------------- */

export type TipoMovimientoInventario =
  | "ENTRADA"
  | "SALIDA"
  | "AJUSTE"
  | "CONSUMO";

/** Referencia mínima de la orden embebida en un movimiento de inventario. */
export interface MovimientoOrdenRef {
  id: number;
  numero: string;
}

export interface MovimientoInventario {
  id: number;
  producto_id: number;
  orden_id: number | null;
  orden_item_id: number | null;
  tipo: TipoMovimientoInventario;
  /** Cantidad con signo: positiva en entradas y negativa en salidas/consumos. */
  cantidad: number;
  costo_unitario: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo: string | null;
  producto?: Producto | null;
  orden?: MovimientoOrdenRef | null;
  usuario?: User | null;
  created_at?: string | null;
}

export interface InventarioResumen {
  productos: number;
  bajo_stock: number;
  valor_inventario: number;
  movimientos_mes: number;
}

export interface EntradaInventarioInput {
  producto_id: number;
  cantidad: number;
  costo_unitario?: number;
  motivo?: string;
}

export interface AjusteInventarioInput {
  producto_id: number;
  stock_nuevo: number;
  motivo: string;
}

export interface ConsumoOrdenItemInput {
  orden_item_id: number;
  cantidad: number;
}

export type TipoProformaItem = "SERVICIO" | "MATERIAL" | "LIBRE";

export type EstadoProforma = "BORRADOR" | "ENVIADA" | "ACEPTADA" | "RECHAZADA";

export interface ProformaItem {
  id: number;
  proforma_id?: number;
  tipo: TipoProformaItem;
  servicio_id: number | null;
  producto_id: number | null;
  descripcion: string | null;
  cantidad: number;
  precio_unitario: number;
  total_linea: number;
  subtotal?: number;
  unidad_medida?: string | null;
  servicio?: Servicio | null;
  producto?: Producto | null;
}

export interface Proforma {
  id: number;
  numero: string;
  cliente_id: number;
  fecha_emision: string;
  fecha_validez: string | null;
  estado: EstadoProforma;
  moneda: "BOB" | string;
  impuesto_tasa: number;
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  observaciones: string | null;
  origen: string | null;
  solicitud_id: number | null;
  items_count?: number;
  enviada_at: string | null;
  aceptada_at: string | null;
  aceptada_por: number | null;
  rechazada_at: string | null;
  motivo_rechazo: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** Orden vigente generada desde esta proforma (si existe). */
  orden_id?: number | null;
  cliente?: Cliente | null;
  items?: ProformaItem[];
  aceptador?: User | null;
  acciones_disponibles?: string[];
}

export type ProformaItemInput =
  | {
      tipo: "SERVICIO";
      servicio_id: number;
      cantidad: number;
      descripcion?: string | null;
    }
  | {
      tipo: "MATERIAL";
      producto_id: number;
      cantidad: number;
      descripcion?: string | null;
    }
  | {
      tipo: "LIBRE";
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      unidad_medida?: string | null;
    };

export interface ProformaInput {
  cliente_id: number;
  fecha_emision: string;
  fecha_validez?: string | null;
  moneda: "BOB";
  impuesto_tasa: number;
  descuento: number;
  observaciones?: string | null;
  items: ProformaItemInput[];
}

/* -------------------------------------------------------------------------- */
/* Órdenes de servicio                                                        */
/* -------------------------------------------------------------------------- */

export type EstadoOrden =
  | "PENDIENTE"
  | "ASIGNADA"
  | "EN_PROCESO"
  | "FINALIZADA"
  | "CANCELADA";

export type TipoOrdenEvento =
  | "CREACION"
  | "ASIGNACION"
  | "INICIO"
  | "FINALIZACION"
  | "CANCELACION"
  | "CIERRE"
  | "CONSUMO";

export type OrdenAccion =
  | "ver"
  | "asignar"
  | "iniciar"
  | "finalizar"
  | "cancelar"
  | "cerrar"
  | "consumir"
  | "ver_cobro";

/** Resumen de la proforma embebido en el listado de órdenes. */
export interface OrdenProforma {
  id: number;
  numero: string;
  estado: EstadoProforma;
  moneda: string;
  total: number;
}

export interface OrdenItem {
  id: number;
  orden_id: number;
  tipo: TipoProformaItem;
  servicio_id: number | null;
  producto_id: number | null;
  descripcion: string | null;
  unidad_medida: string | null;
  cantidad: number;
  precio_unitario: number;
  total_linea: number;
  /** Avance del consumo de materiales (solo líneas MATERIAL). */
  cantidad_consumida?: number;
  cantidad_pendiente?: number;
  consumido?: boolean;
  /** Instante ISO en que la línea quedó consumida por completo. */
  consumido_at?: string | null;
  producto?: Producto | null;
  servicio?: Servicio | null;
}

export interface OrdenEvento {
  id: number;
  orden_id: number;
  tipo: TipoOrdenEvento;
  descripcion: string | null;
  estado_anterior: EstadoOrden | null;
  estado_nuevo: EstadoOrden | null;
  user_id: number | null;
  metadata?: Record<string, unknown> | null;
  usuario?: User | null;
  created_at?: string | null;
  creado_en?: string | null;
}

/** Resumen de la cuenta por cobrar embebido en una orden cerrada. */
export interface OrdenCuentaRef {
  id: number;
  numero: string;
  /** Moneda de la proforma de origen (BOB, USD, EUR). */
  moneda?: string;
  saldo: number;
  estado_cobro: EstadoCobro;
}

export interface Orden {
  id: number;
  empresa_id: number;
  numero: string;
  proforma_id: number;
  cliente_id: number;
  operario_id: number | null;
  estado: EstadoOrden;
  fecha_programada: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  observaciones: string | null;
  motivo_cancelacion: string | null;
  cancelada_at: string | null;
  cerrada_at: string | null;
  cerrada_por: number | null;
  /** Cuenta por cobrar generada al cerrar la orden (si existe). */
  cuenta_por_cobrar_id?: number | null;
  cuenta?: OrdenCuentaRef | null;
  created_by: number | null;
  updated_by: number | null;
  items_count?: number;
  acciones_disponibles?: string[];
  cliente?: Cliente | null;
  proforma?: OrdenProforma | null;
  operario?: User | null;
  items?: OrdenItem[];
  eventos?: OrdenEvento[];
  cerrador?: User | null;
  creador?: User | null;
  editor?: User | null;
  created_at?: string | null;
  updated_at?: string | null;
  creado_en?: string | null;
  actualizado_en?: string | null;
}

export interface OrdenInput {
  proforma_id: number;
  operario_id?: number;
  /** Fecha date-only (`YYYY-MM-DD`). */
  fecha_programada?: string;
  observaciones?: string;
}

/* -------------------------------------------------------------------------- */
/* Cuentas por cobrar                                                         */
/* -------------------------------------------------------------------------- */

export type EstadoCobro = "PENDIENTE" | "PARCIAL" | "PAGADA";

export type MetodoPago =
  | "EFECTIVO"
  | "TRANSFERENCIA"
  | "QR"
  | "TARJETA"
  | "OTRO";

export interface PagoCuenta {
  id: number;
  cuenta_id: number;
  monto: number;
  metodo: MetodoPago | string;
  /** Fecha date-only (`YYYY-MM-DD`) en la que se recibió el pago. */
  fecha_pago: string;
  referencia: string | null;
  observaciones: string | null;
  anulado: boolean;
  anulado_at: string | null;
  motivo_anulacion: string | null;
  /** Solo presente en el detalle; el backend decide si todavía se puede anular. */
  puede_anular?: boolean;
  usuario?: User | null;
  anulador?: User | null;
  created_at?: string | null;
}

export interface CuentaPorCobrar {
  id: number;
  numero: string;
  orden_id: number;
  cliente_id: number;
  /** Fecha date-only (`YYYY-MM-DD`). */
  fecha_emision: string;
  /** Fecha date-only (`YYYY-MM-DD`); puede faltar si no se pactó vencimiento. */
  fecha_vencimiento: string | null;
  moneda: string;
  monto_total: number;
  saldo: number;
  estado_cobro: EstadoCobro;
  vencida: boolean;
  dias_vencida: number;
  total_pagado: number;
  pagos_count: number;
  acciones_disponibles?: string[];
  cliente?: Cliente | null;
  orden?: {
    id: number;
    numero: string;
    estado: EstadoOrden;
  } | null;
  /** Solo en el detalle: incluye los pagos anulados. */
  pagos?: PagoCuenta[];
}

export interface CxCResumen {
  cuentas: number;
  pendientes: number;
  vencidas: number;
  saldo: number;
  cobrado_mes: number;
  monto_total: number;
}

export interface PagoCuentaInput {
  monto: number;
  metodo: MetodoPago;
  /** Fecha date-only (`YYYY-MM-DD`). */
  fecha_pago?: string;
  referencia?: string;
  observaciones?: string;
}

export interface SolicitudItem {
  id: number;
  solicitud_id?: number;
  descripcion: string;
  cantidad: number;
  unidad_medida: string | null;
  observaciones: string | null;
}

export interface Solicitud {
  id: number;
  numero?: string | null;
  cliente_id: number;
  descripcion: string;
  estado: string;
  fecha?: string | null;
  created_at: string;
  updated_at?: string | null;
  convertida_proforma_id?: number | null;
  cliente?: Cliente | null;
  items?: SolicitudItem[];
}

export interface SolicitudInput {
  cliente_id: number;
  descripcion: string;
  items: {
    descripcion: string;
    cantidad: number;
    unidad_medida?: string | null;
    observaciones?: string | null;
  }[];
}

/**
 * Actividad reciente del dashboard. El esquema se fue ampliando: los campos
 * nuevos son opcionales para tolerar respuestas antiguas sin romper la vista.
 */
export interface ActividadReciente {
  id?: number | string;
  tipo?: string;
  titulo?: string;
  descripcion?: string;
  mensaje?: string;
  estado?: string | null;
  monto?: number | null;
  cuenta_id?: number | null;
  producto_id?: number | null;
  usuario?: string;
  created_at?: string;
  fecha?: string;
}

/** Totales de órdenes del dashboard (contrato nuevo). */
export interface DashboardOrdenes {
  total: number;
  activas: number;
  pendientes: number;
  asignadas: number;
  en_proceso: number;
  finalizadas: number;
  canceladas: number;
  por_estado?: Record<string, number>;
  finalizadas_mes?: number;
  cerradas_mes?: number;
}

export interface DashboardProductoBajoStock {
  id: number;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  unidad_medida: string;
}

export interface DashboardInventario {
  productos: number;
  stock_bajo: number;
  valor_inventario: number;
  movimientos_mes: number;
  productos_bajo_stock?: DashboardProductoBajoStock[];
}

/** Bandas de antigüedad de la cartera (mismo criterio que el módulo de cobros). */
export interface DashboardAging {
  al_dia: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
}

export interface DashboardCobros {
  cuentas: number;
  pendientes: number;
  vencidas: number;
  saldo: number;
  monto_vencido?: number;
  cobrado_mes: number;
  monto_total: number;
  aging?: Partial<DashboardAging>;
}

export interface DashboardServicioSolicitado {
  servicio_id: number;
  nombre: string;
  cantidad: number;
  total: number;
}

export interface DashboardData {
  clientes: number;
  servicios: number;
  proformas: number;
  proformas_por_estado: Record<string, number>;
  monto_proformas_mes: number;
  monto_cotizado_mes?: number;
  monto_aceptado_mes?: number;
  /** @deprecated usar `ordenes.activas` cuando exista. */
  ordenes_pendientes?: number | null;
  /** @deprecated usar `cobros.saldo` cuando exista. */
  saldo_por_cobrar?: number | null;
  ordenes?: DashboardOrdenes;
  inventario?: DashboardInventario;
  cobros?: DashboardCobros;
  ingresos_mes?: number;
  servicios_mas_solicitados?: DashboardServicioSolicitado[];
  actividad_reciente?: ActividadReciente[];
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export type ErroresValidacion = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly errors?: ErroresValidacion;

  constructor(message: string, status: number, errors?: ErroresValidacion) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isUnauthorized(error: unknown): boolean {
  return isApiError(error) && (error.status === 401 || error.status === 419);
}

export function isForbidden(error: unknown): boolean {
  return isApiError(error) && error.status === 403;
}

export interface ClienteInput {
  nombre_razon: string;
  nit_ci?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  estado: ClienteEstado;
}

export interface ServicioInput {
  nombre: string;
  descripcion?: string | null;
  precio_base: number;
  duracion_estimada_min?: number | null;
  categoria?: string | null;
  activo: boolean;
  visible_catalogo: boolean;
}

export interface UsuarioInput {
  name?: string;
  email?: string;
  rol?: Rol;
  activo?: boolean;
  password?: string;
  password_confirmation?: string;
}

export interface RegistroInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  telefono?: string;
}
