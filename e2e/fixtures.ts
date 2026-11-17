import {
  expect,
  test as base,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

/**
 * `test` común a todas las pruebas E2E. En cada página que se abre (la del
 * admin por defecto y las de las sesiones extra de `sesion()`):
 * - junta las violaciones de la Content-Security-Policy, tanto los mensajes
 *   de la consola ("Refused to … Content Security Policy …") como el evento
 *   `securitypolicyviolation` del documento;
 * - junta los warnings de accesibilidad de React Aria (controles sin
 *   etiqueta), que ya se vigilaban antes.
 * Al terminar la prueba, ambas listas deben quedar vacías.
 */
const CSP_EN_CONSOLA =
  /Content[- ]Security[- ]Policy|Refused to (load|execute|apply|connect|frame|create)/i;
const AVISO_A11Y =
  /visible label|aria-label|aria-labelledby|PressResponder was rendered without a pressable child|Pressable child must be focusable/i;
const MARCA_CSP = "[e2e-csp]";

export const PASSWORD_DEMO = process.env.E2E_PASSWORD ?? "password";
export const ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL ?? "pepitotilcayo@example.com";
export const OPERARIO_EMAIL =
  process.env.E2E_OPERARIO_EMAIL ?? "operario@example.com";

type Vigilancia = { csp: string[]; a11y: string[] };

async function vigilar(context: BrowserContext, v: Vigilancia) {
  await context.addInitScript((marca) => {
    document.addEventListener("securitypolicyviolation", (evento) => {
      console.error(
        `${marca} ${evento.violatedDirective} bloqueó ${evento.blockedURI || "(en línea)"} en ${evento.sourceFile || location.pathname}:${evento.lineNumber}`,
      );
    });
  }, MARCA_CSP);

  const escuchar = (page: Page) => {
    page.on("console", (mensaje) => {
      const texto = mensaje.text();

      if (
        texto.includes(MARCA_CSP) ||
        (mensaje.type() === "error" && CSP_EN_CONSOLA.test(texto))
      ) {
        v.csp.push(`${page.url()} → ${texto}`);
      } else if (mensaje.type() === "warning" && AVISO_A11Y.test(texto)) {
        v.a11y.push(texto);
      }
    });
  };

  context.pages().forEach(escuchar);
  context.on("page", escuchar);
}

/** Llama a la API como el usuario del contexto (cookie de sesión + XSRF). */
export async function api<T = unknown>(
  request: APIRequestContext,
  metodo: "GET" | "POST" | "PUT" | "DELETE",
  ruta: string,
  data?: unknown,
): Promise<T> {
  const estado = await request.storageState();
  let xsrf = estado.cookies.find((c) => c.name === "XSRF-TOKEN")?.value;

  if (!xsrf) {
    await request.get("/sanctum/csrf-cookie");
    xsrf = (await request.storageState()).cookies.find(
      (c) => c.name === "XSRF-TOKEN",
    )?.value;
  }

  const respuesta = await request.fetch(ruta, {
    method: metodo,
    data,
    headers: {
      Accept: "application/json",
      "X-XSRF-TOKEN": decodeURIComponent(xsrf ?? ""),
      Referer: "http://localhost:3000/",
    },
  });

  if (!respuesta.ok()) {
    throw new Error(
      `${metodo} ${ruta} → ${respuesta.status()}: ${await respuesta.text()}`,
    );
  }

  return (respuesta.status() === 204 ? null : await respuesta.json()) as T;
}

/** Sufijo único por ejecución para no chocar con datos de otras pruebas. */
export function unico(prefijo: string): string {
  return `${prefijo} E2E ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

type Sesion = { context: BrowserContext; page: Page };

export const test = base.extend<{
  vigilancia: Vigilancia;
  sesion: (email: string, password?: string) => Promise<Sesion>;
  anonimo: () => Promise<Sesion>;
}>({
  vigilancia: async ({}, usar) => {
    const v: Vigilancia = { csp: [], a11y: [] };

    await usar(v);

    expect(v.csp, `Errores de CSP en la consola:\n${v.csp.join("\n")}`).toEqual(
      [],
    );
    expect(v.a11y, `Warnings de accesibilidad:\n${v.a11y.join("\n")}`).toEqual(
      [],
    );
  },
  context: async ({ context, vigilancia }, usar) => {
    await vigilar(context, vigilancia);
    await usar(context);
  },
  // Contexto sin sesión (para entrar por el formulario de login), vigilado
  // igual que el del admin.
  anonimo: async ({ browser, vigilancia }, usar) => {
    const abiertos: BrowserContext[] = [];

    await usar(async () => {
      const context = await browser.newContext({
        baseURL: "http://localhost:3000",
        storageState: { cookies: [], origins: [] },
      });

      abiertos.push(context);
      await vigilar(context, vigilancia);

      return { context, page: await context.newPage() };
    });

    await Promise.all(abiertos.map((c) => c.close()));
  },
  // Contexto con la sesión de otro usuario, iniciada por la API.
  sesion: async ({ anonimo }, usar) => {
    await usar(async (email, password = PASSWORD_DEMO) => {
      const sesion = await anonimo();

      await api(sesion.context.request, "POST", "/api/v1/auth/login", {
        email,
        password,
      });

      return sesion;
    });
  },
});

export { expect };
