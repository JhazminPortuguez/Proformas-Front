import type { CuentaPorCobrar, PagoCuenta } from "@/lib/api/types";
import { StatusChip } from "@/components/ui/status-chip";
import { cuentaDiasVencida, cuentaEstaVencida, estadoCobroMeta } from "@/lib/cobros";

export function EstadoCobroChip({ estado }: { estado: string }) {
  const meta = estadoCobroMeta(estado);

  return <StatusChip tone={meta.tone}>{meta.label}</StatusChip>;
}

/**
 * El chip de vencimiento lleva los días en el texto para que la tabla no
 * dependa solo del color.
 */
export function VencidaChip({
  cuenta,
}: {
  cuenta: Pick<
    CuentaPorCobrar,
    | "vencida"
    | "dias_vencida"
    | "saldo"
    | "monto_total"
    | "total_pagado"
    | "fecha_vencimiento"
  >;
}) {
  if (!cuentaEstaVencida(cuenta)) {
    return <StatusChip tone="neutral">Al día</StatusChip>;
  }

  const dias = cuentaDiasVencida(cuenta);

  return (
    <StatusChip tone={dias > 60 ? "danger" : "warning"}>
      {dias > 0 ? `Vencida ${dias} d` : "Vencida"}
    </StatusChip>
  );
}

export function PagoEstadoChip({ pago }: { pago: Pick<PagoCuenta, "anulado"> }) {
  return (
    <StatusChip tone={pago.anulado ? "neutral" : "success"}>
      {pago.anulado ? "Anulado" : "Vigente"}
    </StatusChip>
  );
}
