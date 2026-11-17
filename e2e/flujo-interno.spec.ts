import { api, expect, OPERARIO_EMAIL, test } from "./fixtures";
import {
  crearCliente,
  crearProducto,
  crearServicio,
  cuerpo,
  elegirEnCombo,
  stockDe,
} from "./datos";

/**
 * Flujo interno completo, de la proforma al cobro. Corre sobre la COPIA de
 * la base (`proformas_e2e`) y crea sus propios cliente, servicio y material.
 *
 * El admin arma, envía y acepta la proforma, crea la orden y la asigna; el
 * operario la inicia, consume el material y la finaliza en su propia sesión;
 * el admin la cierra y registra un pago parcial y luego el saldo.
 */
test("proforma → orden → consumo → cierre → cuenta por cobrar pagada", async ({
  page,
  sesion,
}) => {
  test.setTimeout(240_000);

  const cliente = await crearCliente(page.request);
  const servicio = await crearServicio(page.request, 300);
  const material = await crearProducto(page.request, { precio: 50, stock: 10 });

  // 1. Proforma con un servicio y 2 unidades de material: Bs 300 + Bs 100.
  await page.goto("/proformas/nueva");
  await elegirEnCombo(
    page,
    page.getByRole("combobox", { name: "Cliente" }),
    cliente.nombre,
  );

  await page.getByRole("button", { name: "Servicio", exact: true }).click();
  await elegirEnCombo(
    page,
    page.getByRole("combobox", { name: "Servicio" }),
    servicio.nombre,
  );

  await page.getByRole("button", { name: "Material", exact: true }).click();
  await elegirEnCombo(
    page,
    page.getByRole("combobox", { name: "Material" }),
    material.nombre,
  );
  await page.getByRole("textbox", { name: "Cantidad" }).nth(1).fill("2");

  // 2. Guardar y enviar.
  await page.getByRole("button", { name: "Guardar y enviar" }).click();
  await expect(page).toHaveURL(/\/proformas\/\d+$/);
  const proformaId = Number(page.url().match(/\/proformas\/(\d+)$/)![1]);

  await expect(page.getByText("Enviada").first()).toBeVisible();
  // Subtotal Bs 400; el total suma el impuesto que el formulario trae por
  // defecto, así que se toma del back.
  await expect(page.getByText(/400,00/).first()).toBeVisible();
  const proforma = cuerpo(
    await api<{ estado: string; total: string }>(
      page.request,
      "GET",
      `/api/v1/proformas/${proformaId}`,
    ),
  );

  expect(proforma.estado).toBe("ENVIADA");
  const total = Number(proforma.total);

  expect(total).toBeGreaterThanOrEqual(400);

  // 3. Aceptar.
  await confirmar(page, /^Aceptar( proforma)?$/, "Aceptar");
  await expect(page.getByText("Aceptada").first()).toBeVisible();

  // 4. Crear la orden sin operario.
  await page.getByRole("button", { name: /Crear orden/ }).first().click();
  const crear = page.getByRole("dialog", { name: "Crear orden de servicio" });
  await expect(crear).toBeVisible();
  await crear.getByRole("button", { name: "Crear orden" }).click();
  await expect(page).toHaveURL(/\/ordenes\/\d+$/);
  const ordenId = Number(page.url().match(/\/ordenes\/(\d+)$/)![1]);

  await expect(page.getByText("Pendiente").first()).toBeVisible();

  // 5. Asignar operario.
  await page.getByRole("button", { name: /^Asignar OS-/ }).click();
  const asignar = page.getByRole("dialog", { name: "Asignar operario" });
  // El disparador del Select se llama "Selecciona un operario Operario…".
  await asignar.getByRole("button", { name: /Selecciona un operario/ }).click();
  await page.getByRole("option", { name: "Operario Demo" }).click();
  await asignar.getByRole("button", { name: "Asignar", exact: true }).click();
  await expect(asignar).toBeHidden();
  await expect(page.getByText("Asignada").first()).toBeVisible();

  // 6. El operario inicia, consume y finaliza.
  const operario = await sesion(OPERARIO_EMAIL);
  const op = operario.page;

  await op.goto(`/ordenes/${ordenId}`);
  await confirmar(op, /^Iniciar OS-/, "Iniciar");
  await expect(op.getByText("En proceso").first()).toBeVisible();

  expect(await stockDe(page.request, material.id)).toBe(10);

  await op.getByRole("link", { name: /^Materiales/ }).click();
  await op.getByRole("button", { name: "Consumir materiales" }).click();
  const consumir = op.getByRole("dialog", { name: "Consumir materiales" });
  await consumir
    .getByRole("textbox", { name: `Cantidad de ${material.nombre}` })
    .fill("2");
  await consumir.getByRole("button", { name: "Consumir materiales" }).click();
  await expect(consumir).toBeHidden();

  // El stock bajó de 10 a 8.
  await expect.poll(() => stockDe(page.request, material.id)).toBe(8);

  await confirmar(op, /^Finalizar OS-/, "Finalizar");
  await expect(op.getByText("Finalizada").first()).toBeVisible();

  // 7. El admin cierra la orden: se genera la cuenta por cobrar.
  await page.goto(`/ordenes/${ordenId}`);
  await confirmar(page, /^Cerrar (orden|OS-)/, "Cerrar orden");
  await expect(page.getByText(/Cerrada el/).first()).toBeVisible();

  const cuentas = await api<{
    data: Array<{ id: number; monto_total: string; estado_cobro: string }>;
  }>(page.request, "GET", `/api/v1/cuentas-por-cobrar?search=${encodeURIComponent(cliente.nombre)}`);

  expect(cuentas.data).toHaveLength(1);
  const cuenta = cuentas.data[0];

  expect(Number(cuenta.monto_total)).toBe(total);
  expect(cuenta.estado_cobro).toBe("PENDIENTE");

  // 8. Pago parcial: Bs 150 → Parcial.
  const resto = (total - 150).toFixed(2);

  await page.goto(`/cobros/${cuenta.id}`);
  await registrarPago(page, "150");
  await expect(page.getByText("Parcial").first()).toBeVisible();
  await expect(page.getByText(new RegExp(resto.replace(".", ","))).first()).toBeVisible();

  // 9. El resto → Pagada.
  await registrarPago(page, resto);
  await expect(page.getByText("Pagada").first()).toBeVisible();

  const final = cuerpo(
    await api<{ estado_cobro: string; saldo: string }>(
      page.request,
      "GET",
      `/api/v1/cuentas-por-cobrar/${cuenta.id}`,
    ),
  );

  expect(final.estado_cobro).toBe("PAGADA");
  expect(Number(final.saldo)).toBe(0);
  expect(proformaId).toBeGreaterThan(0);
});

/** Pulsa una acción de la página y la confirma en su diálogo. */
async function confirmar(
  page: import("@playwright/test").Page,
  accion: RegExp,
  confirmacion: string,
) {
  await page.getByRole("button", { name: accion }).first().click();
  const dialogo = page.getByRole("alertdialog").or(page.getByRole("dialog")).last();

  await expect(dialogo).toBeVisible();
  await dialogo.getByRole("button", { name: confirmacion, exact: true }).click();
  await expect(dialogo).toBeHidden();
}

async function registrarPago(page: import("@playwright/test").Page, monto: string) {
  await page.getByRole("button", { name: "Registrar pago" }).first().click();
  const dialogo = page.getByRole("dialog", { name: "Registrar pago" });

  await dialogo.getByRole("textbox", { name: "Monto" }).fill(monto);
  await dialogo.getByRole("button", { name: "Registrar pago" }).click();
  await expect(dialogo).toBeHidden();
}
