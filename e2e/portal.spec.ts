import { readFileSync } from "node:fs";
import { api, expect, PASSWORD_USUARIO_E2E, test, unico } from "./fixtures";
import { crearUsuarioCliente, cuerpo } from "./datos";

/**
 * Portal del cliente de punta a punta, sobre la COPIA de la base: el cliente
 * entra por el login, pide una cotización; el admin la convierte en proforma,
 * pone el precio y la envía; el cliente la ve en su portal y baja el PDF.
 */
test("solicitud del portal → proforma enviada → el cliente baja el PDF", async ({
  page,
  anonimo,
}) => {
  test.setTimeout(180_000);

  const { cliente, email } = await crearUsuarioCliente(page.request);
  const pedido = unico("Instalar 3 tomacorrientes");

  // 1. El cliente inicia sesión por el formulario.
  const { page: portal } = await anonimo();

  await portal.goto("/login");
  await portal.getByLabel("Correo electrónico").fill(email);
  await portal.getByLabel("Contraseña").fill(PASSWORD_USUARIO_E2E);
  await portal.getByRole("button", { name: "Ingresar" }).click();
  await expect(portal).toHaveURL(/\/portal/);

  // 2. Envía una solicitud de cotización.
  await portal.goto("/portal/solicitar");
  await portal.getByRole("textbox", { name: "¿Qué necesitas?" }).fill(pedido);
  await portal.getByRole("textbox", { name: "Descripción" }).first().fill("Tomacorriente doble");
  await portal.getByRole("textbox", { name: "Cantidad" }).first().fill("3");
  await portal.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(
    portal.getByRole("heading", { name: "Recibimos tu solicitud" }),
  ).toBeVisible();

  // 3. El admin la encuentra y la convierte en proforma.
  const solicitudes = await api<{ data: Array<{ id: number; numero?: string; descripcion: string }> }>(
    page.request,
    "GET",
    `/api/v1/solicitudes?search=${encodeURIComponent(pedido)}`,
  );

  expect(solicitudes.data).toHaveLength(1);
  const solicitud = solicitudes.data[0];

  await page.goto(`/solicitudes?search=${encodeURIComponent(pedido)}`);
  const convertir = page.getByRole("alertdialog").or(page.getByRole("dialog")).last();

  // Un clic antes de que la página termine de hidratarse se pierde: se
  // reintenta hasta que abre la confirmación.
  await expect(async () => {
    await page
      .getByRole("button", { name: /^Convertir solicitud / })
      .first()
      .click();
    await expect(convertir).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  await convertir.getByRole("button", { name: "Convertir", exact: true }).click();

  // Queda en la edición del borrador: se pone el precio y se envía.
  await expect(page).toHaveURL(/\/proformas\/\d+\/editar$/);
  const proformaId = Number(page.url().match(/\/proformas\/(\d+)\/editar$/)![1]);

  await page.getByRole("textbox", { name: "Precio unitario (Bs)" }).first().fill("45");
  await page.getByRole("button", { name: "Guardar y enviar" }).click();
  await expect(page).toHaveURL(new RegExp(`/proformas/${proformaId}$`));
  await expect(page.getByText("Enviada").first()).toBeVisible();

  const proforma = cuerpo(
    await api<{ numero: string; estado: string; cliente_id: number }>(
      page.request,
      "GET",
      `/api/v1/proformas/${proformaId}`,
    ),
  );

  expect(proforma.estado).toBe("ENVIADA");
  expect(proforma.cliente_id).toBe(cliente.id);

  // 4. El cliente la ve en su portal y descarga el PDF.
  await portal.goto("/portal/proformas");
  await expect(portal.getByText(proforma.numero).first()).toBeVisible();

  // Un clic durante la hidratación lo retiene React y se pierde la descarga
  // nativa (pasa con el servidor de desarrollo): se reintenta.
  let descarga: import("@playwright/test").Download | undefined;

  await expect(async () => {
    const espera = portal.waitForEvent("download", { timeout: 3_000 });

    await portal
      .getByRole("link", { name: `Descargar PDF de la proforma ${proforma.numero}` })
      .first()
      .click();
    descarga = await espera;
  }).toPass({ timeout: 30_000 });

  expect(descarga!.suggestedFilename()).toBe(`${proforma.numero}.pdf`);
  const pdf = readFileSync((await descarga!.path())!);

  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  expect(solicitud.id).toBeGreaterThan(0);
});
