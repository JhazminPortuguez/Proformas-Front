import { ContentPageSkeleton } from "@/components/ui/feedback";

/**
 * Límite de carga de todo el portal: la página espera sus datos dentro de este
 * Suspense y el encabezado del portal se muestra de inmediato.
 */
export default function Loading() {
  return <ContentPageSkeleton />;
}
