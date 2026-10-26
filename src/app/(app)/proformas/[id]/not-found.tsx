import { NotFoundState } from "@/components/ui/not-found-state";

export default function ProformaNotFound() {
  return (
    <NotFoundState
      title="Proforma no encontrada"
      description="Puede que se haya eliminado o que el número no exista. Vuelve al listado para buscar otra proforma."
    />
  );
}
