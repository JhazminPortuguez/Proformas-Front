import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@heroui/react";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { CobrosResumen } from "@/components/cobros/cobros-resumen";
import { CobrosView } from "@/components/cobros/cobros-view";
import {
  getClientes,
  getCuentasPorCobrar,
  getCxCResumen,
  requireUser,
} from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type {
  Cliente,
  CxCResumen,
  CuentaPorCobrar,
  EstadoCobro,
  Paginated,
} from "@/lib/api/types";
import {
  cobrosHref,
  cobrosVencidasHref,
  parseEstadoCobro,
  type CobrosQuery,
} from "@/lib/cobros";
import { can } from "@/lib/permissions";
import { isValidDateOnly } from "@/lib/proformas";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cuentas por cobrar",
};

const PER_PAGE = 15;

const ACTION_LINK =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function positiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseFecha(value: string): string {
  return isValidDateOnly(value) ? value.trim() : "";
}

export default async function CobrosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const search = first(params.search).trim();
  const estado: EstadoCobro | "" =
    parseEstadoCobro(first(params.estado_cobro)) ?? "";
  const vencidaParam = first(params.vencida);
  const vencida = vencidaParam === "1" || vencidaParam === "true";
  const clienteId = positiveInt(first(params.cliente_id));

  const query: CobrosQuery = {
    search,
    estado,
    vencida,
    clienteId: clienteId ?? "",
    desde: parseFecha(first(params.desde)),
    hasta: parseFecha(first(params.hasta)),
    page: positiveInt(first(params.page)) ?? 1,
  };

  let resumen: CxCResumen;
  let cuentas: Paginated<CuentaPorCobrar>;
  let clientes: Cliente[] = [];

  try {
    const [resumenData, listado, clientesPage] = await Promise.all([
      getCxCResumen(),
      getCuentasPorCobrar({
        search,
        estado,
        vencida,
        clienteId: query.clienteId,
        desde: query.desde,
        hasta: query.hasta,
        page: query.page,
        perPage: PER_PAGE,
      }),
      getClientes({ perPage: 100 }),
    ]);

    resumen = resumenData;
    cuentas = listado;
    clientes = clientesPage.data;
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader
          title="Cuentas por cobrar"
          description="Saldos pendientes, vencimientos y registro de pagos."
        />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Cuentas por cobrar"
        description="Cartera emitida al cerrar órdenes: saldos, mora y pagos parciales."
        actions={
          <Link href="/ordenes?estado=FINALIZADA" className={ACTION_LINK}>
            <ClipboardList aria-hidden className="size-4" />
            Órdenes por cerrar
          </Link>
        }
      />

      <CobrosResumen resumen={resumen} />

      {resumen.vencidas > 0 && !query.vencida ? (
        <Alert status="warning" className="mb-5 items-start">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              {resumen.vencidas === 1
                ? "Hay 1 cuenta vencida"
                : `Hay ${formatNumber(resumen.vencidas)} cuentas vencidas`}
            </Alert.Title>
            <Alert.Description>
              El saldo en mora requiere seguimiento.{" "}
              <Link
                href={cobrosVencidasHref()}
                className="font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Ver solo vencidas
              </Link>
              .
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {query.vencida ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Mostrando únicamente cuentas vencidas con saldo pendiente.
          </p>
          <Link
            href={cobrosHref({ ...query, vencida: false, page: 1 })}
            className="text-sm font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Quitar filtro de vencidas
          </Link>
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Cartera</h2>
        <p className="numeric text-sm text-muted">
          {formatNumber(cuentas.meta.total)}{" "}
          {cuentas.meta.total === 1 ? "cuenta" : "cuentas"}
        </p>
      </div>

      <CobrosView
        cuentas={cuentas.data}
        meta={cuentas.meta}
        query={query}
        clientes={clientes}
        canPay={can(user, "pagos.registrar")}
      />
    </>
  );
}
