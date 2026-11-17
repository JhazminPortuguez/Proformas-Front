import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { api, expect, PASSWORD_DEMO, unico } from "./fixtures";

/**
 * Datos propios de cada prueba, creados por la API como admin y con nombres
 * únicos: ninguna prueba depende de lo que dejó otra ni del orden.
 */
type ConId = { id: number };

/** Las rutas de detalle responden con o sin `data`; esto devuelve el objeto. */
export function cuerpo<T>(respuesta: T | { data: T }): T {
  return respuesta && typeof respuesta === "object" && "data" in respuesta
    ? (respuesta as { data: T }).data
    : (respuesta as T);
}

export async function crearCliente(request: APIRequestContext, nombre = unico("Cliente")) {
  const cliente = cuerpo(
    await api<ConId | { data: ConId }>(request, "POST", "/api/v1/clientes", {
      nombre_razon: nombre,
      estado: "activo",
    }),
  );

  return { ...cliente, nombre };
}

export async function crearServicio(
  request: APIRequestContext,
  precio = 300,
  nombre = unico("Servicio"),
) {
  const servicio = cuerpo(
    await api<ConId | { data: ConId }>(request, "POST", "/api/v1/servicios", {
      nombre,
      precio_base: precio,
      activo: true,
    }),
  );

  return { ...servicio, nombre, precio };
}

/** Producto nuevo con `stock` unidades cargadas por una entrada de inventario. */
export async function crearProducto(
  request: APIRequestContext,
  { precio = 50, stock = 10, nombre = unico("Material") } = {},
) {
  const producto = cuerpo(
    await api<ConId | { data: ConId }>(request, "POST", "/api/v1/productos", {
      nombre,
      precio_unitario: precio,
      unidad_medida: "pza",
      stock_minimo: 0,
      activo: true,
    }),
  );

  await api(request, "POST", "/api/v1/inventario/entradas", {
    producto_id: producto.id,
    cantidad: stock,
    costo_unitario: precio / 2,
    motivo: "Stock inicial de la prueba E2E",
  });

  return { ...producto, nombre, precio };
}

export async function stockDe(request: APIRequestContext, productoId: number) {
  const producto = cuerpo(
    await api<{ stock_actual: string | number } | { data: { stock_actual: string | number } }>(
      request,
      "GET",
      `/api/v1/productos/${productoId}`,
    ),
  );

  return Number(producto.stock_actual);
}

/** Usuario con rol cliente vinculado a un cliente nuevo. */
export async function crearUsuarioCliente(request: APIRequestContext) {
  const cliente = await crearCliente(request);
  const email = `e2e.${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}@example.com`;

  await api(request, "POST", "/api/v1/users", {
    name: `Usuario ${cliente.nombre}`,
    email,
    password: PASSWORD_DEMO,
    rol: "cliente",
    cliente_id: cliente.id,
    activo: true,
  });

  return { cliente, email };
}

/** Elige una opción de un ComboBox con búsqueda en el servidor. */
export async function elegirEnCombo(page: Page, combo: Locator, texto: string) {
  await combo.click();
  await combo.fill(texto);
  // La lista se vuelve a pintar cuando llega la búsqueda del servidor: se
  // espera a que quede solo la opción buscada (los nombres son únicos).
  const opciones = page.getByRole("option");

  await expect(opciones).toHaveCount(1);
  await expect(opciones).toContainText(texto);
  await opciones.click();
  await expect(combo).toHaveValue(new RegExp(escapar(texto)));
}

export function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cuenta por cobrar armada por la API (proforma enviada y aceptada → orden
 * asignada, iniciada, finalizada y cerrada) con una línea libre de `monto`.
 */
export async function crearCuentaPorCobrar(
  request: APIRequestContext,
  { cliente, monto = 100 }: { cliente: { id: number }; monto?: number },
) {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(
    new Date(),
  );
  const proforma = cuerpo(
    await api<ConId | { data: ConId }>(request, "POST", "/api/v1/proformas", {
      cliente_id: cliente.id,
      fecha_emision: hoy,
      impuesto_tasa: 0,
      items: [{ tipo: "LIBRE", descripcion: "Trabajo E2E", cantidad: 1, precio_unitario: monto }],
    }),
  );

  await api(request, "POST", `/api/v1/proformas/${proforma.id}/enviar`);
  await api(request, "POST", `/api/v1/proformas/${proforma.id}/aceptar`);

  const operarios = await api<{ data: Array<{ id: number; activo: boolean }> }>(
    request,
    "GET",
    "/api/v1/users?rol=operario",
  );
  const operario = operarios.data.find((u) => u.activo)!;
  const orden = cuerpo(
    await api<ConId | { data: ConId }>(request, "POST", "/api/v1/ordenes", {
      proforma_id: proforma.id,
      operario_id: operario.id,
    }),
  );

  for (const accion of ["iniciar", "finalizar", "cerrar"]) {
    await api(request, "POST", `/api/v1/ordenes/${orden.id}/${accion}`, {});
  }

  const cuentas = await api<{ data: Array<{ id: number; orden_servicio_id?: number }> }>(
    request,
    "GET",
    `/api/v1/cuentas-por-cobrar?cliente_id=${cliente.id}`,
  );

  return { id: cuentas.data[0].id, ordenId: orden.id };
}
