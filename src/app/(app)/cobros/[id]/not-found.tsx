import { NotFoundState } from "@/components/ui/not-found-state";

export default function CobroNotFound() {
  return (
    <NotFoundState
      title="Cuenta por cobrar no encontrada"
      description="Puede que se haya eliminado o que el identificador no exista. Vuelve al listado para buscar otra cuenta."
      backHref="/cobros"
      backLabel="Volver a cobros"
    />
  );
}
