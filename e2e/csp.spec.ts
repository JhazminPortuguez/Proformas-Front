import { api, expect, test } from "./fixtures";

/**
 * Content-Security-Policy. El fixture común falla la prueba si cualquier
 * página registra una violación de CSP en la consola; aquí se recorren todas
 * las páginas del admin y se ejercitan las piezas que más dependen de la
 * política: el logo (imagen del back y vista previa `blob:`), el PDF,
 * los gráficos de Chart.js y la descarga del CSV.
 */

// PNG de 1×1 px válido.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==",
  "base64",
);

test("la CSP llega en las páginas y no en la API", async ({ page }) => {
  const respuesta = await page.goto("/dashboard");
  const csp = respuesta?.headers()["content-security-policy"] ?? "";

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("img-src 'self' data: blob:");
  expect(csp).toContain("connect-src 'self'");

  // `next start` es producción: nunca debe llevar unsafe-eval.
  if (process.env.E2E_PRODUCCION === "1") {
    expect(csp).not.toContain("unsafe-eval");
  }

  const me = await page.request.get("/api/v1/auth/me", {
    headers: { Accept: "application/json" },
  });

  expect(me.headers()["content-security-policy"]).toBeUndefined();
});

test("ninguna página del admin tiene errores de CSP", async ({ page }) => {
  // Recorre ~20 páginas: con el servidor de desarrollo en frío cada una se
  // compila al abrirla.
  test.setTimeout(420_000);

  const ids = async (ruta: string) => {
    const body = await api<{ data: Array<{ id: number }> }>(
      page.request,
      "GET",
      `${ruta}${ruta.includes("?") ? "&" : "?"}per_page=1`,
    );

    return body.data[0]?.id;
  };

  const [cliente, proforma, orden, cuenta] = await Promise.all([
    ids("/api/v1/clientes"),
    ids("/api/v1/proformas"),
    ids("/api/v1/ordenes"),
    ids("/api/v1/cuentas-por-cobrar"),
  ]);

  const rutas = [
    "/dashboard",
    "/clientes",
    "/servicios",
    "/proformas",
    "/proformas/nueva",
    "/solicitudes",
    "/ordenes",
    "/inventario",
    "/inventario?tab=movimientos",
    "/cobros",
    "/usuarios",
    "/configuracion",
    "/reportes?tab=ordenes",
    "/reportes?tab=servicios",
    "/reportes?tab=clientes",
    "/reportes?tab=inventario",
    "/reportes?tab=cobros",
    ...(cliente ? [`/clientes/${cliente}`] : []),
    ...(proforma ? [`/proformas/${proforma}`] : []),
    ...(orden ? [`/ordenes/${orden}`] : []),
    ...(cuenta ? [`/cobros/${cuenta}`] : []),
  ];

  for (const ruta of rutas) {
    await page.goto(ruta);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // Deja correr la hidratación y los efectos antes de pasar a la siguiente.
    await page.waitForLoadState("networkidle");
  }
});

test("login y registro no tienen errores de CSP", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
    storageState: { cookies: [], origins: [] },
  });
  const errores: string[] = [];

  context.on("page", (p) =>
    p.on("console", (m) => {
      if (m.type() === "error" && /Content Security Policy/i.test(m.text())) {
        errores.push(m.text());
      }
    }),
  );

  const page = await context.newPage();

  for (const ruta of ["/login", "/registro"]) {
    await page.goto(ruta);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
  }

  await context.close();
  expect(errores).toEqual([]);
});

// Reportes consulta y dibuja varios gráficos: con la CPU ocupada (otra tarea
// pesada en paralelo) tardó más de 10 s. Se da más margen a estas dos.
test("Chart.js dibuja los gráficos de reportes con la CSP", async ({ page }) => {
  test.slow();
  await page.goto("/reportes?tab=ordenes");

  const canvas = page.locator("canvas").first();

  await expect(canvas).toBeVisible({ timeout: 30_000 });
  // El canvas tiene píxeles pintados: Chart.js corrió sin bloqueos.
  await expect
    .poll(() =>
      canvas.evaluate((el: HTMLCanvasElement) => {
        const ctx = el.getContext("2d");
        if (!ctx || el.width === 0) return 0;
        const { data } = ctx.getImageData(0, 0, el.width, el.height);
        let pintados = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) pintados++;
        return pintados;
      }),
    )
    .toBeGreaterThan(0);
});

test("el CSV de reportes se descarga", async ({ page }) => {
  test.slow();
  await page.goto("/reportes?tab=cobros");

  const enlace = page.getByRole("link", { name: "Exportar CSV" });

  await expect(enlace).toBeVisible({ timeout: 30_000 });

  const [descarga] = await Promise.all([
    page.waitForEvent("download", { timeout: 45_000 }),
    enlace.click(),
  ]);

  expect(descarga.suggestedFilename()).toMatch(/\.csv$/);

  const ruta = await descarga.path();
  const contenido = (await import("node:fs")).readFileSync(ruta!, "utf8");

  expect(contenido.length).toBeGreaterThan(0);
});

test("el PDF de una proforma se abre en una pestaña nueva", async ({
  page,
  context,
}) => {
  const body = await api<{ data: Array<{ id: number }> }>(
    page.request,
    "GET",
    "/api/v1/proformas?estado=ENVIADA&per_page=1",
  );
  const id = body.data[0]?.id;

  test.skip(!id, "La copia no tiene proformas enviadas");

  await page.goto(`/proformas/${id}`);

  const pdf = context.waitForEvent("response", (r) =>
    r.url().endsWith(`/api/v1/proformas/${id}/pdf`),
  );

  await page.getByRole("link", { name: /^Abrir PDF de la proforma/ }).click();

  const respuesta = await pdf;

  expect(respuesta.status()).toBe(200);
  expect(respuesta.headers()["content-type"]).toContain("application/pdf");
});

test("el logo se previsualiza (blob:) y se muestra desde el back", async ({
  page,
}) => {
  await page.goto("/configuracion");

  const respuesta = await api<
    { logo_url: string | null } | { data: { logo_url: string | null } }
  >(page.request, "GET", "/api/v1/empresa");
  const inicial = "data" in respuesta ? respuesta : { data: respuesta };

  // Los archivos de `public/logos` del back son compartidos entre la base de
  // la demo y su copia: reemplazar un logo existente borraría el archivo que
  // usa la demo. Solo se sube uno si la empresa no tiene.
  test.skip(
    !!inicial.data.logo_url,
    "La empresa ya tiene logo; no se reemplaza para no borrar su archivo",
  );

  await page.getByLabel("Elegir imagen").setInputFiles({
    name: "logo-e2e.png",
    mimeType: "image/png",
    buffer: PNG_1PX,
  });

  const previa = page.getByRole("img", { name: "Vista previa del logo nuevo" });

  await expect(previa).toHaveAttribute("src", /^blob:/);
  await expect
    .poll(() => previa.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1);

  await page.getByRole("button", { name: "Subir logo" }).click();

  const actual = page.getByRole("img", { name: "Logo actual de la empresa" });

  await expect(actual).toHaveAttribute("src", /^\/api\/v1\/empresa\/logo/);
  await expect
    .poll(() => actual.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1);

  // La empresa no tenía logo: se deja como estaba (y se borra el archivo).
  await api(page.request, "DELETE", "/api/v1/empresa/logo");
});
