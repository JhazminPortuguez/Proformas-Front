import { Suspense } from "react";
import { PortalShell, PortalSkeleton } from "@/components/portal/portal-shell";
import { requireCliente } from "@/lib/api/server";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PortalSkeleton />}>
      <ProtectedPortal>{children}</ProtectedPortal>
    </Suspense>
  );
}

async function ProtectedPortal({ children }: { children: React.ReactNode }) {
  const user = await requireCliente();

  return <PortalShell user={user}>{children}</PortalShell>;
}
