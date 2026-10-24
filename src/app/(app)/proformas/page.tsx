import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = {
  title: "Proformas",
};

export default function ProformasPage() {
  return (
    <ComingSoon
      title="Proformas"
      description="Emisión, envío y seguimiento comercial de proformas."
      bullets={[
        "Numeración correlativa y plantillas por empresa",
        "Estados: borrador, enviada, aprobada, rechazada y vencida",
        "Envío al cliente y conversión a orden de servicio",
      ]}
    />
  );
}
