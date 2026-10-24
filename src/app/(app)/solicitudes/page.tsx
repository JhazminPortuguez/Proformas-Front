import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = {
  title: "Solicitudes",
};

export default function SolicitudesPage() {
  return (
    <ComingSoon
      title="Solicitudes"
      description="Pedidos de clientes que todavía no se convirtieron en proforma."
      bullets={[
        "Bandeja de entrada con prioridad y responsable",
        "Conversión directa a proforma",
        "Historial de respuestas al cliente",
      ]}
    />
  );
}
