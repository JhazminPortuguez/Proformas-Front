import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, FileText, Wallet } from "lucide-react";
import { Alert } from "@heroui/react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { NavTabs } from "@/components/ui/nav-tabs";
import { OrdenEstadoChip } from "@/components/ui/status-chip";
import { ConsumirMaterialesDialog } from "@/components/ordenes/consumir-materiales-dialog";
import { OrdenActions } from "@/components/ordenes/orden-actions";
import { OrdenItemsTable } from "@/components/ordenes/orden-items-table";
import { OrdenMaterialesTable } from "@/components/ordenes/orden-materiales-table";
import { OrdenTimeline } from "@/components/ordenes/orden-timeline";
import { getOrden, getUsuarios, requireUser } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Orden, User } from "@/lib/api/types";
import { ordenEstadoMeta, proformaEstadoMeta } from "@/lib/estados";
import {
  accionesOrden,
  ordenActualizadaEn,
  ordenClienteNombre,
  ordenCreadaEn,
  ordenFechaProgramadaTexto,
  ordenItemsCount,
  ordenOperarioNombre,
  ordenProformaNumero,
  type AccionesOrdenOpciones,
} from "@/lib/ordenes";
import { materialesPendientes, ordenMateriales } from "@/lib/inventario";
import { can } from "@/lib/permissions";
import { formatDateOnly, formatDateTime, formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Detalle de orden",
};

const TAB_KEYS = ["resumen", "items", "materiales", "historial"] as const;

type TabKey = (typeof TAB_KEYS)[number];

