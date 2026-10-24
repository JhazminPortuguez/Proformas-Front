"use client";

import { useState } from "react";
import { Menu as MenuIcon } from "lucide-react";
import { Button, Drawer } from "@heroui/react";
import type { User } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./breadcrumbs";
import { Brand, Sidebar, SidebarNav } from "./sidebar";
import { ThemeToggle, useSystemThemeSync } from "./theme-toggle";
import { UserMenu } from "./user-menu";

interface AppShellProps {
  user: User;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useSystemThemeSync();

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-overlay"
      >
        Saltar al contenido
      </a>

      <Sidebar
        rol={user.rol}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />

      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-300 ease-out",
          collapsed ? "lg:ps-[76px]" : "lg:ps-[260px]",
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Abrir menú de navegación"
            className="lg:hidden"
            onPress={() => setMobileOpen(true)}
          >
            <MenuIcon aria-hidden className="size-5" />
          </Button>

          <Breadcrumbs />

          <div className="ms-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>

        <footer className="border-t border-border px-4 py-4 text-xs text-muted sm:px-6 lg:px-8">
          Proformas · Gestión administrativa
        </footer>
      </div>

      <Drawer isOpen={mobileOpen} onOpenChange={setMobileOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="left">
            <Drawer.Dialog aria-label="Navegación principal">
              <Drawer.Header>
                <Brand />
                <Drawer.CloseTrigger aria-label="Cerrar menú" />
              </Drawer.Header>
              <Drawer.Body>
                <SidebarNav
                  rol={user.rol}
                  collapsed={false}
                  onNavigate={() => setMobileOpen(false)}
                />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-background" aria-busy="true">
      <div className="hidden w-[260px] shrink-0 border-e border-border bg-surface lg:block">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
          <div className="size-9 animate-pulse rounded-xl bg-default" />
          <div className="h-3 w-24 animate-pulse rounded bg-default" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-8 animate-pulse rounded-lg bg-default/60"
            />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
          <div className="h-3 w-32 animate-pulse rounded bg-default" />
          <div className="ms-auto size-8 animate-pulse rounded-full bg-default" />
        </div>
        <div className="space-y-4 p-4 sm:p-6 lg:p-8">
          <div className="h-7 w-56 animate-pulse rounded bg-default" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl bg-surface"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-surface" />
        </div>
      </div>
      <span className="sr-only">Cargando el backoffice…</span>
    </div>
  );
}
