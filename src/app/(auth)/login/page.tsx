import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCardSkeleton } from "@/components/auth/auth-card";
import { getSessionUser } from "@/lib/api/server";
import { isApiError } from "@/lib/api/types";
import { homePathFor } from "@/lib/roles";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Ingresar",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <LoginGate />
    </Suspense>
  );
}

async function LoginGate() {
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

  return <LoginForm />;
}
