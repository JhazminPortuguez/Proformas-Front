import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = {
  title: "Órdenes",
};

export default function OrdenesPage() {
  return (
    <ComingSoon
      title="Órdenes"
      description="Ejecución de los servicios vendidos y su avance operativo."
      bullets={[
        "Asignación de operarios por orden",
        "Estados de ejecución y fechas comprometidas",
        "Checklist de trabajo y registro de incidencias",
      ]}
    />
  );
}
