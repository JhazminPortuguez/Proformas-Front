import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, ClipboardList, Mail, Phone } from "lucide-react";
import { Alert } from "@heroui/react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { StatusChip } from "@/components/ui/status-chip";
import { CuentaMontos } from "@/components/cobros/cuenta-montos";
import { EstadoCobroChip, VencidaChip } from "@/components/cobros/chips";
import { PagosTable } from "@/components/cobros/pagos-table";
import { RegistrarPagoAction } from "@/components/cobros/registrar-pago-dialog";
import { getCuentaPorCobrar, requireUser } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { CuentaPorCobrar } from "@/lib/api/types";
import {
  cuentaAging,
  cuentaClienteNombre,
  cuentaDiasVencida,
  cuentaEstaVencida,
  cuentaOrdenNumero,
  cuentaPagosCount,
  cuentaSaldo,
  estadoCobroMeta,
  puedeRegistrarPago,
} from "@/lib/cobros";
import { ordenEstadoMeta } from "@/lib/estados";
import { can } from "@/lib/permissions";
import { formatDateOnly, formatMoney, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Detalle de cuenta por cobrar",
};

const ACTION_LINK =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const ACTION_LINK_GHOST =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const LINK =
  "font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export default async function CobroDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const cuentaId = Number.parseInt(id, 10);

  if (!Number.isFinite(cuentaId) || cuentaId <= 0) {
    notFound();
  }

  let cuenta: CuentaPorCobrar;

  try {
    cuenta = await getCuentaPorCobrar(cuentaId);
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    if (isApiError(error) && error.status === 404) {
      notFound();
    }

    return (
      <>
        <PageHeader
          title="Detalle de cuenta por cobrar"
          back={
            <Link href="/cobros" className={ACTION_LINK_GHOST}>
              <ArrowLeft aria-hidden className="size-4" />
              Volver a cobros
            </Link>
          }
        />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  const estadoMeta = estadoCobroMeta(cuenta.estado_cobro);
  const vencida = cuentaEstaVencida(cuenta);
  const diasVencida = cuentaDiasVencida(cuenta);
  const aging = cuentaAging(cuenta);
  const saldo = cuentaSaldo(cuenta);
  const cliente = cuenta.cliente;
  const orden = cuenta.orden;
  const puedePagar =
    can(user, "pagos.registrar") && puedeRegistrarPago(cuenta, true);
  const puedeAnular = can(user, "pagos.anular");
  const pagos = cuenta.pagos ?? [];

  return (
    <>
      <PageHeader
        wrap
        title={`Cobro ${cuenta.numero}`}
        description={`${cuentaClienteNombre(cuenta)} · ${estadoMeta.label}`}
        back={
          <Link href="/cobros" className={ACTION_LINK_GHOST}>
            <ArrowLeft aria-hidden className="size-4" />
            Volver a cobros
          </Link>
        }
        actions={
          <>
            {cliente ? (
              <Link
                href={`/clientes/${cuenta.cliente_id}`}
                className={ACTION_LINK}
              >
                <Building2 aria-hidden className="size-4" />
                Ver cliente
              </Link>
            ) : null}

            <Link href={`/ordenes/${orden?.id ?? cuenta.orden_id}`} className={ACTION_LINK}>
              <ClipboardList aria-hidden className="size-4" />
              Ver orden
            </Link>

            {puedePagar ? <RegistrarPagoAction cuenta={cuenta} /> : null}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <EstadoCobroChip estado={cuenta.estado_cobro} />
        <VencidaChip cuenta={cuenta} />
        <span className="text-sm text-muted">{estadoMeta.description}</span>
      </div>

      {vencida ? (
        <Alert
          status={diasVencida > 60 ? "danger" : "warning"}
          className="mb-6 items-start"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              {diasVencida > 0
                ? `Cuenta vencida hace ${formatNumber(diasVencida)} ${
                    diasVencida === 1 ? "día" : "días"
                  }`
                : "Cuenta vencida"}
            </Alert.Title>
            <Alert.Description>
              Antigüedad {aging.label}: {aging.description} Saldo pendiente:{" "}
              {formatMoney(saldo)}.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <CuentaMontos cuenta={cuenta} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="datos-title" className="space-y-2">
            <h2
              id="datos-title"
              className="text-sm font-semibold text-foreground"
            >
              Datos de la cuenta
            </h2>

            <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Cliente</dt>
                <dd className="mt-0.5 text-foreground">
                  {cliente ? (
                    <Link
                      href={`/clientes/${cuenta.cliente_id}`}
                      className={LINK}
                    >
                      {cliente.nombre_razon}
                    </Link>
                  ) : (
                    <Link
                      href={`/clientes/${cuenta.cliente_id}`}
                      className={LINK}
                    >
                      {cuentaClienteNombre(cuenta)}
                    </Link>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-muted">Orden de servicio</dt>
                <dd className="mt-0.5 text-foreground">
                  <Link
                    href={`/ordenes/${orden?.id ?? cuenta.orden_id}`}
                    className={LINK}
                  >
                    {cuentaOrdenNumero(cuenta)}
                  </Link>
                  {orden ? (
                    <span className="text-xs text-muted">
                      {" "}
                      · {ordenEstadoMeta(orden.estado).label}
                    </span>
                  ) : null}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-muted">Emisión</dt>
                <dd className="numeric mt-0.5 text-foreground">
                  {formatDateOnly(cuenta.fecha_emision)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-muted">Vencimiento</dt>
                <dd className="numeric mt-0.5 text-foreground">
                  {formatDateOnly(cuenta.fecha_vencimiento)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-muted">Moneda</dt>
                <dd className="mt-0.5 text-foreground">{cuenta.moneda}</dd>
              </div>

              <div>
                <dt className="text-xs text-muted">Pagos registrados</dt>
                <dd className="numeric mt-0.5 text-foreground">
                  {formatNumber(cuentaPagosCount(cuenta))}
                </dd>
              </div>
            </dl>
          </section>

          <PagosTable pagos={pagos} canAnular={puedeAnular} />
        </div>

        <aside className="space-y-4">
          <section
            aria-labelledby="aging-title"
            className="rounded-xl border border-border bg-surface p-4"
          >
            <h2
              id="aging-title"
              className="text-sm font-semibold text-foreground"
            >
              Antigüedad del saldo
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusChip tone={aging.tone}>{aging.label}</StatusChip>
              {vencida ? (
                <span className="numeric text-xs text-muted">
                  {formatNumber(diasVencida)}{" "}
                  {diasVencida === 1 ? "día de mora" : "días de mora"}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-muted">{aging.description}</p>

            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Saldo</dt>
                <dd className="numeric font-semibold text-foreground">
                  {formatMoney(saldo)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Vence</dt>
                <dd className="numeric text-foreground">
                  {formatDateOnly(cuenta.fecha_vencimiento)}
                </dd>
              </div>
            </dl>
          </section>

          {cliente && (cliente.telefono || cliente.email) ? (
            <section
              aria-labelledby="contacto-title"
              className="rounded-xl border border-border bg-surface p-4"
            >
              <h2
                id="contacto-title"
                className="text-sm font-semibold text-foreground"
              >
                Contacto para el cobro
              </h2>

              <ul className="mt-2 space-y-2 text-sm">
                {cliente.telefono ? (
                  <li className="flex items-center gap-2 text-foreground">
                    <Phone aria-hidden className="size-4 shrink-0 text-muted" />
                    <a
                      href={`tel:${cliente.telefono}`}
                      className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {cliente.telefono}
                    </a>
                  </li>
                ) : null}

                {cliente.email ? (
                  <li className="flex items-center gap-2 text-foreground">
                    <Mail aria-hidden className="size-4 shrink-0 text-muted" />
                    <a
                      href={`mailto:${cliente.email}`}
                      className="break-all underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {cliente.email}
                    </a>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
