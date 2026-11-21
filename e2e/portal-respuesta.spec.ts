import { api, expect, PASSWORD_DEMO, test } from "./fixtures";
import { crearUsuarioCliente, cuerpo } from "./datos";

/**
 * P-11 / U-05, sobre la COPIA de la base: el admin envía una proforma, el
 * cliente la acepta desde su portal y el admin la ve aceptada (con el canal)
 * y en el filtro "Aceptadas sin orden".
 */
test("el cliente acepta su proforma desde el portal y el admin la ve aceptada", async ({
  page,
  anonimo,
}) => {
  test.setTimeout(180_000);

  const { cliente, email } = await crearUsuarioCliente(page.request);
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());

  // 1. El admin arma y envía una proforma de Bs 1.250,75.
  const { id: proformaId, numero } = cuerpo(
    await api<{ id: number; numero: string } | { data: { id: number; numero: string } }>(
      page.request,
      "POST",
      "/api/v1/proformas",
      {
        cliente_id: cliente.id,
        fecha_emision: hoy,
        impuesto_tasa: 0,
        items: [{ tipo: "LIBRE", descripcion: "Trabajo E2E", cantidad: 1, precio_unitario: 1250.75 }],
      },
    ),
  );

  const envio = await api<{ correo?: { enviado: boolean; mensaje: string } }>(
    page.request,
    "POST",
    `/api/v1/proformas/${proformaId}/enviar`,
  );

  // El cliente de la prueba no tiene correo ni teléfono: se envía igual y
  // el detalle lo avisa; los botones de compartir dicen por qué no se puede.
  expect(envio.correo).toEqual({
    enviado: false,
    mensaje: "El cliente no tiene correo registrado; no se envió el correo.",
  });
  await page.goto(`/proformas/${proformaId}`);
  await expect(page.getByText("La proforma se envió, pero no por correo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Compartir por WhatsApp" })).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByText("El cliente no tiene teléfono registrado.", { exact: false })).toBeVisible();

  // 2. El cliente entra y la acepta desde "Mis proformas".
  const { page: portal } = await anonimo();

  await portal.goto("/login");
  await portal.getByLabel("Correo electrónico").fill(email);
  await portal.getByLabel("Contraseña").fill(PASSWORD_DEMO);
  await portal.getByRole("button", { name: "Ingresar" }).click();
  await expect(portal).toHaveURL(/\/portal/);

  await portal.goto("/portal/proformas");
  const dialogo = portal.getByRole("alertdialog");

  // Un clic antes de hidratar se pierde: se reintenta hasta que abre.
  await expect(async () => {
    await portal.getByRole("button", { name: `Aceptar la proforma ${numero}` }).first().click();
    await expect(dialogo).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  await expect(dialogo).toContainText(`¿Aceptar la proforma ${numero}?`);
  await expect(dialogo).toContainText(/Total: Bs\s1\.250,75\./);
  await dialogo.getByRole("button", { name: "Aceptar proforma" }).click();

  await expect(dialogo).toBeHidden();
  await expect(portal.getByRole("button", { name: `Aceptar la proforma ${numero}` })).toHaveCount(0);
  await expect(portal.getByText("Aceptada").first()).toBeVisible();

  // 3. El admin la ve aceptada, con el canal, y sin orden todavía.
  await page.goto(`/proformas/${proformaId}`);
  await expect(
    page.getByText(/^Aceptada por el cliente desde el portal el \d{2}\/\d{2}\/\d{4} a las \d{2}:\d{2}\.$/),
  ).toBeVisible();

  await page.goto("/proformas?tab=proformas&sin_orden=1");
  const fila = page.getByRole("row").filter({ hasText: numero });

  await expect(fila).toBeVisible();
  await expect(fila).toContainText("Aceptada sin orden");
});
