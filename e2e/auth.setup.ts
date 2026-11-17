import { expect, test as setup } from "@playwright/test";

const authFile = "e2e/.auth/admin.json";
const email = process.env.E2E_ADMIN_EMAIL ?? "pepitotilcayo@example.com";
const password = process.env.E2E_ADMIN_PASSWORD ?? "password";

setup("autenticar administrador", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  // Con el servidor de desarrollo en frío, compilar el dashboard tarda.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });

  await page.context().storageState({ path: authFile });
});
