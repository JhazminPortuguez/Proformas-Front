import { enlaceDeVerificacion } from "./datos";
import { expect, test } from "./fixtures";

/**
 * Ronda A, parte 3, sobre la COPIA de la base: un cliente se registra en el
 * portal, abre el enlace del correo y queda verificado.
 *
 * El back de las pruebas usa MAIL_MAILER=log (no salen correos reales): el
 * enlace se lee de storage/logs/laravel.log (ver `enlaceDeVerificacion`).
 */

test("registro → enlace del correo → correo verificado", async ({ anonimo }) => {
  test.setTimeout(120_000);

  const { page } = await anonimo();
  const email = `e2e.verifica.${Date.now().toString(36)}@example.com`;

  // 1. Se registra en el portal.
  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill("Cliente Verificación E2E");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Password123!");
  await page.getByLabel("Confirmar contraseña").fill("Password123!");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/portal/);

  // 2. Sin verificar: ve su portal con el aviso y no puede enviar solicitudes.
  const aviso = page.getByText("Verifica tu correo", { exact: true });

  await expect(aviso).toBeVisible();
  await page.goto("/portal/solicitar");
  await expect(page.getByRole("button", { name: "Enviar solicitud" })).toBeDisabled();

  const yo = (await (await page.request.get("/api/v1/auth/me")).json()) as {
    id: number;
    email_verified_at: string | null;
  };

  expect(yo.email_verified_at).toBeNull();

  // 3. Abre el enlace del correo: vuelve al front, verificado.
  let enlace: string | null = null;

  await expect(() => {
    enlace = enlaceDeVerificacion(yo.id);
    expect(enlace).not.toBeNull();
  }).toPass({ timeout: 15_000 });

  await page.goto(enlace!);
  await expect(page).toHaveURL(/\/verificar-correo\?estado=verificado$/);
  await expect(page.getByRole("heading", { level: 1, name: "Tu correo fue verificado" })).toBeVisible();

  // 4. Va a su portal: sin aviso y ya puede enviar.
  await page.getByRole("link", { name: "Ir a mi portal" }).click();
  await expect(page).toHaveURL(/\/portal$/);
  await expect(aviso).toHaveCount(0);
  await page.goto("/portal/solicitar");
  await expect(page.getByRole("button", { name: "Enviar solicitud" })).toBeEnabled();

  // 5. El mismo enlace otra vez: avisa que ya estaba verificado.
  await page.goto(enlace!);
  await expect(page.getByRole("heading", { level: 1, name: "Tu correo ya estaba verificado" })).toBeVisible();
});
