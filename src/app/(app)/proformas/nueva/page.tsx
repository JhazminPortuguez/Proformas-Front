import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProformaForm } from "@/components/proformas/proforma-form";
import { ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import {
  getClientes,
  getProductos,
  getServicios,
  requireUser,
} from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Cliente, Producto, Servicio } from "@/lib/api/types";
import { todayDateOnly } from "@/lib/proformas";

export const metadata: Metadata = {
  title: "Nueva proforma",
};

export default async function NuevaProformaPage() {
  await requireUser();

  let clientes: Cliente[];
  let servicios: Servicio[];
  let productos: Producto[];

  try {
    const [clientesPage, serviciosPage, productosPage] = await Promise.all([
      getClientes({ perPage: 100 }),
      getServicios({ activo: true, perPage: 100 }),
      getProductos({ activo: true, perPage: 100 }),
    ]);

    clientes = clientesPage.data;
    servicios = serviciosPage.data;
    productos = productosPage.data;
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader title="Nueva proforma" />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  return (
    <ProformaForm
      proforma={null}
      clientes={clientes}
      servicios={servicios}
      productos={productos}
      today={todayDateOnly()}
    />
  );
}
