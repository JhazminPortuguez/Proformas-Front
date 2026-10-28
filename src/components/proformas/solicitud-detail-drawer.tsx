"use client";

import Link from "next/link";
import { Button, Drawer } from "@heroui/react";
import { SolicitudEstadoChip } from "@/components/ui/status-chip";
import type { Solicitud } from "@/lib/api/types";
import { formatDateOnly, formatNumber } from "@/lib/utils";

interface SolicitudDetailDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  solicitud: Solicitud | null;
}

export function SolicitudDetailDrawer({
  isOpen,
  onOpenChange,
  solicitud,
}: SolicitudDetailDrawerProps) {
  const title = solicitud
    ? `Solicitud ${solicitud.numero ?? `#${solicitud.id}`}`
    : "Solicitud";

  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Trigger className="hidden" aria-hidden="true">
        Abrir detalle
      </Drawer.Trigger>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog
            aria-label={title}
            style={{ width: "min(34rem, 100vw)" }}
          >
            <Drawer.Header className="pe-8">
              <div className="flex flex-wrap items-center gap-2">
                <Drawer.Heading>{title}</Drawer.Heading>
                {solicitud ? (
                  <SolicitudEstadoChip estado={solicitud.estado} />
                ) : null}
              </div>
              <p className="text-sm text-muted">
                {solicitud?.cliente?.nombre_razon ?? "Sin cliente asociado"}
              </p>
              <Drawer.CloseTrigger
                aria-label="Cerrar detalle de la solicitud"
                className="text-muted"
              />
            </Drawer.Header>

            <Drawer.Body className="mt-4 space-y-5 text-sm">
              {solicitud ? (
                <>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-xs text-muted">Fecha</dt>
                      <dd className="numeric text-foreground">
                        {formatDateOnly(solicitud.fecha ?? solicitud.created_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Ítems</dt>
                      <dd className="numeric text-foreground">
                        {formatNumber(solicitud.items?.length ?? 0)}
                      </dd>
                    </div>
                  </dl>

                  <section aria-labelledby="solicitud-descripcion-title">
                    <h2
                      id="solicitud-descripcion-title"
                      className="text-xs font-semibold uppercase tracking-wide text-muted"
                    >
                      Descripción
                    </h2>
                    <p className="mt-1 whitespace-pre-line text-foreground">
                      {solicitud.descripcion}
                    </p>
                  </section>

                  <section aria-labelledby="solicitud-items-title">
                    <h2
                      id="solicitud-items-title"
                      className="text-xs font-semibold uppercase tracking-wide text-muted"
                    >
                      Ítems solicitados
                    </h2>

                    {solicitud.items?.length ? (
                      <ul className="mt-2 divide-y divide-separator rounded-lg border border-border">
                        {solicitud.items.map((item, index) => (
                          <li
                            key={item.id ?? index}
                            className="px-3 py-2.5"
                          >
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="min-w-0 text-foreground">
                                {item.descripcion}
                              </p>
                              <p className="numeric shrink-0 text-sm text-muted">
                                {formatNumber(item.cantidad)}{" "}
                                {item.unidad_medida ?? ""}
                              </p>
                            </div>
                            {item.observaciones ? (
                              <p className="mt-1 text-xs text-muted">
                                {item.observaciones}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted">
                        La solicitud no tiene ítems detallados.
                      </p>
                    )}
                  </section>

                  {solicitud.convertida_proforma_id ? (
                    <p className="rounded-lg border border-border bg-surface-secondary px-3 py-2">
                      Ya tiene una proforma asociada.{" "}
                      <Link
                        href={`/proformas/${solicitud.convertida_proforma_id}`}
                        className="font-medium text-accent-soft-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        Ver proforma
                      </Link>
                    </p>
                  ) : null}
                </>
              ) : null}
            </Drawer.Body>

            <Drawer.Footer className="mt-5 border-t border-border pt-4">
              <Button variant="tertiary" onPress={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
