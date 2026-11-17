/**
 * Content-Security-Policy del front. La aplica `next.config.ts` a todas las
 * páginas (no a `/api` ni `/sanctum`, que son respuestas de Laravel: JSON,
 * el PDF y el CSV).
 *
 * Por qué hay `'unsafe-inline'` en scripts y estilos:
 * - La app usa `cacheComponents` (PPR): el esqueleto de cada página se genera
 *   estático, sin petición, y no puede llevar un nonce distinto por visita
 *   (la guía de CSP de Next.js lo indica: los nonces exigen render dinámico).
 * - Next.js manda el payload de React Server Components en scripts en línea
 *   (`self.__next_f.push(...)`) y el layout tiene el script del tema que evita
 *   el destello claro→oscuro. Sus contenidos cambian por página, así que
 *   tampoco sirven los hashes.
 * - HeroUI/React Aria y Next.js ponen atributos `style` en línea y, en
 *   desarrollo, Next.js inyecta `<style>`.
 *
 * `'unsafe-eval'` solo en desarrollo: React lo usa para reconstruir las pilas
 * de error del servidor. En producción ni React ni Next.js usan `eval`.
 *
 * Todo lo demás se limita al propio origen: el logo (`/api/v1/empresa/logo`),
 * el PDF y el CSV pasan por el rewrite de `/api`; la vista previa del logo es
 * un `blob:`; las fuentes Geist se sirven desde `/_next`; Chart.js dibuja en
 * un canvas sin recursos externos.
 */
export function contentSecurityPolicy(isDev: boolean): string {
  const directivas: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  return Object.entries(directivas)
    .map(([nombre, valores]) => `${nombre} ${valores.join(" ")}`)
    .join("; ");
}