const ACTION_LINK =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const ACTION_LINK_GHOST =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function OrdenDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const ordenId = Number.parseInt(id, 10);

  if (!Number.isFinite(ordenId) || ordenId <= 0) {
    notFound();
  }

  let orden: Orden;

  try {
    orden = await getOrden(ordenId);
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
          title="Detalle de orden"
          back={
            <Link href="/ordenes" className={ACTION_LINK_GHOST}>
              <ArrowLeft aria-hidden className="size-4" />
              Volver a órdenes
            </Link>
          }
        />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  const permisos: AccionesOrdenOpciones = {
    canAssign: can(user, "ordenes.asignar"),
    canCancel: can(user, "ordenes.cancelar"),
    canClose: can(user, "ordenes.cerrar"),
  };
  const acciones = accionesOrden(orden, permisos);

  let operarios: User[] = [];

  if (acciones.has("asignar") && can(user, "usuarios.ver")) {
    try {
      const page = await getUsuarios({
        rol: "operario",
        activo: true,
        perPage: 100,
      });

      operarios = page.data;
    } catch {
      operarios = [];
    }
  }

  const tabParam = first(query.tab);
  const tab: TabKey = TAB_KEYS.includes(tabParam as TabKey)
    ? (tabParam as TabKey)
    : "resumen";
  const estadoMeta = ordenEstadoMeta(orden.estado);
  const cliente = orden.cliente;
  const proforma = orden.proforma;
  const itemsCount = ordenItemsCount(orden);
  const materialesCount = ordenMateriales(orden.items).length;
  const materialesPorConsumir = materialesPendientes(orden.items);
  const puedeConsumir =
    acciones.has("consumir") &&
    can(user, "inventario.consumir") &&
    materialesPorConsumir.length > 0;
  const eventosCount = orden.eventos?.length ?? 0;
  const cobroId = orden.cuenta_por_cobrar_id ?? orden.cuenta?.id ?? null;
  const puedeVerCobro = Boolean(cobroId) && can(user, "cobros.ver");

  return (
    <>
      <PageHeader
        wrap
        title={`Orden ${orden.numero}`}
        description={
          cliente
            ? `${ordenClienteNombre(orden)} · ${estadoMeta.label}`
            : estadoMeta.label
        }
        back={
          <Link href="/ordenes" className={ACTION_LINK_GHOST}>
            <ArrowLeft aria-hidden className="size-4" />
            Volver a órdenes
          </Link>
        }
        actions={
          <>
            {cliente ? (
              <Link
                href={`/clientes/${orden.cliente_id}`}
                className={ACTION_LINK}
              >
                <Building2 aria-hidden className="size-4" />
                Ver cliente
              </Link>
            ) : null}

            <Link
              href={`/proformas/${orden.proforma_id}`}
              className={ACTION_LINK}
            >
              <FileText aria-hidden className="size-4" />
              Ver proforma
            </Link>

            {puedeVerCobro && cobroId ? (
              <Link href={`/cobros/${cobroId}`} className={ACTION_LINK}>
                <Wallet aria-hidden className="size-4" />
                Ver cobro
              </Link>
            ) : null}

            <OrdenActions
              ordenId={orden.id}
              numero={orden.numero}
              acciones={Array.from(acciones)}
              operarios={operarios}
              display="detail"
              hideVer
            />
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <OrdenEstadoChip estado={orden.estado} />
        <span className="text-sm text-muted">{estadoMeta.description}</span>
      </div>

      {orden.estado === "CANCELADA" ? (
        <Alert status="danger" className="mb-6">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Orden cancelada</Alert.Title>
            <Alert.Description>
              {orden.motivo_cancelacion ||
                "No se registró un motivo de cancelación."}
              {orden.cancelada_at
                ? ` · ${formatDateTime(orden.cancelada_at)}`
                : ""}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {orden.cerrada_at ? (
        <Alert status="success" className="mb-6">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Cierre administrativo completado</Alert.Title>
            <Alert.Description>
              Cerrada el {formatDateTime(orden.cerrada_at)}
              {orden.cerrador?.name ? ` por ${orden.cerrador.name}` : ""}.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <NavTabs
        label="Secciones de la orden"
        current={tab}
        tabs={[
          {
            key: "resumen",
            label: "Resumen",
            href: `/ordenes/${orden.id}?tab=resumen`,
          },
          {
            key: "items",
            label: "Ítems",
            href: `/ordenes/${orden.id}?tab=items`,
            count: itemsCount,
          },
          {
            key: "materiales",
            label: "Materiales",
            href: `/ordenes/${orden.id}?tab=materiales`,
            count: materialesCount,
          },
          {
            key: "historial",
            label: "Historial",
            href: `/ordenes/${orden.id}?tab=historial`,
            count: eventosCount,
          },
        ]}
        className="mb-6"
      />

      {tab === "resumen" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="space-y-6">
            <section aria-labelledby="datos-title" className="space-y-2">
              <h2
                id="datos-title"
                className="text-sm font-semibold text-foreground"
              >
                Datos generales
              </h2>

              <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">Cliente</dt>
                  <dd className="mt-0.5 text-foreground">
                    {cliente ? (
                      <Link
                        href={`/clientes/${orden.cliente_id}`}
                        className="font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        {cliente.nombre_razon}
                      </Link>
                    ) : (
                      <Link
                        href={`/clientes/${orden.cliente_id}`}
                        className="font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        Cliente #{orden.cliente_id}
                      </Link>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Proforma</dt>
                  <dd className="mt-0.5 text-foreground">
                    <Link
                      href={`/proformas/${orden.proforma_id}`}
                      className="font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {ordenProformaNumero(orden)}
                    </Link>
                    {proforma ? (
                      <span className="text-xs text-muted">
                        {" "}
                        · {proformaEstadoMeta(proforma.estado).label} ·{" "}
                        {formatMoney(proforma.total)}
                      </span>
                    ) : null}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Operario</dt>
                  <dd className="mt-0.5 text-foreground">
                    {ordenOperarioNombre(orden)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Fecha programada</dt>
                  <dd className="numeric mt-0.5 text-foreground">
                    {ordenFechaProgramadaTexto(orden)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Inicio del trabajo</dt>
                  <dd className="numeric mt-0.5 text-foreground">
                    {formatDateTime(orden.fecha_inicio)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Fin del trabajo</dt>
                  <dd className="numeric mt-0.5 text-foreground">
                    {formatDateTime(orden.fecha_fin)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Registrada</dt>
                  <dd className="numeric mt-0.5 text-foreground">
                    {formatDateTime(ordenCreadaEn(orden))}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Última actualización</dt>
                  <dd className="numeric mt-0.5 text-foreground">
                    {formatDateTime(ordenActualizadaEn(orden))}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="observaciones-title" className="space-y-2">
              <h2
                id="observaciones-title"
                className="text-sm font-semibold text-foreground"
              >
                Observaciones
              </h2>
              <p className="whitespace-pre-line rounded-xl border border-border bg-surface p-4 text-sm text-foreground">
                {orden.observaciones?.trim() || "Sin observaciones."}
              </p>
            </section>

            {orden.motivo_cancelacion ? (
              <section
                aria-labelledby="motivo-cancelacion-title"
                className="space-y-2"
              >
                <h2
                  id="motivo-cancelacion-title"
                  className="text-sm font-semibold text-foreground"
                >
                  Motivo de cancelación
                </h2>
                <p className="whitespace-pre-line rounded-xl border border-danger/40 bg-danger-soft/40 p-4 text-sm text-foreground">
                  {orden.motivo_cancelacion}
                </p>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4">
            <section
              aria-labelledby="operario-title"
              className="rounded-xl border border-border bg-surface p-4"
            >
              <h2
                id="operario-title"
                className="text-sm font-semibold text-foreground"
              >
                Responsable
              </h2>

              <p className="mt-2 text-sm font-medium text-foreground">
                {ordenOperarioNombre(orden)}
              </p>

              {orden.operario?.email ? (
                <p className="mt-0.5 break-words text-xs text-muted">
                  {orden.operario.email}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted">
                  {orden.operario_id
                    ? "Sin datos de contacto registrados."
                    : "Asigna un operario para que pueda iniciar el trabajo."}
                </p>
              )}
            </section>

            <section
              aria-labelledby="seguimiento-title"
              className="rounded-xl border border-border bg-surface p-4"
            >
              <h2
                id="seguimiento-title"
                className="text-sm font-semibold text-foreground"
              >
                Seguimiento
              </h2>

              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Programada</dt>
                  <dd className="numeric text-foreground">
                    {formatDateOnly(orden.fecha_programada)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Iniciada</dt>
                  <dd className="numeric text-foreground">
                    {formatDateTime(orden.fecha_inicio)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Finalizada</dt>
                  <dd className="numeric text-foreground">
                    {formatDateTime(orden.fecha_fin)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Cerrada</dt>
                  <dd className="numeric text-foreground">
                    {formatDateTime(orden.cerrada_at)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Cancelada</dt>
                  <dd className="numeric text-foreground">
                    {formatDateTime(orden.cancelada_at)}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      ) : null}

      {tab === "items" ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Ítems de la orden
          </h2>
          <OrdenItemsTable orden={orden} />
        </div>
      ) : null}

      {tab === "materiales" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Materiales de la orden
              </h2>
              <p className="mt-1 text-sm text-muted">
                Requerido, consumido y pendiente por línea. El consumo descuenta
                stock del inventario.
              </p>
            </div>

            {puedeConsumir ? (
              <ConsumirMaterialesDialog
                ordenId={orden.id}
                numero={orden.numero}
                items={orden.items ?? []}
              />
            ) : null}
          </div>

          <OrdenMaterialesTable orden={orden} />
        </div>
      ) : null}

      {tab === "historial" ? <OrdenTimeline orden={orden} /> : null}
    </>
  );
}
