import { NotFoundState } from "@/components/ui/not-found-state";

export default function ProformasNotFound() {
  return (
    <NotFoundState
      title="No encontramos esta pantalla de proformas"
      description="El enlace puede haber cambiado o la sección ya no existe. Vuelve al listado para continuar."
    />
  );
}
