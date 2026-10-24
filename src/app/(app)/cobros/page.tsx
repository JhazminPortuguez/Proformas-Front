import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = {
  title: "Cuentas por cobrar",
};

export default function CobrosPage() {
  return (
    <ComingSoon
      title="Cuentas por cobrar"
      description="Saldos pendientes, vencimientos y registro de pagos."
      bullets={[
        "Antigüedad de saldos por cliente",
        "Recordatorios de cobro y acuerdos de pago",
        "Conciliación de pagos parciales",
      ]}
    />
  );
}
