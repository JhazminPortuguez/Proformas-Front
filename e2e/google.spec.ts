import { expect, test } from "./fixtures";

/**
 * Ronda B, parte 2. La copia no tiene credenciales de Google: el botón no
 * aparece y la ruta del back responde 404. El flujo con Google se prueba en
 * el back con Socialite simulado (GoogleLoginTest); aquí no se usan cuentas
 * reales.
 */
test("sin credenciales de Google no hay botón; los motivos de vuelta se explican", async ({ anonimo }) => {
  const { page } = await anonimo();

  const estado = await page.request.get("/api/v1/auth/google/estado", { headers: { Accept: "application/json" } });
  expect(await estado.json()).toEqual({ habilitado: false });
  expect((await page.request.get("/api/v1/auth/google/redirect", { maxRedirects: 0 })).status()).toBe(404);

  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Continuar con Google/ })).toHaveCount(0);

  await page.goto("/registro");
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Registrarme con Google/ })).toHaveCount(0);

  await page.goto("/login?google=superusuario");
  await expect(page.getByRole("alert").filter({ hasText: "No pudimos ingresar con Google" })).toContainText(
    "El superusuario no puede entrar con Google",
  );
});
