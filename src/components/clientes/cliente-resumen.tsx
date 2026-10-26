import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  ClipboardList,
  Clock,
  FileText,
  HandCoins,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ClienteEstadoChip, StatusChip } from "@/components/ui/status-chip";
import type { Cliente, ClienteResumen } from "@/lib/api/types";
import {
  clienteCobranzaEstado,
  clienteCobrosHref,
  clienteOrdenesHref,
  clienteProformasHref,
  clienteResumenItems,
  clienteTabHref,
  contar,
  type ClienteResumenTone,
} from "@/lib/clientes";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  proformas: FileText,
  aceptadas: BadgeCheck,
  ordenes: ClipboardList,
  saldo: HandCoins,
  vencidas: Clock,
  servicios: Wrench,
};

const TONE_ICON: Record<ClienteResumenTone, string> = {
  default: "bg-surface-secondary text-muted",
  accent: "bg-accent-soft text-accent-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
};

const CARD_LINK =
  "block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const LINK =
  "font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const ACTION_LINK =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/** Seis totales consolidados del cliente; siempre visibles sobre las tabs. */
export function ClienteResumenCards({
  resumen,
  clienteId,
}: {
  resumen: ClienteResumen;
  clienteId: number;
}) {
  const items = clienteResumenItems(resumen, clienteId);
  const cobranza = clienteCobranzaEstado(resumen);

  return (
    <section aria-labelledby="cliente-resumen-title" className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2
          id="cliente-resumen-title"
          className="text-sm font-semibold text-foreground"
        >
          Resumen del cliente
        </h2>

        <StatusChip tone={cobranza.tone}>{cobranza.label}</StatusChip>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => {
          const Icon = ICONS[item.key] ?? FileText;

          return (
            <li
              key={item.key}
              className="rounded-xl border border-border bg-surface transition-colors duration-200 hover:bg-surface-secondary"
            >
              <Link href={item.href} className={CARD_LINK}>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                      {item.label}
                    </p>
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-lg",
                        TONE_ICON[item.tone],
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                  </div>

                  <p className="numeric mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {item.value}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <span className="truncate">{item.hint}</span>
                    <ArrowUpRight aria-hidden className="size-3 shrink-0" />
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface ClienteResumenTabProps {
  cliente: Cliente;
  resumen: ClienteResumen;
}

/** Contenido de la pestaña `resumen`: contacto, estado y accesos. */
export function ClienteResumenTab({
  cliente,
  resumen,
}: ClienteResumenTabProps) {
  const cobranza = clienteCobranzaEstado(resumen);
  const aceptadas = resumen.proformas.por_estado?.ACEPTADA ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="min-w-0 space-y-6">
        <section aria-labelledby="cliente-datos-title" className="space-y-2">
          <h2
            id="cliente-datos-title"
            className="text-sm font-semibold text-foreground"
          >
            Datos del cliente
          </h2>

          <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">Nombre o razón social</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {cliente.nombre_razon}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted">NIT / CI</dt>
              <dd className="numeric mt-0.5 text-foreground">
                {cliente.nit_ci ?? "—"}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted">Estado</dt>
              <dd className="mt-0.5">
                <ClienteEstadoChip estado={cliente.estado} />
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted">Teléfono</dt>
              <dd className="mt-0.5 text-foreground">
                {cliente.telefono ? (
                  <a href={`tel:${cliente.telefono}`} className={LINK}>
                    {cliente.telefono}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted">Correo electrónico</dt>
              <dd className="mt-0.5 break-all text-foreground">
                {cliente.email ? (
                  <a href={`mailto:${cliente.email}`} className={LINK}>
                    {cliente.email}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">Dirección</dt>
              <dd className="mt-0.5 text-foreground">
                {cliente.direccion ?? "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="cliente-comercial-title"
          className="space-y-2"
        >
          <h2
            id="cliente-comercial-title"
            className="text-sm font-semibold text-foreground"
          >
            Estado comercial
          </h2>

          <ul className="grid gap-3 sm:grid-cols-2">
            <li className="rounded-xl border border-border bg-surface p-4">
              <Link
                href={clienteTabHref(cliente.id, "proformas")}
                className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <p className="text-xs text-muted">Proformas</p>
                <p className="numeric mt-1 text-xl font-semibold text-foreground">
                  {formatNumber(resumen.proformas.total)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {contar(aceptadas, "aceptada", "aceptadas")} ·{" "}
                  {formatMoney(resumen.proformas.monto_total)} cotizado
                </p>
              </Link>
            </li>

            <li className="rounded-xl border border-border bg-surface p-4">
              <Link
                href={clienteTabHref(cliente.id, "ordenes")}
                className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <p className="text-xs text-muted">Órdenes de servicio</p>
                <p className="numeric mt-1 text-xl font-semibold text-foreground">
                  {contar(resumen.ordenes.activas, "activa", "activas")}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {contar(resumen.ordenes.total, "orden", "órdenes")} ·{" "}
                  {contar(
                    resumen.ordenes.finalizadas,
                    "finalizada",
                    "finalizadas",
                  )}
                </p>
              </Link>
            </li>

            <li className="rounded-xl border border-border bg-surface p-4">
              <Link
                href={clienteTabHref(cliente.id, "cobros")}
                className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <p className="text-xs text-muted">Cartera</p>
                <p className="numeric mt-1 text-xl font-semibold text-foreground">
                  {formatMoney(resumen.cobros.saldo)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {contar(resumen.cobros.cuentas, "cuenta", "cuentas")} ·{" "}
                  {contar(resumen.cobros.vencidas, "vencida", "vencidas")}
                </p>
              </Link>
            </li>

            <li className="rounded-xl border border-border bg-surface p-4">
              <Link
                href={clienteTabHref(cliente.id, "servicios")}
                className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <p className="text-xs text-muted">Servicios realizados</p>
                <p className="numeric mt-1 text-xl font-semibold text-foreground">
                  {formatNumber(resumen.servicios.realizados)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatMoney(resumen.servicios.monto)} facturado
                </p>
              </Link>
            </li>
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <section
          aria-labelledby="cliente-cobranza-title"
          className="rounded-xl border border-border bg-surface p-4"
        >
          <h2
            id="cliente-cobranza-title"
            className="text-sm font-semibold text-foreground"
          >
            Estado de cobranza
          </h2>

          <p className="mt-2 text-sm text-muted">{cobranza.description}</p>

          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Saldo</dt>
              <dd className="numeric font-semibold text-foreground">
                {formatMoney(resumen.cobros.saldo)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Emitido</dt>
              <dd className="numeric text-foreground">
                {formatMoney(resumen.cobros.monto_total)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Pagado</dt>
              <dd className="numeric text-foreground">
                {formatMoney(resumen.cobros.total_pagado)}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={clienteTabHref(cliente.id, "cobros")}
              className={ACTION_LINK}
            >
              Ver cartera
            </Link>

            {resumen.cobros.vencidas > 0 ? (
              <Link
                href={clienteCobrosHref(cliente.id, { vencida: true })}
                className={ACTION_LINK}
              >
                Ver vencidas
              </Link>
            ) : null}
          </div>
        </section>

        <section
          aria-labelledby="cliente-accesos-title"
          className="rounded-xl border border-border bg-surface p-4"
        >
          <h2
            id="cliente-accesos-title"
            className="text-sm font-semibold text-foreground"
          >
            Listados del cliente
          </h2>

          <ul className="mt-2 space-y-1.5 text-sm">
            <li>
              <Link
                href={clienteProformasHref(cliente.id)}
                className={LINK}
              >
                Todas las proformas
              </Link>
            </li>
            <li>
              <Link href={clienteOrdenesHref(cliente.id)} className={LINK}>
                Todas las órdenes
              </Link>
            </li>
            <li>
              <Link href={clienteCobrosHref(cliente.id)} className={LINK}>
                Toda la cartera
              </Link>
            </li>
            <li>
              <Link
                href={clienteProformasHref(cliente.id, "ACEPTADA")}
                className={LINK}
              >
                Proformas aceptadas
              </Link>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
