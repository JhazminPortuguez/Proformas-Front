import { api, expect, SUPER_EMAIL, SUPER_PASSWORD, test } from "./fixtures";

/**
 * Ronda B, parte 1, sobre la COPIA de la base: el superusuario cambia un
 * parámetro del sistema, la proforma nueva del admin lo usa y el admin ya
 * no ve Configuración.
 *
 * El superusuario de la copia se crea con el comando de instalación
 * (`php artisan sistema:crear-superusuario --password-temporal`) y sus datos
 * llegan por E2E_SUPER_EMAIL y E2E_SUPER_PASSWORD.
 */
type Parametros = { impuesto_por_defecto: string; dias_validez_por_defecto: number | null };

function hoyEnBolivia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
}

function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);

  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

test("el superusuario cambia un parámetro y el admin ya no ve Configuración", async ({
  page,
  anonimo,
}) => {
  test.slow();
  expect(SUPER_EMAIL, "Falta E2E_SUPER_EMAIL (superusuario creado con el comando en la copia)").not.toBe("");

  // 1. El superusuario entra por el login y llega a Configuración.
  const { page: sp } = await anonimo();

  await sp.goto("/login");
  await sp.getByLabel("Correo electrónico").fill(SUPER_EMAIL);
  await sp.getByLabel("Contraseña").fill(SUPER_PASSWORD);
  await sp.getByRole("button", { name: "Ingresar" }).click();
  await expect(sp).toHaveURL(/\/configuracion$/, { timeout: 60_000 });

  // Su menú: solo Configuración, Usuarios y Estado del sistema.
  const menuSuper = sp.getByRole("navigation", { name: "Navegación principal" });

  await expect(menuSuper.getByRole("link")).toHaveText(["Usuarios", "Configuración", "Estado del sistema"]);

  // No entra a la operación: el Panel lo devuelve a Configuración.
  await sp.goto("/dashboard");
  await expect(sp).toHaveURL(/\/configuracion$/);

  const antes = await api<Parametros>(sp.request, "GET", "/api/v1/parametros");

  try {
    // 2. Cambia los parámetros.
    const impuesto = sp.getByRole("textbox", { name: /Impuesto por defecto/ });
    const dias = sp.getByRole("textbox", { name: /Días de validez por defecto/ });

    await impuesto.fill("14,5");
    await dias.fill("21");
    await sp.getByRole("button", { name: "Guardar parámetros" }).click();
    await expect(sp.getByText(/^Parámetros guardados/)).toBeVisible();

    // 3. La proforma nueva del admin empieza con esos valores.
    await page.goto("/proformas/nueva");
    await expect(page.getByLabel(/Impuesto/)).toHaveValue("14.5");
    await expect(page.getByLabel(/Validez/)).toHaveValue(sumarDias(hoyEnBolivia(), 21));

    // 4. El admin ya no ve Configuración (menú, ruta y API).
    const menuAdmin = page.getByRole("navigation", { name: "Navegación principal" });

    await expect(menuAdmin.getByRole("link", { name: "Usuarios" })).toBeVisible();
    await expect(menuAdmin.getByRole("link", { name: "Configuración" })).toHaveCount(0);
    await expect(menuAdmin.getByRole("link", { name: "Estado del sistema" })).toHaveCount(0);

    await page.goto("/configuracion");
    await expect(page).toHaveURL(/\/dashboard$/);

    const empresa = await page.request.get("/api/v1/empresa", { headers: { Accept: "application/json" } });
    expect(empresa.status()).toBe(403);

    // 5. Estado del sistema: el correo de la copia va al log (nunca correos reales).
    await sp.getByRole("link", { name: "Estado del sistema" }).click();
    await expect(sp.getByRole("heading", { level: 1, name: "Estado del sistema" })).toBeVisible();
    await expect(sp.getByText("Todas las migraciones están aplicadas")).toBeVisible();
    await sp.getByRole("button", { name: "Enviar correo de prueba" }).click();
    await expect(sp.getByRole("status").filter({ hasText: /quedó en el log/ }).first()).toBeVisible();
  } finally {
    await api(sp.request, "PUT", "/api/v1/parametros", antes);
  }
});

test("el admin no crea administradores ni ve al superusuario", async ({ page }) => {
  await page.goto("/usuarios");
  await expect(page.getByRole("heading", { level: 1, name: "Usuarios" })).toBeVisible();
  await expect(page.getByText(SUPER_EMAIL || "superusuario", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Rol/ }).click();
  await expect(page.getByRole("option", { name: "Operario" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Administrador" })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Superusuario" })).toHaveCount(0);
});
