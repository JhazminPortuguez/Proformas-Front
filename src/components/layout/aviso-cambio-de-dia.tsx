"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Alert, Button } from "@heroui/react";
import { useAnnouncer } from "@/components/ui/announcer";
import { todayDateOnly } from "@/lib/proformas";
import { formatDateNumeric } from "@/lib/utils";

/** Cada cuánto se revisa el día, además de al volver a la pestaña. */
export const INTERVALO_CAMBIO_DE_DIA_MS = 60_000;

/**
 * Pantallas de solo lectura que muestran "hoy" o "el mes": se actualizan
 * solas, porque no hay nada escrito que perder. Reportes solo si usa el mes
 * actual por defecto (sin `desde` ni `hasta` en la URL).
 */
export function seActualizaSola(pathname: string, search: string): boolean {
  if (pathname === "/dashboard" || pathname === "/cobros" || pathname === "/inventario") {
    return true;
  }

  if (pathname === "/reportes") {
    const params = new URLSearchParams(search);

    return !params.has("desde") && !params.has("hasta");
  }

  return false;
}

/**
 * D-02: la pantalla quedó abierta y cambió el día (o el mes) en Bolivia.
 * - En el dashboard, cuentas por cobrar, inventario y reportes del mes
 *   actual, los datos se vuelven a pedir solos (`router.refresh()`).
 * - En las demás, un aviso ofrece "Actualizar": `router.refresh()` trae los
 *   datos del servidor sin perder lo que se esté escribiendo.
 * Se revisa cada minuto y al volver a la pestaña. No necesita migración: el
 * back ya calcula el día y el mes con la hora de Bolivia en cada consulta.
 */
export function AvisoCambioDeDia() {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const pathname = usePathname();
  const cargado = useRef(todayDateOnly());
  const [cambio, setCambio] = useState<{ desde: string; hoy: string; ruta: string } | null>(null);

  // Navegar a otra pantalla trae datos nuevos: ese es el nuevo día de carga.
  useEffect(() => {
    cargado.current = todayDateOnly();
  }, [pathname]);

  const actualizar = useCallback(
    (hoy: string) => {
      cargado.current = hoy;
      setCambio(null);
      router.refresh();
    },
    [router],
  );

  const revisar = useCallback(() => {
    const hoy = todayDateOnly();

    if (hoy === cargado.current) return;

    if (seActualizaSola(pathname, window.location.search)) {
      actualizar(hoy);
      announce(`Ya es ${formatDateNumeric(hoy)}. Los datos se actualizaron.`);

      return;
    }

    setCambio({ desde: cargado.current, hoy, ruta: pathname });
  }, [actualizar, announce, pathname]);

  useEffect(() => {
    const intervalo = window.setInterval(revisar, INTERVALO_CAMBIO_DE_DIA_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") revisar();
    };

    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", revisar);

    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", revisar);
    };
  }, [revisar]);

  // Un aviso de otra pantalla no aplica: al navegar se cargaron datos nuevos.
  if (!cambio || cambio.ruta !== pathname) return null;

  const cambioDeMes = cambio.hoy.slice(0, 7) !== cambio.desde.slice(0, 7);

  return (
    <Alert status="warning" role="status" className="mb-4">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          {cambioDeMes ? "Empezó un mes nuevo" : "Cambió el día"}
        </Alert.Title>
        <Alert.Description>
          Esta pantalla se cargó el {formatDateNumeric(cambio.desde)} y ya es{" "}
          {formatDateNumeric(cambio.hoy)}. Actualiza para ver los datos de hoy; lo
          que estés escribiendo no se pierde.
        </Alert.Description>
        <div className="mt-2">
          <Button variant="secondary" size="sm" onPress={() => actualizar(cambio.hoy)}>
            Actualizar
          </Button>
        </div>
      </Alert.Content>
    </Alert>
  );
}
