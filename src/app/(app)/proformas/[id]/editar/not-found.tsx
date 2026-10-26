import { NotFoundState } from "@/components/ui/not-found-state";

export default function EditarProformaNotFound() {
  return (
    <NotFoundState
      title="No encontramos esta proforma para editar"
      description="Solo las proformas existentes en borrador se pueden editar. Vuelve al listado para elegir una."
    />
  );
}
