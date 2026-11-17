import type { ErroresValidacion } from "@/lib/api/types";

/**
 * Validación en el navegador con los mismos textos que devuelve Laravel en
 * `lang/es/validation.php` (con los nombres de `attributes`), para que el
 * usuario lea lo mismo antes y después de enviar.
 */

/** Correo con forma `algo@dominio.ext` (el back aplica la regla `email`). */
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mensajeLargoMaximo(atributo: string, max: number): string {
  return `El campo ${atributo} no debe tener más de ${max} caracteres.`;
}

export function mensajeCorreo(atributo: string): string {
  return `El campo ${atributo} debe ser una dirección de correo válida.`;
}

export function esCorreo(valor: string): boolean {
  return CORREO.test(valor.trim());
}

/** Largo en caracteres (no en unidades UTF-16), como `mb_strlen` del back. */
export function largo(valor: string): number {
  return Array.from(valor).length;
}

/**
 * Cantidad de decimales escritos, con la misma lectura que `parseDecimal`
 * (si hay coma, es el separador decimal y los puntos son de miles).
 */
export function decimalesDe(valor: string): number {
  const limpio = valor.trim();
  const normalizado = limpio.includes(",")
    ? limpio.replaceAll(".", "").replace(",", ".")
    : limpio;
  const [, fraccion = ""] = normalizado.split(".");

  return fraccion.length;
}

/**
 * Agrega a `errores` un error de largo máximo para cada campo que lo supere.
 * `campos` es `[clave, atributo, valor, máximo]`.
 */
export function validarLargos(
  errores: ErroresValidacion,
  campos: ReadonlyArray<readonly [string, string, string, number]>,
): ErroresValidacion {
  for (const [clave, atributo, valor, max] of campos) {
    if (!errores[clave] && largo(valor.trim()) > max) {
      errores[clave] = [mensajeLargoMaximo(atributo, max)];
    }
  }

  return errores;
}
