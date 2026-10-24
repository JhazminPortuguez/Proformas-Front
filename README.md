# Proformas — Frontend (Fase 0)

Backoffice de Proformas sobre **Next.js 16.4 (App Router + Turbopack)**,
**React 19**, **Tailwind 4** y **HeroUI v3** (componentes compuestos, sin
provider). Consume la API de `Proformas-Back` bajo `/api/v1`.

## Requisitos

- Node.js 20.9+ (probado con 26).
- Backend Laravel corriendo en `http://127.0.0.1:8000`.

## Puesta en marcha

```powershell
npm install
copy .env.example .env.local   # opcional: los valores por defecto ya sirven
npm run dev                    # http://localhost:3000
```

| Variable | Default | Descripción |
|---|---|---|
| `LARAVEL_API_URL` | `http://127.0.0.1:8000` | URL interna del backend (rewrites y lecturas server-side) |
| `SESSION_COOKIE_NAME` | `laravel-session` | Debe coincidir con el nombre de cookie de sesión del back |

## Arquitectura de datos

```
src/lib/api/
  types.ts    Contratos de la API + ApiError tipado
  server.ts   Lecturas server-side con la cookie de sesión (cache: 'no-store')
  client.ts   Mutaciones browser-side con CSRF de Sanctum y timeout
```

- **Lecturas = Server Components.** `server.ts` reenvía la cookie de sesión a
  `LARAVEL_API_URL/api/v1`, nunca cachea y centraliza `getSessionUser()` en la
  Data Access Layer. `React.cache` evita repetir `/auth/me` entre layout y página.
- **Mutaciones = Client Components.** `client.ts` pide `/sanctum/csrf-cookie`,
  envía `X-XSRF-TOKEN`, usa `credentials: 'include'`, aplica timeout y reintenta
  una vez cuando el token caduca (419). Los 422 se exponen por campo.
- **Guards en layouts server-side** (`src/app/(app)/layout.tsx` y
  `src/app/(portal)/layout.tsx`): sin sesión → `/login`; rol `cliente` no entra
  al backoffice y los roles internos no entran al portal.
- **`src/proxy.ts`** solo comprueba la *presencia* de la cookie para evitar
  pintar el shell antes de redirigir. No valida sesión ni rol: no hay doble
  fetch contra Laravel.
- Tras cada mutación se llama `router.refresh()` (con `useTransition` para el
  estado pendiente).

### cacheComponents

`next.config.ts` tiene `cacheComponents` y `partialPrefetching` activos. Por eso
toda lectura de cookies (`getSessionUser`, guards) vive dentro de un boundary de
`<Suspense>`: el shell se prerenderiza y el contenido autenticado se transmite.
El costo es que un redirect por rol en una carga directa llega después del shell
(breve skeleton), no como 307.

## Estructura

```
src/
  app/
    (auth)/            login + registro (layout a dos columnas)
    (app)/             backoffice: dashboard, clientes, servicios, usuarios y placeholders
    (portal)/          portal del cliente
    layout.tsx         html/lang, fuentes, script anti-flash del tema
    globals.css        imports de Tailwind/HeroUI + tokens de marca
  components/
    layout/            AppShell, Sidebar, Topbar, Breadcrumbs, ThemeToggle, UserMenu
    ui/                PageHeader, DataTable, FormDrawer, ConfirmDialog, StatusChip, estados
    clientes/ servicios/ usuarios/ portal/ auth/
  lib/
    api/               types, server, client
    roles.ts           etiquetas y ruta inicial por rol
    theme.ts           tema sin flash (useSyncExternalStore)
    utils.ts           formatos es-BO y helpers de query
  proxy.ts             gate por presencia de cookie
```

## Diseño y accesibilidad

- Tokens semánticos de HeroUI (`bg-background`, `bg-surface`, `text-muted`,
  `border-border`, `bg-accent-soft`, `danger`). No se usan colores crudos en los
  componentes. La marca se define una sola vez en `globals.css`
  (`--accent` petróleo `oklch(0.45 0.09 200)`, `--radius: 0.375rem`,
  `--danger` oscurecido para AA).
- Contraste ajustado para WCAG 2.2 AA: `accent` y `danger` sobre blanco,
  `muted` sobre `background`/`surface-secondary`, bordes de campos y foco en
  ambos temas. Los valores exactos viven en `globals.css` y deben revalidarse
  tras cambiar tokens.
- Etiquetas visibles en formularios, `FieldError` anunciado por campo,
  `role="alert"` en errores generales, `aria-live` en estados de guardado,
  foco visible en todos los interactivos, navegación completa por teclado y
  `prefers-reduced-motion` respetado.
- Estados cubiertos: carga (skeleton), vacío (con acción), error (con reintento),
  pendiente y éxito por refresh.
- Mobile-first: sidebar fija desde `lg`, drawer con focus trap en móvil, tablas
  con scroll horizontal y columnas secundarias ocultas en pantallas chicas.

## Scripts

```powershell
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm test          # Vitest + Testing Library
```

## Alcance de la Fase 0

Implementado: login, registro, dashboard, clientes, servicios, usuarios (solo
admin) y portal del cliente.

Placeholders explícitos ("Próximamente") que no rompen la navegación:
proformas, órdenes, solicitudes, inventario, cuentas por cobrar, reportes y
configuración. La creación de usuarios queda para el backend en esta fase.

## Notas

- `main` puede estar desactualizada; el desarrollo activo vive en `Frank`.
- `src/test/setup.ts` define `matchMedia` y `ResizeObserver` para jsdom.
