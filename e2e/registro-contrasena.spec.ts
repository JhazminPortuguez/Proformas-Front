import { expect, test } from "./fixtures";

/**
 * Ronda C, parte 3, sobre la COPIA: el registro del portal exige la misma
 * regla que "Cambiar contraseña" (8 caracteres, con letras y números). No se
 * llega a crear la cuenta.
 */
test("el registro rechaza una contraseña sin números con un mensaje claro", async ({ anonimo }) => {
  const { page } = await anonimo();

  await page.goto("/registro");
  await expect(page.getByText("Al menos 8 caracteres, con letras y números.")).toBeVisible();

  await page.getByLabel("Nombre completo").fill("Registro Débil");
  await page.getByLabel("Correo electrónico").fill(`debil-${Date.now()}@example.com`);
  await page.getByLabel("Contraseña", { exact: true }).fill("solotexto");
  await page.getByLabel("Confirmar contraseña").fill("solotexto");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByText("La contraseña debe tener al menos un número.").first()).toBeVisible();
  await expect(page).toHaveURL(/\/registro$/);
});
