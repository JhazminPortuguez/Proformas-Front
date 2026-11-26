import { api, expect, test, unico } from "./fixtures";

/**
 * Ronda C, parte 1, sobre la COPIA de la base: el admin crea una promoción en
 * su pantalla, la elige en una línea de una proforma nueva y el detalle
 * muestra el precio, el descuento y el total. Una promoción usada no se borra.
 */
test("el admin crea una promoción y la aplica en una línea de la proforma", async ({ page }) => {
  test.slow();

  const nombre = unico("Promo E2E 10");

  await page.goto("/promociones");

  const panel = page.getByRole("dialog", { name: /Nueva promoción/ });

  await expect(async () => {
    await page.getByRole("button", { name: "Nueva promoción" }).first().click();
    await expect(panel).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  // PR-05 en el navegador: el porcentaje va de 1 a 100.
  await panel.getByRole("textbox", { name: /^Nombre/ }).fill(nombre);
  await panel.getByRole("textbox", { name: /Porcentaje/ }).fill("150");
  await panel.getByRole("button", { name: "Crear promoción" }).click();
  await expect(panel.getByText("El porcentaje debe estar entre 1 y 100.").first()).toBeVisible();

  await panel.getByRole("textbox", { name: /Porcentaje/ }).fill("10");
  await panel.getByRole("button", { name: "Crear promoción" }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole("rowheader", { name: new RegExp(nombre) })).toBeVisible();

  const promociones = await api<{ data: Array<{ id: number; nombre: string; estado: string }> }>(
    page.request,
    "GET",
    `/api/v1/promociones?search=${encodeURIComponent(nombre)}`,
  );

  expect(promociones.data).toHaveLength(1);
  expect(promociones.data[0].estado).toBe("VIGENTE");

  // Proforma nueva con una línea libre de Bs 200 y la promoción.
  const clientes = await api<{ data: Array<{ id: number; nombre_razon: string }> }>(
    page.request,
    "GET",
    "/api/v1/clientes?activos=1&per_page=1",
  );
  const cliente = clientes.data[0];

  await page.goto("/proformas/nueva");

  await expect(async () => {
    await page.getByRole("button", { name: /Línea libre/ }).click();
    await expect(page.getByText("Ítem 1")).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  await page.getByRole("combobox", { name: /Cliente/ }).fill(cliente.nombre_razon.slice(0, 6));
  await page.getByRole("option", { name: new RegExp(cliente.nombre_razon.slice(0, 6)) }).first().click();
  await page.getByRole("textbox", { name: /^Descripción/ }).fill("Trabajo con promoción");
  await page.getByRole("textbox", { name: /^Precio unitario/ }).fill("200");

  await page.getByRole("button", { name: /Promoción/ }).click();
  await page.getByRole("option", { name: new RegExp(`${nombre} · 10 %`) }).click();

  const linea = page.getByLabel("Importe de la línea");

  await expect(linea).toContainText("200,00");
  await expect(linea).toContainText("− Bs");
  await expect(linea).toContainText("180,00");

  await page.getByRole("button", { name: /Guardar borrador/ }).click();
  await page.waitForURL(/\/proformas\/\d+$/);

  await expect(page.getByText(/Incluye Bs\s20,00 de descuento por promociones/).first()).toBeVisible();
  await page.getByRole("link", { name: /Ítems/ }).click();
  await page.waitForURL(/tab=items/);
  await expect(page.getByText(new RegExp(`Promoción: ${nombre} \\(10 %\\)`))).toBeVisible();

  // PR-01: ya usada, no se elimina (409); se desactiva.
  await expect(
    api(page.request, "DELETE", `/api/v1/promociones/${promociones.data[0].id}`),
  ).rejects.toThrow(/→ 409/);
});
