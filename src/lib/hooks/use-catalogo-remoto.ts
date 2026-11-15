"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Catálogo que se busca en el servidor mientras se escribe (sin el límite de
 * una página precargada). Guarda todo lo que ya vio en `conocidos`, para que
 * el formulario conozca el precio, la unidad o el stock de lo elegido aunque
 * no esté en el último resultado. `resultado` son los ids de la última
 * búsqueda, en el orden del servidor.
 */
export function useCatalogoRemoto<T extends { id: number }>(
  inicial: readonly T[],
  buscar: (termino: string) => Promise<T[]>,
  demoraMs = 250,
) {
  const [conocidos, setConocidos] = useState<T[]>(() => [...inicial]);
  const [resultado, setResultado] = useState<number[]>(() => inicial.map((item) => item.id));
  const [cargando, setCargando] = useState(false);
  const ultimaPeticion = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buscarRef = useRef(buscar);

  useEffect(() => {
    buscarRef.current = buscar;
  }, [buscar]);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const pedir = useCallback(
    (termino: string) => {
      if (temporizador.current) clearTimeout(temporizador.current);

      const numero = ++ultimaPeticion.current;

      setCargando(true);
      temporizador.current = setTimeout(async () => {
        try {
          const items = await buscarRef.current(termino.trim());

          // Solo vale la respuesta de la última búsqueda.
          if (numero !== ultimaPeticion.current) return;

          setConocidos((anteriores) => {
            const porId = new Map(anteriores.map((item) => [item.id, item]));

            for (const item of items) porId.set(item.id, item);

            return [...porId.values()];
          });
          setResultado(items.map((item) => item.id));
        } catch {
          // Si falla, se mantienen los resultados anteriores.
        } finally {
          if (numero === ultimaPeticion.current) setCargando(false);
        }
      }, demoraMs);
    },
    [demoraMs],
  );

  return { conocidos, resultado, cargando, buscar: pedir };
}

/**
 * Opciones de un selector: lo que trajo la última búsqueda, más lo que ya
 * está elegido (para que el campo no quede vacío si no vino en el resultado).
 */
export function opcionesVisibles<T extends { id: number }>(
  conocidos: readonly T[],
  resultado: readonly number[],
  seleccionado: string,
): T[] {
  const ids = new Set(resultado);
  const porId = new Map(conocidos.map((item) => [item.id, item]));
  const lista = resultado.flatMap((id) => {
    const item = porId.get(id);

    return item ? [item] : [];
  });
  const elegido = seleccionado ? porId.get(Number(seleccionado)) : undefined;

  if (elegido && !ids.has(elegido.id)) lista.push(elegido);

  return lista;
}
