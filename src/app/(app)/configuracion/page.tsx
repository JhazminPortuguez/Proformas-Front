import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmpresaForm } from "@/components/configuracion/empresa-form";
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
  await requireUser(["admin"]);

  const header = (
    <PageHeader
      title="Configuración"
      description="Datos de la empresa y logo. Se usan en el PDF de las proformas y en el portal de clientes."
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
    </>
  );
}
