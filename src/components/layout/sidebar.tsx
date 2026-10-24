"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileStack, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import { cn } from "@/lib/utils";
import type { Rol } from "@/lib/api/types";
import { isActivePath, navItemsFor } from "./nav";

interface SidebarNavProps {
  rol: Rol;
  collapsed: boolean;
  onNavigate?: () => void;
}

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
        <FileStack aria-hidden className="size-5" />
      </span>
      <span
        className={cn(
          "flex min-w-0 flex-col leading-tight",
          collapsed && "sr-only",
        )}
      >
        <span className="truncate text-sm font-semibold text-foreground">
          Proformas
        </span>
        <span className="truncate text-[11px] text-muted">Backoffice</span>
      </span>
    </Link>
  );
}

export function SidebarNav({ rol, collapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const groups = navItemsFor(rol);

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-5">
      {groups.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-1">
          {group.label ? (
            <p
              className={cn(
                "px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted",
                collapsed && "sr-only",
              )}
            >
              {group.label}
            </p>
          ) : null}

          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                      active
                        ? "bg-accent-soft text-accent-soft-foreground"
                        : "text-muted hover:bg-surface-secondary hover:text-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <item.icon
                      aria-hidden
                      className={cn(
                        "size-[18px] shrink-0",
                        active ? "text-foreground" : "text-muted group-hover:text-foreground",
                      )}
                    />
                    <span className={cn("truncate", collapsed && "sr-only")}>
                      {item.label}
                    </span>

                    {!item.ready && !collapsed ? (
                      <Chip
                        size="sm"
                        variant="soft"
                        className="ms-auto"
                        aria-label="Módulo próximamente"
                      >
                        <Chip.Label>Pronto</Chip.Label>
                      </Chip>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

interface SidebarProps {
  rol: Rol;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ rol, collapsed, onToggleCollapsed }: SidebarProps) {
  return (
    <aside
      aria-label="Barra lateral"
      className={cn(
        "fixed inset-y-0 start-0 z-30 hidden flex-col border-e border-border bg-surface lg:flex",
        "transition-[width] duration-300 ease-out",
        collapsed ? "w-[76px]" : "w-[260px]",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center gap-2 border-b border-border px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <Brand collapsed={collapsed} />
        {!collapsed ? (
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className="ms-auto"
            aria-label="Contraer barra lateral"
            onPress={onToggleCollapsed}
          >
            <PanelLeftClose aria-hidden className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="scrollbar flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav rol={rol} collapsed={collapsed} />
      </div>

      {collapsed ? (
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            fullWidth
            aria-label="Expandir barra lateral"
            onPress={onToggleCollapsed}
          >
            <PanelLeftOpen aria-hidden className="size-4" />
          </Button>
        </div>
      ) : (
        <p className="border-t border-border px-4 py-3 text-[11px] text-muted">
          Clientes · Servicios · Usuarios
        </p>
      )}
    </aside>
  );
}
