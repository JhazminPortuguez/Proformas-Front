import { expect, test } from "@playwright/test";

let warnings: string[] = [];

test.beforeEach(async ({ page }) => {
  warnings = [];
  page.on("console", (message) => {
    if (
      message.type() === "warning" &&
      /visible label|aria-label|aria-labelledby|PressResponder was rendered without a pressable child|Pressable child must be focusable/i.test(
        message.text(),
      )
    ) {
      warnings.push(message.text());
    }
  });
});

test.afterEach(() => {
  expect(warnings, `Warnings de accesibilidad:\n${warnings.join("\n")}`).toEqual(
    [],
  );
});

test("dashboard, proformas y órdenes cargan sin warnings de accesibilidad", async ({
  page,
}) => {
  await page.goto("/dashboard");

  // Validamos los KPIs reales y que la pantalla no emita el warning de labels
  // de React Aria.
  await expect(
    page.getByRole("heading", { level: 1, name: /^Hola, / }),
  ).toBeVisible();

  const pulso = page.getByRole("region", { name: "Pulso del mes" });

  await expect(pulso).toBeVisible();

  const clientes = pulso.getByRole("link", { name: /Clientes/ });
  const cotizado = pulso.getByRole("link", { name: /Cotizado del mes/ });
  const stock = pulso.getByRole("link", { name: /Stock bajo/ });

  await expect(clientes).toBeVisible();
  await expect(clientes).toContainText(/\d/);
  await expect(cotizado).toBeVisible();
  await expect(cotizado).toContainText(/Bs/);
  await expect(stock).toBeVisible();

  const pipeline = page.getByRole("region", { name: "Pipeline" });

  await expect(pipeline).toBeVisible();
  await expect(
    pipeline.getByRole("heading", { name: "Proformas por estado" }),
  ).toBeVisible();
  await expect(
    pipeline.getByRole("heading", { name: "Órdenes por estado" }),
  ).toBeVisible();

  await expect(page.getByRole("region", { name: "Cobranza" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Inventario" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Actividad reciente" }),
  ).toBeVisible();

  // Sin scroll horizontal en los anchos soportados (móvil y tablet).
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      )
      .toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/proformas");
  await expect(
    page.getByRole("heading", { name: "Proformas", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nueva proforma" }),
  ).toBeVisible();

  await page.goto("/proformas/nueva");
  await expect(
    page.getByRole("heading", { name: "Nueva proforma" }),
  ).toBeVisible();

  // Abrir el ComboBox de cliente dispara el patrón de React Aria que antes
  // emitía el warning de label. Debe quedar silencioso.
  const cliente = page.getByRole("combobox", { name: "Cliente" }).first();
  await cliente.click();
  await cliente.fill("Demo");
  await expect(page.getByRole("option").first()).toBeVisible();

  await page.goto("/ordenes");
  await expect(
    page.getByRole("heading", { name: "Órdenes de servicio", exact: true }),
  ).toBeVisible();

  const orderLink = page.locator('a[href^="/ordenes/"]').first();
  const href = await orderLink.getAttribute("href");

  expect(href).toMatch(/^\/ordenes\/\d+$/);
  await page.goto(href!);
  await expect(page.getByRole("heading", { name: /^Orden OS-/ })).toBeVisible();
  await expect(page.getByText(/Historial|Bitácora/).first()).toBeVisible();
});

test("la ficha de una proforma aceptada ofrece ver su orden", async ({
  page,
}) => {
  const cookies = await page.context().cookies();
  const xsrf = cookies.find((cookie) => cookie.name === "XSRF-TOKEN")?.value;

  expect(xsrf).toBeTruthy();

  const response = await page.request.get(
    "/api/v1/proformas?estado=ACEPTADA&per_page=1",
    { headers: { Accept: "application/json" } },
  );

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    data?: Array<{ id: number }>;
  };
  const proforma = body.data?.[0];

  expect(proforma?.id).toBeTruthy();

  await page.goto(`/proformas/${proforma!.id}`);
  await expect(page.getByRole("link", { name: "Ver orden" })).toBeVisible();

  const verCliente = page.getByRole("link", { name: "Ver cliente" });

  await expect(verCliente).toHaveAttribute("href", /^\/clientes\/\d+$/);
});

test("la ficha del cliente muestra resumen y todas sus pestañas", async ({
  page,
}) => {
  await page.goto("/clientes");
  await expect(
    page.getByRole("heading", { name: "Clientes", exact: true }),
  ).toBeVisible();

  const historial = page
    .getByRole("link", { name: /^Ver historial de / })
    .first();

  const href = await historial.getAttribute("href");

  expect(href).toMatch(/^\/clientes\/\d+$/);
  await page.goto(href!);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Resumen del cliente" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Editar" }),
  ).toBeVisible();

  const tabs = page.getByRole("navigation", {
    name: "Secciones del cliente",
  });

  await tabs.getByRole("link", { name: /^Proformas/ }).click();
  await expect(
    page.getByRole("region", { name: "Proformas del cliente" }).first(),
  ).toBeVisible();

  await tabs.getByRole("link", { name: /^Órdenes/ }).click();
  await expect(
    page.getByRole("region", { name: "Órdenes del cliente" }).first(),
  ).toBeVisible();

  await tabs.getByRole("link", { name: /^Cobros/ }).click();
  await expect(
    page.getByRole("region", { name: "Cuentas por cobrar del cliente" }).first(),
  ).toBeVisible();

  await tabs.getByRole("link", { name: /^Servicios/ }).click();
  await expect(
    page.getByRole("region", { name: "Servicios realizados al cliente" }).first(),
  ).toBeVisible();

  // Sin scroll horizontal en móvil.
  await page.setViewportSize({ width: 375, height: 900 });
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
});

