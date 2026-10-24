import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { requireUser } from "@/lib/api/server";

export const metadata: Metadata = {
  title: "Configuración",
};

export default async function ConfiguracionPage() {
  await requireUser(["admin"]);

  return (
    <ComingSoon
      title="Configuración"
      description="Datos de la empresa, series de numeración y preferencias del sistema."
      bullets={[
        "Datos fiscales y logo por empresa",
        "Series y numeración de proformas",
        "Parámetros de vencimiento e impuestos",
      ]}
    />
  );
}
