import { NotFoundState } from "@/components/ui/not-found-state";

export default function InventarioNotFound() {
  return (
    <NotFoundState
      title="No encontramos esta pantalla de inventario"
      description="El enlace puede haber cambiado o la sección ya no existe. Vuelve al dashboard para continuar."
      backHref="/dashboard"
      backLabel="Volver al dashboard"
    />
  );
}
