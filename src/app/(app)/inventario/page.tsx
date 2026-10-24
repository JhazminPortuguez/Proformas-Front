import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = {
  title: "Inventario",
};

export default function InventarioPage() {
  return (
    <ComingSoon
      title="Inventario"
      description="Materiales y repuestos disponibles para la operación."
      bullets={[
        "Stock por sucursal y movimientos",
        "Alertas de reposición",
        "Consumo asociado a órdenes de servicio",
      ]}
    />
  );
}
