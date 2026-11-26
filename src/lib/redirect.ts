/**
 * A-07: destino seguro después del login (`?next=`). Solo se aceptan rutas
 * internas de la app: nada de otro dominio (`//evil.com`, `https://…`),
 * esquemas (`javascript:`), barras invertidas, la API ni volver al login.
 * Devuelve `null` si no es seguro y el login usa la portada del rol.
 */
export function safeNextPath(
  next: string | null | undefined,
  origin: string,
): string | null {
  if (!next) return null;

  const valor = next.trim();

  // Debe ser una ruta absoluta del sitio, no "//host" ni "/\host".
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) {
    return null;
  }

  try {
    const url = new URL(valor, origin);

    if (url.origin !== new URL(origin).origin) return null;
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/sanctum")) return null;
    if (["/login", "/registro", "/olvide-contrasena", "/restablecer-contrasena"].includes(url.pathname)) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
