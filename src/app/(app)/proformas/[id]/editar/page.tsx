import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProformaForm } from "@/components/proformas/proforma-form";
import { ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import {
  getClientes,
  getProductos,
  getProforma,
  getServicios,
  requireUser,
} from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  Cliente,
  Producto,
  Proforma,
  Servicio,
} from "@/lib/api/types";
import {
  estadoProformaEsEditable,
  todayDateOnly,
} from "@/lib/proformas";

export const metadata: Metadata = {
  title: "Editar proforma",
};

export default async function EditarProformaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;
  const proformaId = Number.parseInt(id, 10);

  if (!Number.isFinite(proformaId) || proformaId <= 0) {
    notFound();
  }

  let proforma: Proforma;
  let clientes: Cliente[];
  let servicios: Servicio[];
  let productos: Producto[];

  try {
    const [proformaData, clientesPage, serviciosPage, productosPage] =
      await Promise.all([
        getProforma(proformaId),
        getClientes({ perPage: 100 }),
        getServicios({ activo: true, perPage: 100 }),
        getProductos({ activo: true, perPage: 100 }),
      ]);

    proforma = proformaData;
    clientes = clientesPage.data;
    servicios = serviciosPage.data;
    productos = productosPage.data;
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    if (isApiError(error) && error.status === 404) {
      notFound();
    }

    return (
      <>
        <PageHeader title="Editar proforma" />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  // La edición solo está permitida mientras la proforma sigue en borrador.
  if (!estadoProformaEsEditable(proforma.estado)) {
    redirect(`/proformas/${proforma.id}`);
  }

  return (
    <ProformaForm
      proforma={proforma}
      clientes={clientes}
      servicios={servicios}
      productos={productos}
      today={todayDateOnly()}
    />
  );
}
