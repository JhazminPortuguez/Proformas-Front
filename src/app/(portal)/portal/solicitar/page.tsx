import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SolicitarForm } from "@/components/portal/solicitar-form";
import { getPortalServicio, requireCliente } from "@/lib/api/server";
import type { PortalServicio } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Solicitar cotización",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function SolicitarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCliente();
  const params = await searchParams;
  const servicioId = Number.parseInt(first(params.servicio), 10);

  let servicio: PortalServicio | null = null;
  let servicioNoDisponible = false;

  if (Number.isFinite(servicioId) && servicioId > 0) {
    servicio = await getPortalServicio(servicioId).catch(() => null);
    servicioNoDisponible = servicio === null;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Solicitar cotización"
        description="Cuéntanos qué necesitas. Revisamos tu solicitud y te enviamos una proforma."
        wrap
      />

      {servicioNoDisponible ? (
        <p role="status" className="rounded-lg border border-border bg-surface-secondary/50 px-3 py-2 text-sm text-muted">
          El servicio elegido ya no está en el catálogo. Puedes describir lo que necesitas igual.
        </p>
      ) : null}

      <SolicitarForm key={servicio?.id ?? "libre"} servicio={servicio} />
    </div>
  );
}
