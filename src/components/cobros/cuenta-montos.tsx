import type { CuentaPorCobrar } from "@/lib/api/types";
import {
  cuentaPagosCount,
  cuentaProgreso,
  cuentaSaldo,
  cuentaTotalPagado,
} from "@/lib/cobros";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

interface CuentaMontosProps {
  cuenta: CuentaPorCobrar;
}

/** Total, pagado y saldo con la barra de avance del cobro. */
export function CuentaMontos({ cuenta }: CuentaMontosProps) {
  const total = cuenta.monto_total;
  const pagado = cuentaTotalPagado(cuenta);
  const saldo = cuentaSaldo(cuenta);
  const progreso = cuentaProgreso(cuenta);
  const pagosCount = cuentaPagosCount(cuenta);

  const celdas = [
    {
      key: "total",
      label: "Total de la cuenta",
      value: formatMoney(total),
      hint: cuenta.moneda,
    },
    {
      key: "pagado",
      label: "Pagado",
      value: formatMoney(pagado),
      hint: `${formatNumber(pagosCount)} ${
        pagosCount === 1 ? "pago" : "pagos"
      }`,
    },
    {
      key: "saldo",
      label: "Saldo pendiente",
      value: formatMoney(saldo),
      hint: saldo > 0 ? "Sujeto a cobro" : "Cuenta liquidada",
    },
  ];

  return (
    <section aria-labelledby="cuenta-montos-title" className="mb-6">
      <h2 id="cuenta-montos-title" className="sr-only">
        Montos de la cuenta
      </h2>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <dl className="grid sm:grid-cols-3">
          {celdas.map((celda, index) => (
            <div
              key={celda.key}
              className={cn(
                "border-border p-4",
                index > 0 && "border-t sm:border-t-0 sm:border-s",
              )}
            >
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {celda.label}
              </dt>
              <dd className="numeric mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {celda.value}
              </dd>
              <dd className="mt-0.5 text-xs text-muted">{celda.hint}</dd>
            </div>
          ))}
        </dl>

        <div className="border-t border-border px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-muted">Progreso de cobro</p>
            <p className="numeric text-xs text-foreground">
              {formatNumber(progreso)}%
            </p>
          </div>

          <div
            role="progressbar"
            aria-label="Progreso de cobro de la cuenta"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progreso}
            aria-valuetext={`${formatNumber(progreso)}% pagado`}
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-secondary"
          >
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
