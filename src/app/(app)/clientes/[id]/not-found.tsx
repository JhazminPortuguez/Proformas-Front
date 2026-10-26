import { NotFoundState } from "@/components/ui/not-found-state";

export default function ClienteNotFound() {
  return (
    <NotFoundState
      title="Cliente no encontrado"
      description="Puede que se haya eliminado o que el identificador no exista. Vuelve al directorio para buscar otro cliente."
      backHref="/clientes"
      backLabel="Volver a clientes"
    />
  );
}
