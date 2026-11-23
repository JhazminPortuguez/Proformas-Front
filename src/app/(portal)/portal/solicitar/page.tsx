import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@heroui/react";
import { MENSAJE_SOLICITAR_SIN_DATOS } from "@/components/portal/completar-datos";
import {
  MENSAJE_CLIENTE_INACTIVO,
  MENSAJE_SOLICITAR_SIN_VERIFICAR,
  SolicitarForm,
} from "@/components/portal/solicitar-form";
import { getPortalResumen, getPortalServicio, requireCliente } from "@/lib/api/server";
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
  // Si no se puede consultar, se deja intentar: el back rechaza con 403.
  const resumen = await getPortalResumen().catch(() => null);
  const inactivo = resumen?.puede_solicitar === false;
  // Parte 3: sin verificar el correo tampoco envía (el aviso general está arriba).
  const sinVerificar = resumen?.correo_verificado === false;
  // Ronda B, parte 2: la cuenta de Google completa teléfono y NIT/CI antes.
  const sinDatos = resumen?.datos_pendientes === true;
  const puedeSolicitar = !inactivo && !sinVerificar && !sinDatos;

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

      {inactivo ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>No puedes enviar solicitudes nuevas</Alert.Title>
            <Alert.Description>{MENSAJE_CLIENTE_INACTIVO}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <SolicitarForm
        key={servicio?.id ?? "libre"}
        servicio={servicio}
        bloqueado={!puedeSolicitar}
        motivoBloqueo={
          inactivo
            ? MENSAJE_CLIENTE_INACTIVO
            : sinVerificar
              ? MENSAJE_SOLICITAR_SIN_VERIFICAR
              : MENSAJE_SOLICITAR_SIN_DATOS
        }
      />
    </div>
  );
}
