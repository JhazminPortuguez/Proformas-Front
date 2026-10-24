"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@heroui/react";
import {
  applyTheme,
  getServerThemeSnapshot,
  getThemeSnapshot,
  persistTheme,
  storedTheme,
  subscribeTheme,
  systemTheme,
  type Theme,
} from "@/lib/theme";

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";

    applyTheme(next);
    persistTheme(next);
  }

  const label = theme === "dark" ? "Usar tema claro" : "Usar tema oscuro";

  return (
    <Button
      variant="ghost"
      size="sm"
      isIconOnly
      aria-label={label}
      onPress={toggle}
      className="text-muted hover:text-foreground"
    >
      {theme === "dark" ? (
        <Sun aria-hidden className="size-4" />
      ) : (
        <Moon aria-hidden className="size-4" />
      )}
    </Button>
  );
}

/**
 * Sigue los cambios del sistema operativo mientras el usuario no haya elegido
 * un tema explícito. No guarda estado en React: solo aplica el tema al DOM.
 */
export function useSystemThemeSync(): void {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function onChange() {
      if (storedTheme()) return;

      applyTheme(systemTheme());
    }

    media.addEventListener("change", onChange);

    return () => media.removeEventListener("change", onChange);
  }, []);
}
