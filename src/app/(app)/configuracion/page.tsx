import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmpresaForm } from "@/components/configuracion/empresa-form";
import { ParametrosForm } from "@/components/configuracion/parametros-form";
import { ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { getEmpresa, requireUser } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Empresa } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Configuración",
};

export default async function ConfiguracionPage() {
  // Ronda B: la configuración pasó del administrador al superusuario.
  await requireUser(["superusuario"]);

  const header = (
    <PageHeader
      title="Configuración"
      description="Datos de la empresa, logo y parámetros del sistema. Se usan en el PDF de las proformas, en el portal de clientes y al crear proformas."
    />
  );

  let empresa: Empresa;

  try {
    empresa = await getEmpresa();
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
      <EmpresaForm empresa={empresa} />
      <ParametrosForm
        parametros={{
          impuesto_por_defecto: empresa.impuesto_por_defecto ?? "13",
          dias_validez_por_defecto: empresa.dias_validez_por_defecto ?? null,
        }}
      />
    </>
  );
}
