import type { ReactNode } from "react";
import { FileStack } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-accent p-10 text-accent-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:22px_22px]"
        />

        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-foreground/15">
            <FileStack aria-hidden className="size-5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Proformas</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            Cotiza, atiende y cobra sin salir del mismo lugar.
          </p>
          <p className="mt-4 text-sm leading-relaxed opacity-85">
            Clientes, servicios, proformas y cuentas por cobrar en un backoffice
            pensado para el día a día de tu equipo.
          </p>

          <ul className="mt-8 flex flex-col gap-2 text-sm opacity-90">
            <li>· Clientes y servicios siempre al día</li>
            <li>· Proformas con seguimiento por estado</li>
            <li>· Roles separados para administración y operación</li>
          </ul>
        </div>

        <p className="relative text-xs opacity-85">
          Clientes · Servicios · Usuarios
        </p>
      </aside>

      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
