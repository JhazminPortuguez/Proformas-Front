import { Suspense } from "react";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/api/server";

/**
 * Guard autoritativo del backoffice. La lectura de cookies vive dentro de un
 * boundary de Suspense porque cacheComponents no permite datos de request en el
 * shell estático de un layout.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <ProtectedShell>{children}</ProtectedShell>
    </Suspense>
  );
}

async function ProtectedShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
