import { ClipboardList, FilePlus2, HandCoins } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ActividadSection } from "@/components/dashboard/actividad-section";
import { ActionLink } from "@/components/dashboard/dashboard-ui";
import { CobranzaSection } from "@/components/dashboard/cobranza-section";
import { InventarioSection } from "@/components/dashboard/inventario-section";
import { KpiOverview } from "@/components/dashboard/kpi-overview";
import { PipelineSection } from "@/components/dashboard/pipeline-section";
import { ServiciosSection } from "@/components/dashboard/servicios-section";
import { primerNombre } from "@/lib/dashboard";
import type { DashboardData, User } from "@/lib/api/types";
import { can } from "@/lib/permissions";

interface DashboardViewProps {
  user: User;
  data: DashboardData;
}

/**
 * Vista de servidor del dashboard: no usa estado ni efectos, así que puede
 * renderizarse completa en el server y probarse con `render()` en jsdom.
 */
export function DashboardView({ user, data }: DashboardViewProps) {
  const nombre = primerNombre(user.name);

  const acciones = (
    <>
      {can(user, "proformas.crear") ? (
        <ActionLink
          href="/proformas/nueva"
          variant="primary"
          icon={<FilePlus2 aria-hidden className="size-4" />}
        >
          Nueva proforma
        </ActionLink>
      ) : null}

      {can(user, "ordenes.ver") ? (
        <ActionLink
          href="/ordenes"
          icon={<ClipboardList aria-hidden className="size-4" />}
        >
          Órdenes
        </ActionLink>
      ) : null}

      {can(user, "pagos.registrar") ? (
        <ActionLink
          href="/cobros"
          icon={<HandCoins aria-hidden className="size-4" />}
        >
          Registrar pago
        </ActionLink>
      ) : null}
    </>
  );

  return (
    <>
      <PageHeader
        title={nombre ? `Hola, ${nombre}` : "Dashboard"}
        description="Resumen operativo y financiero del mes."
        actions={acciones}
      />

      <div className="space-y-6">
        <KpiOverview data={data} />
        <PipelineSection data={data} />
        <CobranzaSection data={data} />
        <InventarioSection data={data} />

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <ServiciosSection data={data} />
          </div>
          <div className="lg:col-span-3">
            <ActividadSection data={data} />
          </div>
        </div>
      </div>
    </>
  );
}
