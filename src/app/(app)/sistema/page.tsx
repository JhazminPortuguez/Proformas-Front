import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EstadoSistemaView } from "@/components/sistema/estado-sistema";
import { ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { getEstadoSistema, requireUser } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { EstadoSistema } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Estado del sistema",
};

/** Ronda B, parte 1: solo el superusuario. */
export default async function SistemaPage() {
  const user = await requireUser(["superusuario"]);

  const header = (
    <PageHeader
      title="Estado del sistema"
      description="Versión, base de datos y correo. La contraseña del correo nunca se muestra."
    />
  );

  let estado: EstadoSistema;

  try {
    estado = await getEstadoSistema();
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        {header}
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  return (
    <>
      {header}
      <EstadoSistemaView estado={estado} email={user.email} />
    </>
  );
}
