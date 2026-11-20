import { api, expect, OPERARIO_EMAIL, test } from "./fixtures";
import { crearCliente, cuerpo } from "./datos";

/**
 * C-05: dos personas editan el mismo cliente, sobre la COPIA de la base. El
 * admin abre el formulario; mientras tanto el operario guarda el cliente;
 * el admin no pisa ese cambio: ve el aviso y recarga los datos.
 */
test("si otro usuario guardó el cliente, el formulario avisa y permite recargar", async ({
  page,
  sesion,
}) => {
  test.slow();

  const cliente = await crearCliente(page.request);

  // 1. El admin abre la ficha y el formulario (versión 1).
  await page.goto(`/clientes/${cliente.id}`);

  const dialog = page.getByRole("dialog", { name: /Editar cliente/ });

  await expect(async () => {
    await page.getByRole("button", { name: "Editar" }).click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  // 2. Mientras tanto, el operario guarda el mismo cliente.
  const operario = await sesion(OPERARIO_EMAIL);
  const guardado = cuerpo(
    await api<{ version: number; telefono: string }>(
      operario.context.request,
      "PUT",
      `/api/v1/clientes/${cliente.id}`,
      { nombre_razon: cliente.nombre, estado: "activo", telefono: "70011111", version: 1 },
    ),
  );

  expect(guardado.version).toBe(2);

  // 3. El admin guarda lo suyo: no pisa el cambio del operario.
  const telefono = dialog.getByRole("textbox", { name: /Teléfono/ });

  await telefono.fill("70022222");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(dialog.getByText("Este cliente cambió mientras lo editabas")).toBeVisible();
  await expect(dialog.getByText(/^Otro usuario modificó este cliente \(Operario Demo, /)).toBeVisible();
  await expect(telefono).toHaveValue("70022222");

  const enElBack = cuerpo(
    await api<{ telefono: string; version: number }>(page.request, "GET", `/api/v1/clientes/${cliente.id}`),
  );

  expect(enElBack.telefono).toBe("70011111");

  // 4. Recarga: ve el teléfono del operario y, si guarda, usa la versión 2.
  await dialog.getByRole("button", { name: "Recargar datos" }).click();
  await expect(telefono).toHaveValue("70011111");
  await expect(dialog.getByText("Este cliente cambió mientras lo editabas")).toHaveCount(0);

  await telefono.fill("70033333");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(dialog).toBeHidden();

  const final = cuerpo(
    await api<{ telefono: string; version: number }>(page.request, "GET", `/api/v1/clientes/${cliente.id}`),
  );

  expect(final).toMatchObject({ telefono: "70033333", version: 3 });
});

/**
 * Pestaña abierta con el front anterior a C-05: guarda sin `version`. Se
 * simula quitando la versión del pedido; el usuario ve qué hacer (recargar)
 * en vez de "Revisa 1 campo" sin ningún campo marcado.
 */
test("una pestaña desactualizada pide recargar la página", async ({ page }) => {
  test.slow();

  const cliente = await crearCliente(page.request);

  await page.route(`**/api/v1/clientes/${cliente.id}`, async (route) => {
    if (route.request().method() !== "PUT") return route.continue();

    const datos = route.request().postDataJSON() as Record<string, unknown>;

    delete datos.version;
    await route.continue({ postData: JSON.stringify(datos) });
  });

  await page.goto(`/clientes/${cliente.id}`);

  const dialog = page.getByRole("dialog", { name: /Editar cliente/ });

  await expect(async () => {
    await page.getByRole("button", { name: "Editar" }).click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  await dialog.getByRole("textbox", { name: /Teléfono/ }).fill("70044444");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(
    dialog.getByText(
      "Esta pantalla está desactualizada y no se guardó ningún cambio. Recarga la página (F5) y vuelve a editar el cliente.",
    ),
  ).toBeVisible();
  await expect(dialog.getByText(/Revisa \d+ campo/)).toHaveCount(0);

  const enElBack = cuerpo(
    await api<{ telefono: string | null }>(page.request, "GET", `/api/v1/clientes/${cliente.id}`),
  );

  expect(enElBack.telefono).not.toBe("70044444");
});
