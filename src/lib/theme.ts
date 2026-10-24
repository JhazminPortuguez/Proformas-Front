export const THEME_STORAGE_KEY = "proformas-theme";

export type Theme = "light" | "dark";

export function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function storedTheme(): Theme | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);

    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;

  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

const THEME_CHANGE_EVENT = "proformas:theme-change";

export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);

  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

/** Tema aplicado en el DOM (fuente de verdad después del script anti-flash). */
export function getThemeSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** En el servidor el HTML base siempre es claro. */
export function getServerThemeSnapshot(): Theme {
  return "light";
}

export function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Modo privado o almacenamiento bloqueado: el tema solo dura la sesión.
  }
}
