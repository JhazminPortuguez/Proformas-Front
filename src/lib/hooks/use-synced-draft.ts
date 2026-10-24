"use client";

import { useState } from "react";

/**
 * Input de búsqueda controlado que sigue un valor externo (query de la URL)
 * sin usar efectos: si el valor externo cambia, se muestra ese valor.
 */
export function useSyncedDraft(
  external: string,
): [string, (next: string) => void] {
  const [draft, setDraft] = useState({ base: external, value: external });

  const value = draft.base === external ? draft.value : external;

  function setValue(next: string) {
    setDraft({ base: external, value: next });
  }

  return [value, setValue];
}
