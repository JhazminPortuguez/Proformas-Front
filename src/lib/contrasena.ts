/**
 * Ronda C: la misma regla de contraseña que el back (`ReglaPassword`) para el
 * registro, "Cambiar contraseña" y "Olvidé mi contraseña": al menos 8
 * caracteres, con letras y números.
 *
 * `que` es como se nombra el campo: "La contraseña" o "La contraseña nueva".
 */
export function errorContrasena(valor: string, que = "La contraseña"): string | null {
  const minuscula = que.charAt(0).toLowerCase() + que.slice(1);

  if (!valor) return `Escribe ${minuscula}.`;
  if (valor.length < 8) return `${que} debe tener al menos 8 caracteres.`;
  if (!/\p{L}/u.test(valor)) return `${que} debe tener al menos una letra.`;
  if (!/\d/.test(valor)) return `${que} debe tener al menos un número.`;
  if (valor.length > 255) return `${que} admite como máximo 255 caracteres.`;

  return null;
}

/** Errores de la contraseña y su confirmación, con las claves del back. */
export function erroresContrasenaNueva(
  password: string,
  confirmacion: string,
  que = "La contraseña",
): Record<string, string[]> {
  const errores: Record<string, string[]> = {};
  const error = errorContrasena(password, que);
  const minuscula = que.charAt(0).toLowerCase() + que.slice(1);

  if (error) errores.password = [error];

  if (password && confirmacion !== password) {
    errores.password_confirmation = [`La confirmación no coincide con ${minuscula}.`];
  }

  return errores;
}

export const AYUDA_CONTRASENA = "Al menos 8 caracteres, con letras y números.";
