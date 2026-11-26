import { crearUsuarioCliente } from "./datos";
import { expect, PASSWORD_USUARIO_E2E, test } from "./fixtures";

/**
 * Ronda B, parte 3 (OWASP A07), sobre la COPIA: un cliente cambia su
 * contraseña desde el portal y solo la nueva sirve para entrar.
 */
test("el cliente cambia su contraseña y entra con la nueva", async ({ page, sesion, anonimo }) => {
  test.slow();

  const { email } = await crearUsuarioCliente(page.request);
  const { page: portal } = await sesion(email, PASSWORD_USUARIO_E2E);

  await portal.goto("/portal");
  await portal.getByRole("button", { name: "Cambiar contraseña" }).click();

  const dialogo = portal.getByRole("dialog");

  await dialogo.getByLabel(/^Contraseña actual/).fill(PASSWORD_USUARIO_E2E);
  await dialogo.getByLabel(/^Contraseña nueva/).fill("NuevaClave2026");
  await dialogo.getByLabel(/^Repite la contraseña nueva/).fill("NuevaClave2026");
  await dialogo.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(dialogo.getByText(/Tu contraseña se cambió/)).toBeVisible();

  // Con la anterior ya no entra; con la nueva, sí.
  const { page: login } = await anonimo();

  await login.goto("/login");
  await login.getByLabel("Correo electrónico").fill(email);
  await login.getByLabel("Contraseña").fill(PASSWORD_USUARIO_E2E);
  await login.getByRole("button", { name: "Ingresar" }).click();
  await expect(login.getByText("Correo o contraseña incorrectos.")).toBeVisible();

  await login.getByLabel("Contraseña").fill("NuevaClave2026");
  await login.getByRole("button", { name: "Ingresar" }).click();
  await expect(login).toHaveURL(/\/portal/);
});

test("el menú del personal ofrece Cambiar contraseña (ya no lleva a Configuración)", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /^Menú de / }).click();
  await page.getByRole("menuitem", { name: "Cambiar contraseña" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Cambiar contraseña" })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
});
