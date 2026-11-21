"use client";

import { useEffect, useState } from "react";
import { todayDateOnly } from "@/lib/proformas";

/** Lo emite `AvisoCambioDeDia` cuando detecta que cambió el día en Bolivia. */
export const EVENTO_CAMBIO_DE_DIA = "proformas:cambio-de-dia";

export function avisarCambioDeDia(): void {
  window.dispatchEvent(new Event(EVENTO_CAMBIO_DE_DIA));
}

/**
 * "Hoy" en hora de Bolivia para un formulario abierto (propuesta 13). Usa el
 * valor que calculó la página hasta que el aviso de D-02 detecta que cambió
 * el día; desde ahí, el día nuevo.
 */
export function useHoy(inicial?: string): string {
  const [detectado, setDetectado] = useState<string | null>(null);

  useEffect(() => {
    const alCambiar = () => setDetectado(todayDateOnly());

    window.addEventListener(EVENTO_CAMBIO_DE_DIA, alCambiar);

    return () => window.removeEventListener(EVENTO_CAMBIO_DE_DIA, alCambiar);
  }, []);

  return detectado ?? inicial ?? todayDateOnly();
}
