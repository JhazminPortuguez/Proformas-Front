import Link from "next/link";

export default function AppNotFound() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">
        Página no encontrada
      </h1>
      <p className="text-sm text-muted">
        La ruta que buscas no existe o fue movida de lugar.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex rounded bg-foreground px-4 py-2 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Volver al dashboard
      </Link>
    </section>
  );
}
