import { NotFoundState } from "@/components/ui/not-found-state";

export default function OrdenNotFound() {
  return (
    <NotFoundState
      title="Orden no encontrada"
      description="Puede que se haya eliminado o que el número no exista. Vuelve al listado para buscar otra orden."
      backHref="/ordenes"
      backLabel="Volver a órdenes"
    />
  );
}
