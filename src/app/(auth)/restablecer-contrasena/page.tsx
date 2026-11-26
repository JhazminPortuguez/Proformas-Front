import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCardSkeleton } from "@/components/auth/auth-card";
import { RestablecerContrasenaForm } from "@/components/auth/restablecer-contrasena-form";

export const metadata: Metadata = {
  title: "Elegir una contraseña nueva",
};

type Params = Promise<Record<string, string | string[] | undefined>>;

function primero(valor: string | string[] | undefined): string {
  return Array.isArray(valor) ? (valor[0] ?? "") : (valor ?? "");
}

/**
 * Ronda C, parte 2: a esta página lleva el enlace del correo
 * (`?token=…&email=…`). Es pública: se abre sin sesión.
 */
export default function RestablecerContrasenaPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <Formulario searchParams={searchParams} />
    </Suspense>
  );
}

async function Formulario({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;

  return <RestablecerContrasenaForm token={primero(params.token)} email={primero(params.email)} />;
}
