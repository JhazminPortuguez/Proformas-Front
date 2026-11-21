import type { Metadata } from "next";
import { Suspense } from "react";
import {
  estadoVerificacion,
  VerificarCorreoResultado,
} from "@/components/portal/verificar-correo-resultado";

export const metadata: Metadata = {
  title: "Verificar correo",
};

type Params = Promise<Record<string, string | string[] | undefined>>;

/**
 * Ronda A, parte 3: a esta página vuelve el enlace del correo de
 * verificación (el back verifica y redirige con `?estado=`). Es pública: el
 * enlace se puede abrir en otro navegador sin sesión.
 */
export default function VerificarCorreoPage({ searchParams }: { searchParams: Params }) {
  // `searchParams` es dato dinámico: va dentro de Suspense (prerender parcial).
  return (
    <Suspense fallback={<p className="text-sm text-muted">Revisando el enlace…</p>}>
      <Resultado searchParams={searchParams} />
    </Suspense>
  );
}

async function Resultado({ searchParams }: { searchParams: Params }) {
  const { estado } = await searchParams;

  return <VerificarCorreoResultado estado={estadoVerificacion(estado)} />;
}
