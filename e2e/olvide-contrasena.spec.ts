import { crearUsuarioCliente, leerLogLaravel } from "./datos";
import { expect, test } from "./fixtures";

/** Último enlace de "Olvidé mi contraseña" de ese correo, leído del log (MAIL_MAILER=log). */
function enlaceRestablecer(email: string): string | null {
  const texto = leerLogLaravel()
    .replace(/=\r?\n/g, "")
    .replaceAll("=3D", "=")
    .replaceAll("&amp;", "&");
  const correo = encodeURIComponent(email).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const enlaces = texto.match(
    new RegExp(`https?://[^\\s"<]+/restablecer-contrasena\\?token=[0-9a-f]+&email=${correo}`, "g"),
  );

  return enlaces ? enlaces[enlaces.length - 1] : null;
}

/**
 * Ronda C, parte 2, sobre la COPIA: un cliente pide el enlace desde el login,
 * lo abre, elige una contraseña nueva y entra con ella. El enlace sirve una
 * sola vez.
 */
test("olvidé mi contraseña: enlace del correo, contraseña nueva y una sola vez", async ({ page, anonimo }) => {
  test.slow();

  const { email } = await crearUsuarioCliente(page.request);
  const { page: anon } = await anonimo();

  await anon.goto("/login");
  await expect(anon.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute(
    "href",
    "/olvide-contrasena",
  );
  await anon.goto("/olvide-contrasena");

  await anon.getByLabel("Correo electrónico").fill(email);
  await anon.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(anon.getByText(/Si el correo está registrado, te enviamos un enlace/).first()).toBeVisible();

  let enlace: string | null = null;

  await expect(() => {
    enlace = enlaceRestablecer(email);
    expect(enlace, "enlace de Olvidé mi contraseña en el log").not.toBeNull();
  }).toPass({ timeout: 15_000 });

  const ruta = new URL(enlace!);

  await anon.goto(`${ruta.pathname}${ruta.search}`);
  await anon.getByLabel(/^Contraseña nueva/).fill("solotexto");
  await anon.getByLabel(/^Repite la contraseña nueva/).fill("solotexto");
  await anon.getByRole("button", { name: "Guardar contraseña nueva" }).click();
  await expect(anon.getByText("La contraseña nueva debe tener al menos un número.").first()).toBeVisible();

  await anon.getByLabel(/^Contraseña nueva/).fill("Olvide2026x");
  await anon.getByLabel(/^Repite la contraseña nueva/).fill("Olvide2026x");
  await anon.getByRole("button", { name: "Guardar contraseña nueva" }).click();
  await expect(anon.getByText("Contraseña cambiada").first()).toBeVisible();

  // El mismo enlace ya no sirve.
  await anon.goto(`${ruta.pathname}${ruta.search}`);
  await anon.getByLabel(/^Contraseña nueva/).fill("OtraClave2027");
  await anon.getByLabel(/^Repite la contraseña nueva/).fill("OtraClave2027");
  await anon.getByRole("button", { name: "Guardar contraseña nueva" }).click();
  await expect(anon.getByText("El enlace no sirve").first()).toBeVisible();

  // Entra con la contraseña nueva.
  await anon.goto("/login");
  await anon.getByLabel("Correo electrónico").fill(email);
  await anon.getByLabel("Contraseña", { exact: true }).fill("Olvide2026x");
  await anon.getByRole("button", { name: "Ingresar" }).click();
  await expect(anon).toHaveURL(/\/portal/);
});

test("el mensaje es el mismo con un correo que no existe", async ({ anonimo }) => {
  const { page: anon } = await anonimo();

  await anon.goto("/olvide-contrasena");
  await anon.getByLabel("Correo electrónico").fill(`nadie-${Date.now()}@example.com`);
  await anon.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(anon.getByText(/Si el correo está registrado, te enviamos un enlace/).first()).toBeVisible();
});
