import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, ClipboardList, FileDown, Pencil } from "lucide-react";
import { Alert } from "@heroui/react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { NavTabs } from "@/components/ui/nav-tabs";
import { ProformaEstadoChip } from "@/components/ui/status-chip";
import { CrearOrdenDialog } from "@/components/proformas/crear-orden-dialog";
import { ProformaDetailActions } from "@/components/proformas/proforma-detail-actions";
import { ProformaHistory } from "@/components/proformas/proforma-history";
import { ProformaItemsTable } from "@/components/proformas/proforma-items-table";
import { TotalsSummary } from "@/components/proformas/totals-summary";
import { getProforma, getUsuarios, requireUser } from "@/lib/api/server";
import { proformaPdfUrl } from "@/lib/api/paths";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Proforma, User } from "@/lib/api/types";
import { proformaEstadoMeta } from "@/lib/estados";
import { accionesProforma } from "@/lib/proformas";
import { can } from "@/lib/permissions";
import { formatDateOnly, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Detalle de proforma",
};

const TAB_KEYS = ["resumen", "items", "historial"] as const;

type TabKey = (typeof TAB_KEYS)[number];

const ACTION_LINK =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const ACTION_LINK_GHOST =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function humanize(value: string | null | undefined): string {
  if (!value) return "Manual";

  const clean = value.toLowerCase().replaceAll("_", " ");

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export default async function ProformaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const proformaId = Number.parseInt(id, 10);

  if (!Number.isFinite(proformaId) || proformaId <= 0) {
    notFound();
  }

  let proforma: Proforma;

  try {
    proforma = await getProforma(proformaId);
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
          title="Detalle de proforma"
          back={
            <Link href="/proformas" className={ACTION_LINK_GHOST}>
              <ArrowLeft aria-hidden className="size-4" />
              Volver a proformas
            </Link>
          }
        />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  const canDelete = can(user, "proformas.eliminar");
  const acciones = accionesProforma(proforma, {
    canDelete,
    canCreate: can(user, "ordenes.crear"),
  });
  const tabParam = first(query.tab);
  const tab: TabKey = TAB_KEYS.includes(tabParam as TabKey)
    ? (tabParam as TabKey)
    : "resumen";
  const envioFallido = first(query.aviso) === "envio-fallido";
  const cliente = proforma.cliente;
  const estadoMeta = proformaEstadoMeta(proforma.estado);

  let operarios: User[] = [];

  if (acciones.has("crear_orden") && can(user, "usuarios.ver")) {
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

  return (
    <>
      <PageHeader
        wrap
        title={`Proforma ${proforma.numero}`}
        description={
          cliente
            ? `${cliente.nombre_razon} · Emitida el ${formatDateOnly(
                proforma.fecha_emision,
              )}`
            : `Emitida el ${formatDateOnly(proforma.fecha_emision)}`
        }
        back={
          <Link href="/proformas" className={ACTION_LINK_GHOST}>
            <ArrowLeft aria-hidden className="size-4" />
            Volver a proformas
          </Link>
        }
        actions={
          <>
            {cliente ? (
              <Link
                href={`/clientes/${proforma.cliente_id}`}
                className={ACTION_LINK}
              >
                <Building2 aria-hidden className="size-4" />
                Ver cliente
              </Link>
            ) : null}

            {proforma.orden_id ? (
              <Link
                href={`/ordenes/${proforma.orden_id}`}
                className={ACTION_LINK}
              >
                <ClipboardList aria-hidden className="size-4" />
                Ver orden
              </Link>
            ) : acciones.has("crear_orden") ? (
              <CrearOrdenDialog
                proformaId={proforma.id}
                proformaNumero={proforma.numero}
                operarios={operarios}
                autoOpen={first(query.crear_orden) === "1"}
              />
            ) : null}

            {acciones.has("pdf") ? (
              <a
                href={proformaPdfUrl(proforma.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={ACTION_LINK}
                aria-label={`Abrir PDF de la proforma ${proforma.numero} en una pestaña nueva`}
              >
                <FileDown aria-hidden className="size-4" />
                PDF
              </a>
            ) : null}

            {acciones.has("editar") ? (
              <Link
                href={`/proformas/${proforma.id}/editar`}
                className={ACTION_LINK}
              >
                <Pencil aria-hidden className="size-4" />
                Editar
              </Link>
            ) : null}

            <ProformaDetailActions
              proformaId={proforma.id}
              numero={proforma.numero}
              acciones={Array.from(acciones)}
              canDelete={canDelete}
            />
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ProformaEstadoChip estado={proforma.estado} />
        <span className="text-sm text-muted">{estadoMeta.description}</span>
      </div>

      {envioFallido ? (
        <Alert status="warning" className="mb-6">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>La proforma quedó guardada como borrador</Alert.Title>
            <Alert.Description>
              No pudimos enviarla. Revisa la conexión y vuelve a intentarlo
              desde las acciones del detalle.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {proforma.estado === "RECHAZADA" && proforma.motivo_rechazo ? (
        <Alert status="danger" className="mb-6">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Motivo del rechazo</Alert.Title>
            <Alert.Description>{proforma.motivo_rechazo}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <NavTabs
        label="Secciones de la proforma"
        current={tab}
        tabs={[
          {
            key: "resumen",
            label: "Resumen",
            href: `/proformas/${proforma.id}?tab=resumen`,
          },
          {
            key: "items",
            label: "Ítems",
            href: `/proformas/${proforma.id}?tab=items`,
            count: proforma.items?.length ?? proforma.items_count ?? 0,
          },
          {
            key: "historial",
            label: "Historial",
            href: `/proformas/${proforma.id}?tab=historial`,
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
                        href={`/clientes/${proforma.cliente_id}`}
                        className="font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        {cliente.nombre_razon}
                      </Link>
                    ) : (
                      <Link
                        href={`/clientes/${proforma.cliente_id}`}
                        className="font-medium text-accent-soft-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        Cliente #{proforma.cliente_id}
                      </Link>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">NIT / CI</dt>
                  <dd className="numeric mt-0.5 text-foreground">
                    {cliente?.nit_ci ?? "—"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Emisión</dt>
                  <dd className="numeric mt-0.5 text-foreground">
                    {formatDateOnly(proforma.fecha_emision)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Validez</dt>
                  <dd className="numeric mt-0.5 text-foreground">
                    {formatDateOnly(proforma.fecha_validez)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Moneda</dt>
                  <dd className="mt-0.5 text-foreground">
                    {proforma.moneda} · Bolivianos
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Origen</dt>
                  <dd className="mt-0.5 text-foreground">
                    {proforma.solicitud_id ? (
                      <span>
                        Desde solicitud #{proforma.solicitud_id}
                      </span>
                    ) : (
                      humanize(proforma.origen)
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Registrada</dt>
                  <dd className="numeric mt-0.5 text-foreground">
                    {formatDateTime(proforma.created_at)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Última actualización</dt>
                  <dd className="numeric mt-0.5 text-foreground">
                    {formatDateTime(proforma.updated_at)}
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
                {proforma.observaciones?.trim() || "Sin observaciones."}
              </p>
            </section>
          </div>

          <aside className="space-y-4">
            <TotalsSummary
              subtotal={proforma.subtotal}
              descuento={proforma.descuento}
              impuesto={proforma.impuesto}
              total={proforma.total}
              impuestoTasa={proforma.impuesto_tasa}
              footer={
                <p className="text-xs text-muted">
                  Totales calculados por el servidor al guardar la proforma.
                </p>
              }
            />

            <section
              aria-labelledby="estado-title"
              className="rounded-xl border border-border bg-surface p-4"
            >
              <h2
                id="estado-title"
                className="text-sm font-semibold text-foreground"
              >
                Seguimiento
              </h2>

              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Enviada</dt>
                  <dd className="numeric text-foreground">
                    {formatDateTime(proforma.enviada_at)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Aceptada</dt>
                  <dd className="numeric text-foreground">
                    {formatDateTime(proforma.aceptada_at)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Rechazada</dt>
                  <dd className="numeric text-foreground">
                    {formatDateTime(proforma.rechazada_at)}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      ) : null}

      {tab === "items" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Ítems</h2>
            <ProformaItemsTable proforma={proforma} />
          </div>

          <TotalsSummary
            subtotal={proforma.subtotal}
            descuento={proforma.descuento}
            impuesto={proforma.impuesto}
            total={proforma.total}
            impuestoTasa={proforma.impuesto_tasa}
            className="lg:sticky lg:top-20"
          />
        </div>
      ) : null}

      {tab === "historial" ? <ProformaHistory proforma={proforma} /> : null}
    </>
  );
}