test("inventario carga existencias, movimientos y sus diálogos", async ({
  page,
}) => {
  await page.goto("/inventario");

  await expect(
    page.getByRole("heading", { name: "Inventario", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Valor del inventario")).toBeVisible();
  await expect(page.getByText("Movimientos del mes")).toBeVisible();

  await expect(
    page.getByRole("link", { name: /^Existencias/ }),
  ).toBeVisible();

  // Abrir el diálogo de entrada entrena el ComboBox de producto: es el patrón
  // de React Aria que antes emitía el warning de label.
  const entrada = page.getByRole("button", { name: "Registrar entrada" });
  if (await entrada.count()) {
    await entrada.first().click();

    const dialog = page.getByRole("dialog", {
      name: "Registrar entrada de stock",
    });

    await expect(dialog).toBeVisible();

    const producto = dialog.getByRole("combobox", { name: "Producto" });
    await producto.click();
    await expect(producto).toBeVisible();

    await dialog.getByRole("button", { name: "Cancelar" }).click();
  }

  await page
    .getByRole("navigation", { name: "Secciones de inventario" })
    .getByRole("link", { name: /^Movimientos/ })
    .click();

  await expect(
    page.getByRole("region", { name: "Movimientos de inventario" }),
  ).toBeVisible();
  await expect(page.getByLabel("Buscar movimiento")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Producto" })).toBeVisible();
});

test("cobros carga el listado y abre el diálogo de pago", async ({ page }) => {
  await page.goto("/cobros");

  await expect(
    page.getByRole("heading", { name: "Cuentas por cobrar", exact: true }),
  ).toBeVisible();

  // Si el endpoint de cobros todavía no está desplegado, la pantalla muestra
  // el estado de error y no hay filtros que entrenar.
  const search = page.getByLabel("Buscar cuenta");

  if (await search.count()) {
    await expect(search).toBeVisible();

    // Abrir el ComboBox de cliente entrena el patrón de React Aria que antes
    // emitía el warning de label.
    const cliente = page.getByRole("combobox", { name: "Cliente" }).first();

    if (await cliente.count()) {
      await cliente.click();
      await expect(cliente).toBeVisible();
      await page.keyboard.press("Escape");
    }
  }

  const cobroLink = page.locator('a[href^="/cobros/"]').first();

  // Con el backend de cobros todavía sin datos, el listado vacío es válido.
  if (!(await cobroLink.count())) return;

  const href = await cobroLink.getAttribute("href");

  expect(href).toMatch(/^\/cobros\/\d+$/);

  await page.goto(href!);
  await expect(page.getByRole("heading", { name: /^Cobro / })).toBeVisible();
  await expect(page.getByText("Datos de la cuenta")).toBeVisible();

  const pagar = page.getByRole("button", { name: "Registrar pago" }).first();

  if (await pagar.count()) {
    await pagar.click();

    const dialog = page.getByRole("dialog", { name: "Registrar pago" });

    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("textbox", { name: "Monto" }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /Método de pago/ }),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Cancelar" }).click();
  }
});

test("los diálogos de clientes no emiten warnings", async ({ page }) => {
  await page.goto("/clientes");
  await page.waitForTimeout(1000);

  await page
    .getByRole("button", { name: /^Editar / })
    .first()
    .click();

  const editar = page.getByRole("dialog");

  await expect(editar).toBeVisible();
  await expect(editar).toContainText("Editar cliente");
  await editar.getByRole("button", { name: "Cancelar" }).click();

  await page
    .getByRole("button", { name: /^Eliminar / })
    .first()
    .click();

  const eliminar = page.getByRole("alertdialog", { name: "Eliminar cliente" });

  await expect(eliminar).toBeVisible();
  await eliminar.getByRole("button", { name: "Cancelar" }).click();
});

test("la pestaña de materiales de una orden expone el consumo", async ({
  page,
}) => {
  await page.goto("/ordenes");

  const orderLink = page.locator('a[href^="/ordenes/"]').first();
  const href = await orderLink.getAttribute("href");

  expect(href).toMatch(/^\/ordenes\/\d+$/);
  await page.goto(href!);

  await page.getByRole("link", { name: /^Materiales/ }).click();

  await expect(
    page.getByRole("heading", { name: "Materiales de la orden" }),
  ).toBeVisible();

  const consumir = page.getByRole("button", { name: "Consumir materiales" });

  if (await consumir.count()) {
    await consumir.click();

    const dialog = page.getByRole("dialog", { name: "Consumir materiales" });

    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Consumir materiales" }),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Cancelar" }).click();
  }
});
