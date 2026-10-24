import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Sparkles,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { Card, Chip } from "@heroui/react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { StatusChip } from "@/components/ui/status-chip";
import { getDashboard, requireUser } from "@/lib/api/server";
import { errorMessage, isApiError } from "@/lib/api/types";
import type { ActividadReciente, DashboardData } from "@/lib/api/types";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

const PROXIMOS: { label: string; href: string; detalle: string }[] = [
  {
    label: "Proformas",
    href: "/proformas",
    detalle: "Creación, envío y seguimiento por estado.",
  },
  {
    label: "Órdenes",
    href: "/ordenes",
    detalle: "Ejecución de servicios vendidos.",
  },
  {
    label: "Cuentas por cobrar",
    href: "/cobros",
    detalle: "Saldos, vencimientos y pagos.",
  },
  {
    label: "Reportes",
    href: "/reportes",
    detalle: "Indicadores comerciales y de operación.",
  },
];

export default async function DashboardPage() {
  const user = await requireUser();

  let data: DashboardData;

  try {
    data = await getDashboard();
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState
          message={errorMessage(error)}
          action={<RetryButton />}
        />
      </>
    );
  }

  const estados = Object.entries(data.proformas_por_estado ?? {});

  return (
    <>
      <PageHeader
        title={`Hola, ${user.name.split(" ")[0]}`}
        description="Este es el resumen de la operación. Los módulos marcados como próximos se habilitarán en las siguientes etapas."
      />

      <section aria-labelledby="kpis-title" className="space-y-3">
        <h2 id="kpis-title" className="sr-only">
          Indicadores principales
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Clientes"
            value={formatNumber(data.clientes)}
            hint="Registrados en el sistema"
            icon={<Users aria-hidden className="size-4" />}
            href="/clientes"
          />
          <KpiCard
            label="Servicios"
            value={formatNumber(data.servicios)}
            hint="En el catálogo interno"
            icon={<Wrench aria-hidden className="size-4" />}
            href="/servicios"
          />
          <KpiCard
            label="Proformas"
            value={formatNumber(data.proformas)}
            hint="Totales emitidas"
            icon={<FileText aria-hidden className="size-4" />}
          />
          <KpiCard
            label="Monto del mes"
            value={formatMoney(data.monto_proformas_mes)}
            hint="Suma de proformas del mes en curso"
            icon={<Wallet aria-hidden className="size-4" />}
            accent
          />
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Header className="flex-row items-center justify-between gap-3">
            <div>
              <Card.Title>Actividad reciente</Card.Title>
              <Card.Description>
                Últimos movimientos registrados por el equipo.
              </Card.Description>
            </div>
            <Chip size="sm" variant="soft" color="default">
              <Chip.Label>{formatNumber(data.actividad_reciente?.length ?? 0)}</Chip.Label>
            </Chip>
          </Card.Header>

          <Card.Content className="mt-2">
            {data.actividad_reciente?.length ? (
              <ul className="divide-y divide-separator">
                {data.actividad_reciente.map((item, index) => (
                  <li
                    key={`${item.tipo ?? "actividad"}-${item.id ?? index}`}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-soft-foreground">
                      <Sparkles aria-hidden className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {describeActivity(item)}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDateTime(item.created_at ?? item.fecha)}
                        {item.usuario ? ` · ${item.usuario}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                Todavía no hay movimientos registrados.
              </p>
            )}
          </Card.Content>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <Card.Header>
              <Card.Title>Proformas por estado</Card.Title>
              <Card.Description>Distribución actual del pipeline.</Card.Description>
            </Card.Header>

            <Card.Content className="mt-2">
              {data.proformas > 0 ? (
                <ul className="flex flex-col gap-2">
                  {estados.map(([estado, cantidad]) => (
                    <li
                      key={estado}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <StatusChip tone={tonePorEstado(estado)}>
                        {humanize(estado)}
                      </StatusChip>
                      <span className="numeric font-medium text-foreground">
                        {formatNumber(cantidad)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  Aún no hay proformas registradas.
                </p>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Módulos próximos</Card.Title>
              <Card.Description>
                Ya están en el menú como referencia; se habilitan en las próximas etapas.
              </Card.Description>
            </Card.Header>

            <Card.Content className="mt-2">
              <ul className="flex flex-col gap-1">
                {PROXIMOS.map((modulo) => (
                  <li key={modulo.href}>
                    <Link
                      href={modulo.href}
                      className="group flex items-start gap-2 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {modulo.label}
                        </p>
                        <p className="text-xs text-muted">{modulo.detalle}</p>
                      </div>
                      <ArrowRight
                        aria-hidden
                        className="mt-1 size-3.5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="flex-row items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-warning-soft text-warning-soft-foreground">
                <AlertTriangle aria-hidden className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Pendientes de integración
                </p>
                <p className="text-xs text-muted">
                  Órdenes pendientes y saldo por cobrar aparecerán cuando el
                  backend exponga esos módulos.
                </p>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  href?: string;
  accent?: boolean;
}

function KpiCard({ label, value, hint, icon, href, accent }: KpiCardProps) {
  const content = (
    <Card className="h-full" variant={accent ? "secondary" : "default"}>
      <Card.Content className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </p>
          <span className="grid size-7 place-items-center rounded-lg bg-surface-secondary text-muted">
            {icon}
          </span>
        </div>
        <p className="numeric text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted">{hint}</p>
      </Card.Content>
    </Card>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {content}
    </Link>
  );
}

function describeActivity(item: ActividadReciente): string {
  return (
    item.descripcion ??
    item.mensaje ??
    item.titulo ??
    humanize(item.tipo ?? "Actividad registrada")
  );
}

function humanize(value: string): string {
  const clean = value.toLowerCase().replaceAll("_", " ");

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function tonePorEstado(
  estado: string,
): "neutral" | "accent" | "success" | "warning" | "danger" {
  switch (estado.toLowerCase()) {
    case "aceptada":
    case "aprobada":
    case "pagada":
    case "facturada":
      return "success";
    case "enviada":
    case "negociacion":
      return "accent";
    case "vencida":
    case "rechazada":
      return "danger";
    case "borrador":
    case "pendiente":
      return "warning";
    default:
      return "neutral";
  }
}
