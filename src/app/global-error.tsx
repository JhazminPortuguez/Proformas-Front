"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          fontFamily: "system-ui, sans-serif",
          background: "#f7f7f8",
          color: "#1b1b1f",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Algo salió mal
        </h1>
        <p>La aplicación no pudo cargar. Intenta nuevamente.</p>
        <button
          type="button"
          onClick={reset}
          style={{
            width: "fit-content",
            cursor: "pointer",
            borderRadius: "0.375rem",
            border: "1px solid #0b5359",
            padding: "0.5rem 1rem",
            background: "#0b5359",
            color: "#ffffff",
            fontWeight: 500,
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
