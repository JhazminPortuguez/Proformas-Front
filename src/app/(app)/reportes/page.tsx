import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = {
  title: "Reportes",
};

export default function ReportesPage() {
  return (
    <ComingSoon
      title="Reportes"
      description="Indicadores comerciales y de operación para tomar decisiones."
      bullets={[
        "Conversión de proformas por período",
        "Servicios más vendidos y rentabilidad",
        "Exportación a PDF y Excel",
      ]}
    />
  );
}
