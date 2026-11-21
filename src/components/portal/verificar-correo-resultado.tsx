import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { ReenviarEnlace } from "@/components/portal/reenviar-enlace";

export type EstadoVerificacion = "verificado" | "ya-verificado" | "vencido" | "invalido";

const TEXTOS: Record<EstadoVerificacion, { titulo: string; texto: string; ok: boolean }> = {
  verificado: {
    titulo: "Tu correo fue verificado",
    texto: "Listo. Ya puedes enviar solicitudes de cotización y aceptar o rechazar tus proformas.",
    ok: true,
  },
  "ya-verificado": {
    titulo: "Tu correo ya estaba verificado",
    texto: "No hace falta hacer nada más. Puedes seguir usando tu portal.",
    ok: true,
  },
  vencido: {
    titulo: "El enlace venció",
    texto:
      "Por seguridad, el enlace dura 60 minutos. Pide uno nuevo y ábrelo desde el último correo que te llegue.",
    ok: false,
  },
  invalido: {
    titulo: "El enlace no es válido",
    texto:
      "Puede que esté incompleto (algunos programas de correo cortan los enlaces largos) o que sea de un correo anterior. Pide uno nuevo.",
    ok: false,
  },
};

const BOTON =
  "inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors duration-200 hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/** Lee `?estado=`; un valor desconocido o ausente es un enlace no válido. */
export function estadoVerificacion(valor: string | string[] | undefined): EstadoVerificacion {
  const texto = Array.isArray(valor) ? valor[0] : valor;

  return texto && Object.hasOwn(TEXTOS, texto) ? (texto as EstadoVerificacion) : "invalido";
}

/** Resultado de abrir el enlace de verificación (ronda A, parte 3). */
export function VerificarCorreoResultado({ estado }: { estado: EstadoVerificacion }) {
  const { titulo, texto, ok } = TEXTOS[estado];
  const Icono = ok ? CircleCheck : CircleAlert;

  return (
    <div className="flex flex-col gap-5">
      <span
        aria-hidden
        className={
          ok
            ? "grid size-12 place-items-center rounded-full bg-success-soft text-success-soft-foreground"
            : "grid size-12 place-items-center rounded-full bg-warning-soft text-warning-soft-foreground"
        }
      >
        <Icono className="size-6" />
      </span>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{titulo}</h1>
        <p className="text-sm text-muted">{texto}</p>
      </div>

      {ok ? (
        <Link href="/portal" className={BOTON}>
          Ir a mi portal
        </Link>
      ) : (
        <ReenviarEnlace volverA="/portal" />
      )}
    </div>
  );
}
