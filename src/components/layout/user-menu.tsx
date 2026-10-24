"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleUser, LogOut } from "lucide-react";
import { Alert, Avatar, Chip, Dropdown } from "@heroui/react";
import { auth } from "@/lib/api/client";
import { isApiError } from "@/lib/api/types";
import type { Rol, User } from "@/lib/api/types";
import { ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

const ROLE_COLOR: Record<Rol, "accent" | "default" | "success"> = {
  admin: "accent",
  operario: "default",
  cliente: "success",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAction(key: string) {
    if (key === "cuenta") {
      router.push("/configuracion");

      return;
    }

    if (key !== "salir") return;

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
    <>
      <Dropdown>
        <Dropdown.Trigger
          aria-label={`Menú de ${user.name}`}
          isDisabled={pending}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-full p-1 pe-2 transition-colors duration-200",
            "hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          )}
        >
          <Avatar size="sm" color={ROLE_COLOR[user.rol]}>
            <Avatar.Fallback className="text-xs font-semibold">
              {initials(user.name)}
            </Avatar.Fallback>
          </Avatar>

          <span className="hidden max-w-[9rem] truncate text-sm font-medium text-foreground sm:inline">
            {user.name}
          </span>

          <Chip
            size="sm"
            variant="soft"
            color={ROLE_COLOR[user.rol]}
            className="hidden md:inline-flex"
          >
            <Chip.Label>{ROLE_LABELS[user.rol]}</Chip.Label>
          </Chip>
        </Dropdown.Trigger>

        <Dropdown.Popover placement="bottom end">
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>

          <Dropdown.Menu
            aria-label="Cuenta"
            onAction={(key) => {
              void onAction(String(key));
            }}
          >
            <Dropdown.Item id="cuenta" textValue="Cuenta">
              <CircleUser aria-hidden className="size-4" />
              Cuenta
            </Dropdown.Item>
            <Dropdown.Item
              id="salir"
              textValue="Cerrar sesión"
              variant="danger"
            >
              <LogOut aria-hidden className="size-4" />
              {pending ? "Cerrando sesión…" : "Cerrar sesión"}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      {error ? (
        <div className="fixed bottom-4 end-4 z-50 w-[min(20rem,calc(100vw-2rem))]">
          <Alert status="danger" role="alert">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Sesión sin cerrar</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      ) : null}
    </>
  );
}
