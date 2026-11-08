/**
 * Rutas same-origin que se usan tanto desde componentes cliente como desde
 * server components. Vive fuera de `client.ts` porque ese módulo es
 * `client-only` y no se puede importar desde un Server Component.
 */

const API_PREFIX = "/api/v1";

export function proformaPdfUrl(id: number): string {
  return `${API_PREFIX}/proformas/${id}/pdf`;
}

/** PDF de la proforma desde el portal del cliente (solo sus proformas). */
export function portalProformaPdfUrl(id: number): string {
  return `${API_PREFIX}/portal/proformas/${id}/pdf`;
}
