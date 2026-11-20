import { expect, test } from "./fixtures";

/**
 * D-02: la pantalla queda abierta y cambia el mes en Bolivia. Solo se mueve
 * el reloj del navegador (31/10/2026 23:59 → 01/11/2026 00:01); el back
 * sigue con su hora real.
 */
test("pasada la medianoche, un formulario abierto avisa y ofrece actualizar", async ({ page }) => {
  test.slow();

  await page.clock.install({ time: new Date("2026-11-01T03:59:00Z") });
  await page.goto("/proformas/nueva");
  await expect(page.getByRole("heading", { level: 1, name: "Nueva proforma" })).toBeVisible();

  await page.getByRole("textbox", { name: "Observaciones" }).fill("Texto que no se debe perder");

  await page.clock.fastForward("02:00");

  const aviso = page.getByRole("status").filter({ hasText: "Empezó un mes nuevo" });

  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText("se cargó el 31/10/2026 y ya es 01/11/2026");

  await aviso.getByRole("button", { name: "Actualizar" }).click();

  await expect(aviso).toBeHidden();
  // `router.refresh()` trae los datos del servidor sin borrar lo escrito.
  await expect(page.getByRole("textbox", { name: "Observaciones" })).toHaveValue("Texto que no se debe perder");
});

test("en el dashboard los datos se actualizan solos al cambiar el día", async ({ page }) => {
  test.slow();

  await page.clock.install({ time: new Date("2026-11-01T03:59:00Z") });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const recarga = page.waitForRequest(
    (pedido) => pedido.url().includes("/dashboard") && pedido.headers()["rsc"] === "1",
    { timeout: 30_000 },
  );

  await page.clock.fastForward("02:00");
  await recarga;

  await expect(page.getByText("Empezó un mes nuevo")).toHaveCount(0);
});
