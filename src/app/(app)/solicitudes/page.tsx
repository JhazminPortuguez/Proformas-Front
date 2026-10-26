import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Solicitudes",
};

/**
 * Las solicitudes viven como pestaña dentro del flujo comercial de proformas.
 * Se conserva la ruta antigua para no romper enlaces guardados.
 */
export default function SolicitudesPage() {
  redirect("/proformas?tab=solicitudes");
}
