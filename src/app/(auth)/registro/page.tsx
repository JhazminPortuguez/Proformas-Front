import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCardSkeleton } from "@/components/auth/auth-card";
import { getSessionUser } from "@/lib/api/server";
import { isApiError } from "@/lib/api/types";
import { homePathFor } from "@/lib/roles";
import { RegistroForm } from "./registro-form";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegistroPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <RegistroGate />
    </Suspense>
  );
}

async function RegistroGate() {
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    user = await getSessionUser();
  } catch (error) {
    // Una caída del backend no debe dejar inutilizable la pantalla de registro.
    if (!(isApiError(error) && (error.status === 0 || error.status >= 500))) {
      throw error;
    }
  }

  if (user) {
    redirect(homePathFor(user.rol));
  }

  return <RegistroForm />;
}
