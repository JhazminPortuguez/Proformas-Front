/**
 * Rutas same-origin que se usan tanto desde componentes cliente como desde
 * server components. Vive fuera de `client.ts` porque ese módulo es
 * `client-only` y no se puede importar desde un Server Component.
 */

const API_PREFIX = "/api/v1";

export function proformaPdfUrl(id: number): string {
  return `${API_PREFIX}/proformas/${id}/pdf`;
}
