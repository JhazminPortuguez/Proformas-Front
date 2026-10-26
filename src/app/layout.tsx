import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AnnouncerProvider } from "@/components/ui/announcer";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Proformas",
    template: "%s · Proformas",
  },
  description: "Backoffice de clientes, servicios y proformas.",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" },
  ],
};

/**
 * Se ejecuta antes del primer paint para aplicar el tema guardado y evitar el
 * flash claro→oscuro. Es la única razón por la que el layout tiene un script
 * inline bloqueante.
 */
function themeScript(): string {
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} light`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
      </head>
      {/* suppressHydrationWarning: extensiones como ColorZilla agregan
          atributos al <body> antes de hidratar. Solo silencia ese elemento;
          los hijos siguen hidratando normalmente. */}
      <body
        className="min-h-dvh bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <AnnouncerProvider>{children}</AnnouncerProvider>
      </body>
    </html>
  );
}
