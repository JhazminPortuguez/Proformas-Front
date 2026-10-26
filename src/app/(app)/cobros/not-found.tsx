import { NotFoundState } from "@/components/ui/not-found-state";

export default function CobrosNotFound() {
  return (
    <NotFoundState
      title="Sección de cobros no disponible"
      description="No encontramos la cuenta que buscabas. Revisa el listado de cuentas por cobrar."
      backHref="/cobros"
      backLabel="Volver a cobros"
    />
  );
}
