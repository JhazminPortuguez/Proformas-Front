import type { Page } from "@playwright/test";
import { api, expect, OPERARIO_EMAIL, test, unico } from "./fixtures";

/** Abre "Más acciones" del producto y elige una opción del menú. */
async function accion(page: Page, nombre: string, opcion: RegExp) {
  const item = page.getByRole("menuitem", { name: opcion });

  // Un clic antes de hidratar se pierde: se reintenta hasta que abre el menú.
  await expect(async () => {
    await page.getByRole("button", { name: `Más acciones de ${nombre}` }).first().click();
    await expect(item).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await item.click();
}

/**
 * Formulario de productos en Inventario (solo admin), sobre la COPIA de la
 * base: alta con stock inicial (queda como ENTRADA en el historial), edición,
 * desactivar/activar y eliminación protegida. El operario no ve los botones.
 */
test("el admin crea, edita, desactiva y reactiva un producto", async ({ page }) => {
  test.slow();

  const nombre = unico("Cable UTP cat 6");

  await page.goto("/inventario");

  // Clic antes de hidratar se pierde: se reintenta hasta que abre el panel.
  const panel = page.getByRole("dialog", { name: /Nuevo producto/ });

  await expect(async () => {
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    await expect(panel).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  // Validación en el navegador con el texto del back.
  await panel.getByRole("textbox", { name: /^Precio de venta/ }).fill("8,555");
  await panel.getByRole("button", { name: "Crear producto" }).click();
  await expect(panel.getByText("El nombre del producto es obligatorio.")).toBeVisible();
  await expect(
    panel.getByText("El precio de venta debe tener como máximo 2 decimales."),
  ).toBeVisible();

  await panel.getByRole("textbox", { name: /^Nombre/ }).fill(nombre);
  await panel.getByRole("textbox", { name: /^Unidad de medida/ }).fill("metro");
  await panel.getByRole("textbox", { name: /^Precio de venta/ }).fill("8,50");
  await panel.getByRole("textbox", { name: /^Costo/ }).fill("5.25");
  await panel.getByRole("textbox", { name: /^Stock mínimo/ }).fill("20");
  await panel.getByRole("textbox", { name: /^Stock inicial/ }).fill("150");
  await panel.getByRole("button", { name: "Crear producto" }).click();
  await expect(panel).toBeHidden();

  // El stock inicial quedó como una ENTRADA en el historial.
  const lista = await api<{ data: Array<{ id: number; stock_actual: number }> }>(
    page.request,
    "GET",
    `/api/v1/productos?search=${encodeURIComponent(nombre)}`,
  );

  expect(lista.data).toHaveLength(1);
  const producto = lista.data[0];

  expect(Number(producto.stock_actual)).toBe(150);

  const movimientos = await api<{
    data: Array<{ tipo: string; cantidad: number; motivo: string | null }>;
  }>(page.request, "GET", `/api/v1/inventario/movimientos?producto_id=${producto.id}`);

  expect(movimientos.data).toHaveLength(1);
  expect(movimientos.data[0].tipo).toBe("ENTRADA");
  expect(Number(movimientos.data[0].cantidad)).toBe(150);

  // Editar el precio de venta.
  await page.goto(`/inventario?search=${encodeURIComponent(nombre)}`);
  await accion(page, nombre, /^Editar/);

  const editar = page.getByRole("dialog", { name: /Editar producto/ });

  await expect(editar.getByRole("textbox", { name: /^Stock inicial/ })).toHaveCount(0);
  await editar.getByRole("textbox", { name: /^Precio de venta/ }).fill("9");
  await editar.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(editar).toBeHidden();

  // Desactivar y volver a activar.
  await accion(page, nombre, /^Desactivar/);
  await page.getByRole("alertdialog").getByRole("button", { name: "Desactivar" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect
    .poll(async () => {
      const r = await api<{ activo: boolean } | { data: { activo: boolean } }>(
        page.request,
        "GET",
        `/api/v1/productos/${producto.id}`,
      );

      return "data" in r ? r.data.activo : r.activo;
    })
    .toBe(false);
  await expect(
    page.getByRole("grid", { name: "Existencias de inventario" }).getByText("Inactivo"),
  ).toBeVisible();

  await accion(page, nombre, /^Activar/);
  await page.getByRole("alertdialog").getByRole("button", { name: "Activar" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect
    .poll(async () => {
      const r = await api<{ activo: boolean } | { data: { activo: boolean } }>(
        page.request,
        "GET",
        `/api/v1/productos/${producto.id}`,
      );

      return "data" in r ? r.data.activo : r.activo;
    })
    .toBe(true);

  // Con movimientos no se elimina: el diálogo muestra el motivo del back.
  await accion(page, nombre, /^Eliminar/);
  const eliminar = page.getByRole("alertdialog");

  await eliminar.getByRole("button", { name: "Eliminar" }).click();
  await expect(eliminar.getByText(/tiene movimientos de inventario/)).toBeVisible();
  await eliminar.getByRole("button", { name: "Cancelar" }).click();

  const final = await api<{ precio_unitario: number; activo: boolean } | {
    data: { precio_unitario: number; activo: boolean };
  }>(page.request, "GET", `/api/v1/productos/${producto.id}`);
  const datos = "data" in final ? final.data : final;

  expect(Number(datos.precio_unitario)).toBe(9);
  expect(datos.activo).toBe(true);
});

test("el operario no ve los botones de gestión de productos", async ({ sesion }) => {
  test.slow();

  const { page, context } = await sesion(OPERARIO_EMAIL);

  await page.goto("/inventario");
  await expect(page.getByRole("heading", { name: "Inventario", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nuevo producto" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Más acciones de / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Editar / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^(Desactivar|Activar) / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Eliminar / })).toHaveCount(0);

  // Y la API se lo niega.
  const respuesta = await context.request.post("/api/v1/productos", {
    data: { nombre: "No permitido", precio_unitario: 1 },
    headers: { Accept: "application/json" },
  });

  expect([403, 419]).toContain(respuesta.status());
});

test("Existencias cabe a 1280 px con las acciones del admin", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/inventario");

  const tabla = page.getByRole("grid", { name: "Existencias de inventario" });

  await expect(tabla).toBeVisible();
  const desborde = await tabla.evaluate((el) => {
    const contenedor = el.closest("[class*=overflow]") ?? el.parentElement!;
    return contenedor.scrollWidth - contenedor.clientWidth;
  });

  expect(desborde).toBeLessThanOrEqual(1);
});
