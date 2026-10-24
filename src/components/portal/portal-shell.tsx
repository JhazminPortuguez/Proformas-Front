"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileStack, LogOut } from "lucide-react";
import { Alert, Avatar, Button, Chip } from "@heroui/react";
import type { User } from "@/lib/api/types";
import { isApiError } from "@/lib/api/types";
import { auth } from "@/lib/api/client";
import { ThemeToggle, useSystemThemeSync } from "@/components/layout/theme-toggle";

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function PortalShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSystemThemeSync();

  async function onLogout() {
    setError(null);
    setPending(true);

    try {
      await auth.logout();
      router.replace("/login");
      router.refresh();
    } catch (caught) {
      if (isApiError(caught) && (caught.status === 401 || caught.status === 419)) {
        router.replace("/login");
        router.refresh();

        return;
      }

      setError("No pudimos cerrar la sesión. Intenta nuevamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#portal-contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-overlay"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/portal"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
              <FileStack aria-hidden className="size-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">
                Proformas
              </span>
              <span className="text-[11px] text-muted">Mi portal</span>
            </span>
          </Link>

          <div className="ms-auto flex items-center gap-2">
            <ThemeToggle />

            <div className="hidden items-center gap-2 sm:flex">
              <Avatar size="sm" color="success">
                <Avatar.Fallback className="text-xs font-semibold">
                  {initials(user.name)}
                </Avatar.Fallback>
              </Avatar>
              <span className="max-w-[10rem] truncate text-sm font-medium text-foreground">
                {user.name}
              </span>
              <Chip size="sm" variant="soft" color="success">
                <Chip.Label>Cliente</Chip.Label>
              </Chip>
            </div>

            <Button
              variant="secondary"
              size="sm"
              isDisabled={pending}
              onPress={onLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut aria-hidden className="size-4" />
              <span className="hidden sm:inline">
                {pending ? "Saliendo…" : "Salir"}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main
        id="portal-contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 focus:outline-none sm:px-6"
      >
        {error ? (
          <Alert status="danger" className="mb-6" role="alert">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {children}
      </main>

      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted sm:px-6">
        Proformas · Portal del cliente
      </footer>
    </div>
  );
}

export function PortalSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-background" aria-busy="true">
      <div className="flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
        <div className="size-9 animate-pulse rounded-xl bg-default" />
        <div className="h-3 w-28 animate-pulse rounded bg-default" />
      </div>
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded bg-default" />
        <div className="h-40 animate-pulse rounded-xl bg-surface" />
        <div className="h-32 animate-pulse rounded-xl bg-surface" />
      </div>
      <span className="sr-only">Cargando tu portal…</span>
    </div>
  );
}
