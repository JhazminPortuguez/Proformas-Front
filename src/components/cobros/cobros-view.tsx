"use client";

import { useState } from "react";
import type { Cliente, CuentaPorCobrar, PaginationMeta } from "@/lib/api/types";
import type { CobrosQuery } from "@/lib/cobros";
import { CobrosFiltros } from "./cobros-filtros";
import { CobrosTable } from "./cobros-table";
import { RegistrarPagoDialog } from "./registrar-pago-dialog";

interface CobrosViewProps {
  cuentas: CuentaPorCobrar[];
  meta: PaginationMeta;
  query: CobrosQuery;
  clientes: readonly Cliente[];
  canPay: boolean;
}

/**
 * Une filtros, tabla/cards y el diálogo de pago. El diálogo vive una sola vez
 * en el cliente: la fila solo indica qué cuenta se va a cobrar.
 */
export function CobrosView({
  cuentas,
  meta,
  query,
  clientes,
  canPay,
}: CobrosViewProps) {
  const [cuentaPago, setCuentaPago] = useState<CuentaPorCobrar | null>(null);
  const [session, setSession] = useState(0);

  function openPago(cuenta: CuentaPorCobrar) {
    setCuentaPago(cuenta);
    setSession((value) => value + 1);
  }

  return (
    <div>
      <CobrosFiltros query={query} clientes={clientes} className="mb-4" />

      <CobrosTable
        cuentas={cuentas}
        meta={meta}
        query={query}
        canPay={canPay}
        onPagar={openPago}
      />

      {canPay ? (
        <RegistrarPagoDialog
          key={`pago-${session}`}
          isOpen={cuentaPago !== null}
          onOpenChange={(open) => {
            if (!open) setCuentaPago(null);
          }}
          cuenta={cuentaPago}
        />
      ) : null}
    </div>
  );
}
