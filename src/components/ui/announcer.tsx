"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface AnnouncerContextValue {
  announce: (message: string) => void;
}

const NOOP_ANNOUNCER: AnnouncerContextValue = { announce: () => {} };

const AnnouncerContext = createContext<AnnouncerContextValue>(NOOP_ANNOUNCER);

/**
 * Región viva global. Vive una sola vez en el árbol para que guardados,
 * paginación y navegación no creen varios `aria-live` compitiendo entre sí.
 */
export function useAnnouncer(): AnnouncerContextValue {
  return useContext(AnnouncerContext);
}

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((next: string) => {
    const clean = next.trim();

    if (!clean) return;

    if (timer.current) clearTimeout(timer.current);

    // Vaciar primero permite volver a anunciar el mismo texto dos veces.
    setMessage("");
    timer.current = setTimeout(() => setMessage(clean), 50);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}
