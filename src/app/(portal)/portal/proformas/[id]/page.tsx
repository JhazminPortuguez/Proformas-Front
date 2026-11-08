import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ErrorState } from "@/components/ui/feedback";
import { NotFoundState } from "@/components/ui/not-found-state";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { ProformaEstadoChip } from "@/components/ui/status-chip";
import { ContactoEmpresa } from "@/components/portal/contacto-empresa";
import { PdfLink, Validez } from "@/components/portal/portal-proformas-table";
import { getPortalEmpresa, getPortalProforma, requireCliente } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import { formatDateNumeric, formatMoney, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Proforma",
};

const VOLVER =
  "inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export default async function PortalProformaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCliente();
  const { id } = await params;
  const proformaId = Number.parseInt(id, 10);

  if (!Number.isFinite(proformaId) || proformaId <= 0) notFound();

  const volver = (
    <Link href="/portal/proformas" className={VOLVER}>
      <ArrowLeft aria-hidden className="size-4" />
      Volver a mis proformas
    </Link>
  );

  let datos;

  try {
    datos = await Promise.all([getPortalProforma(proformaId), getPortalEmpresa()]);
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader title="Proforma" back={volver} />
        <ErrorState message={apiErrorMessage(error)} action={<RetryButton />} />
      </>
    );
  }

  const [proforma, empresa] = datos;

  if (!proforma) {
    return (
      <>
        <PageHeader title="Proforma" back={volver} />
        <NotFoundState
          title="No encontramos esta proforma"
          description="Puede que no exista o que no sea tuya."
          backHref="/portal/proformas"
          backLabel="Volver a mis proformas"
        />
      </>
    );
  }

  const moneda = proforma.moneda;
  const items = proforma.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Proforma ${proforma.numero}`}
        back={volver}
        actions={<PdfLink proforma={proforma} />}
      />

      <section
        aria-label="Datos de la proforma"
        className="grid gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-4"
      >
        <div>
          <p className="text-xs text-muted">Estado</p>
          <div className="mt-1">
            <ProformaEstadoChip estado={proforma.estado} />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted">Emisión</p>
          <p className="numeric mt-1 text-sm text-foreground">
            {formatDateNumeric(proforma.fecha_emision)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Validez</p>
          <div className="mt-1 text-sm text-foreground">
            <Validez proforma={proforma} />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted">Total</p>
          <p className="numeric mt-1 text-lg font-semibold text-foreground">
            {formatMoney(proforma.total, moneda)}
          </p>
        </div>
      </section>

      {proforma.estado === "ENVIADA" ? <ContactoEmpresa empresa={empresa} /> : null}

      <section aria-labelledby="items-titulo" className="space-y-3">
        <h2 id="items-titulo" className="text-sm font-semibold text-foreground">
          Ítems
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-surface-secondary text-left text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Descripción</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Cantidad</th>
                <th scope="col" className="px-4 py-2 font-medium">Unidad</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Precio unitario</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Importe</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <th scope="row" className="px-4 py-3 text-left font-normal text-foreground">
                    <span className="font-medium">{item.nombre ?? item.descripcion}</span>
                    {item.nombre && item.descripcion ? (
                      <span className="block text-xs text-muted">{item.descripcion}</span>
                    ) : null}
                  </th>
                  <td className="numeric px-4 py-3 text-right">{formatNumber(item.cantidad)}</td>
                  <td className="px-4 py-3 text-muted">{item.unidad_medida ?? "—"}</td>
                  <td className="numeric whitespace-nowrap px-4 py-3 text-right">
                    {formatMoney(item.precio_unitario, moneda)}
                  </td>
                  <td className="numeric whitespace-nowrap px-4 py-3 text-right">
                    {formatMoney(item.total_linea, moneda)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ms-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm">
          <dt className="text-muted">Subtotal</dt>
          <dd className="numeric text-right">{formatMoney(proforma.subtotal ?? 0, moneda)}</dd>
          {proforma.descuento ? (
            <>
              <dt className="text-muted">Descuento</dt>
              <dd className="numeric text-right">− {formatMoney(proforma.descuento, moneda)}</dd>
            </>
          ) : null}
          {proforma.impuesto ? (
            <>
              <dt className="text-muted">Impuesto ({formatNumber(proforma.impuesto_tasa ?? 0)} %)</dt>
              <dd className="numeric text-right">{formatMoney(proforma.impuesto, moneda)}</dd>
            </>
          ) : null}
          <dt className="border-t border-border pt-1 font-semibold text-foreground">Total</dt>
          <dd className="numeric border-t border-border pt-1 text-right font-semibold text-foreground">
            {formatMoney(proforma.total, moneda)}
          </dd>
        </dl>
      </section>

      {proforma.observaciones?.trim() ? (
        <section aria-labelledby="obs-titulo" className="space-y-2">
          <h2 id="obs-titulo" className="text-sm font-semibold text-foreground">
            Observaciones
          </h2>
          <p className="whitespace-pre-line rounded-xl border border-border bg-surface p-4 text-sm text-foreground">
            {proforma.observaciones}
          </p>
        </section>
      ) : null}
    </div>
  );
}
