import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCardSkeleton } from "@/components/auth/auth-card";
import { getGoogleHabilitado, getSessionUser } from "@/lib/api/server";
import { isApiError } from "@/lib/api/types";
import { homePathFor } from "@/lib/roles";
import { mensajeGoogle } from "@/components/auth/google-boton";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Ingresar",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <LoginGate searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginGate({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    user = await getSessionUser();
  } catch (error) {
    // Una caída del backend no debe dejar inutilizable la pantalla de login.
    if (!(isApiError(error) && (error.status === 0 || error.status >= 500))) {
      throw error;
    }
  }

  if (user) {
    redirect(homePathFor(user.rol));
  }

  const [params, google] = await Promise.all([searchParams, getGoogleHabilitado()]);
  const motivo = Array.isArray(params.google) ? params.google[0] : params.google;

  return <LoginForm google={google} errorGoogle={mensajeGoogle(motivo)} />;
}
