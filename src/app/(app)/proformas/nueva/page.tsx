import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProformaForm } from "@/components/proformas/proforma-form";
import { ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import {
  getClientes,
  getParametros,
  getProductos,
  getPromociones,
  getServicios,
  requireUser,
} from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Cliente, Parametros, Producto, Promocion, Servicio } from "@/lib/api/types";
import { todayDateOnly } from "@/lib/proformas";

export const metadata: Metadata = {
  title: "Nueva proforma",
};

export default async function NuevaProformaPage() {
  await requireUser();

  let clientes: Cliente[];
  let servicios: Servicio[];
  let productos: Producto[];
  let parametros: Parametros | null;
  let promociones: Promocion[];

  try {
    const [clientesPage, serviciosPage, productosPage, parametrosSistema, promocionesPage] = await Promise.all([
      // Primera página: el formulario busca el resto en el servidor.
        getClientes({ perPage: 20, activos: true }),
      getServicios({ activo: true, perPage: 20 }),
      getProductos({ activo: true, perPage: 20 }),
      // Ronda B: si no se pueden leer, el formulario usa 13 % y validez en blanco.
      getParametros().catch(() => null),
      // Ronda C: si no se pueden leer, la proforma se arma sin promociones.
      getPromociones({ vigentes: true, perPage: 100 }).catch(() => null),
    ]);

    promociones = promocionesPage?.data ?? [];

    parametros = parametrosSistema;

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
      parametros={parametros}
      promociones={promociones}
    />
  );
}
