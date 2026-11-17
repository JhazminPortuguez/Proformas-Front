import { api, expect, OPERARIO_EMAIL, test, unico } from "./fixtures";
import { crearUsuarioCliente, cuerpo } from "./datos";

/**
 * Permisos de punta a punta, sobre la COPIA de la base. Cada prueba crea sus
 * propios usuarios y datos.
 */

test("el operario no entra a Reportes, Usuarios ni Configuración", async ({
  sesion,
}) => {
  // Abre varias páginas: con el servidor de desarrollo en frío las compila.
  test.slow();

  const { page, context } = await sesion(OPERARIO_EMAIL);

  await page.goto("/dashboard");
  const menu = page.getByRole("navigation", { name: "Navegación principal" });

  await expect(menu.getByRole("link", { name: "Órdenes" })).toBeVisible();

  for (const [ruta, enlace, endpoint] of [
    ["/reportes", "Reportes", "/api/v1/reportes/ordenes"],
    ["/usuarios", "Usuarios", "/api/v1/users"],
    ["/configuracion", "Configuración", "/api/v1/empresa"],
  ] as const) {
    // No aparece en el menú…
    await expect(menu.getByRole("link", { name: enlace })).toHaveCount(0);

    // …abrir la ruta a mano lo devuelve al dashboard…
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /^Hola, / }),
    ).toBeVisible();

    // …y la API responde 403.
    const respuesta = await context.request.get(endpoint, {
      headers: { Accept: "application/json" },
    });

    expect(respuesta.status(), `${endpoint} para el operario`).toBe(403);
  }
});

test("un cliente no ve las proformas ni las solicitudes de otro cliente", async ({
  page,
  sesion,
}) => {
  test.slow();

  const a = await crearUsuarioCliente(page.request);
  const b = await crearUsuarioCliente(page.request);

  // Datos de B: una proforma enviada (hecha por el admin) y una solicitud
  // (enviada por B desde su portal).
  const proformaB = cuerpo(
    await api<{ id: number; numero: string }>(page.request, "POST", "/api/v1/proformas", {
      cliente_id: b.cliente.id,
      fecha_emision: new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/La_Paz",
      }).format(new Date()),
      items: [
        {
          tipo: "LIBRE",
          descripcion: "Revisión de tablero",
          cantidad: 1,
          precio_unitario: 120,
        },
      ],
    }),
  );

  await api(page.request, "POST", `/api/v1/proformas/${proformaB.id}/enviar`);

  const clienteB = await sesion(b.email);
  const pedidoB = unico("Pedido privado");
  const solicitudB = cuerpo(
    await api<{ id: number }>(clienteB.context.request, "POST", "/api/v1/portal/solicitudes", {
      descripcion: pedidoB,
      items: [{ descripcion: "Algo privado", cantidad: 1 }],
    }),
  );

  // B sí ve lo suyo.
  await clienteB.page.goto(`/portal/proformas/${proformaB.id}`);
  await expect(
    clienteB.page.getByRole("heading", { level: 1, name: new RegExp(proformaB.numero) }),
  ).toBeVisible();

  // A no lo ve: ni en sus listados, ni por URL, ni por la API, ni el PDF.
  const clienteA = await sesion(a.email);
  const pa = clienteA.page;

  await pa.goto("/portal/proformas");
  await expect(pa.getByRole("heading", { level: 1, name: "Mis proformas" })).toBeVisible();
  await expect(pa.getByText(proformaB.numero)).toHaveCount(0);

  await pa.goto("/portal/solicitudes");
  await expect(pa.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(pa.getByText(pedidoB)).toHaveCount(0);

  await pa.goto(`/portal/proformas/${proformaB.id}`);
  await expect(pa.getByText(proformaB.numero)).toHaveCount(0);
  await expect(pa.getByText(/no (existe|encontr)|no la encontramos|no se encontr/i).first()).toBeVisible();

  await pa.goto(`/portal/solicitudes/${solicitudB.id}`);
  await expect(pa.getByText(pedidoB)).toHaveCount(0);
  await expect(pa.getByText(/no (existe|encontr)|no la encontramos|no se encontr/i).first()).toBeVisible();

  for (const ruta of [
    `/api/v1/portal/proformas/${proformaB.id}`,
    `/api/v1/portal/proformas/${proformaB.id}/pdf`,
    `/api/v1/portal/solicitudes/${solicitudB.id}`,
  ]) {
    const respuesta = await clienteA.context.request.get(ruta, {
      headers: { Accept: "application/json" },
    });

    expect(respuesta.status(), ruta).toBe(404);
  }

  // Y tampoco entra a las rutas internas.
  const interna = await clienteA.context.request.get(
    `/api/v1/proformas/${proformaB.id}`,
    { headers: { Accept: "application/json" } },
  );

  expect(interna.status()).toBe(403);
  await pa.goto(`/proformas/${proformaB.id}`);
  await expect(pa).toHaveURL(/\/portal$/);
});
