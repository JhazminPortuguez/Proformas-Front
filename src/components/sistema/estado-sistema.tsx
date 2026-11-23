import { CheckCircle2, CircleAlert } from "lucide-react";
import { CorreoPrueba } from "@/components/sistema/correo-prueba";
import type { EstadoSistema } from "@/lib/api/types";

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-b border-border py-2 last:border-b-0">
      <dt className="text-sm text-muted">{etiqueta}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const id = `sistema-${titulo.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-5"
    >
      <h2 id={id} className="text-base font-semibold text-foreground">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Estado({ ok, texto }: { ok: boolean; texto: string }) {
  const Icono = ok ? CheckCircle2 : CircleAlert;

  return (
    <p
      className={`flex items-center gap-1.5 text-sm font-medium ${
        ok ? "text-success-soft-foreground" : "text-warning-soft-foreground"
      }`}
    >
      <Icono aria-hidden className="size-4" />
      {texto}
    </p>
  );
}

const SIN_DATO = "—";

/**
 * Ronda B, parte 1: estado del sistema para el superusuario. La contraseña del
 * correo nunca llega al front: solo si está puesta o no.
 */
export function EstadoSistemaView({ estado, email }: { estado: EstadoSistema; email: string }) {
  const { app, migraciones, correo } = estado;

  const textoCorreo = correo.configurado
    ? "El correo está configurado"
    : !correo.envia_correos_reales
      ? `Los correos no salen: el mailer es «${correo.mailer}» (quedan en el log)`
      : `Falta configurar: ${correo.faltan.join(", ")}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Tarjeta titulo="Aplicación">
        {app.debug ? (
          <Estado
            ok={false}
            texto="El modo depuración está activo (APP_DEBUG=true). En producción apágalo: los errores mostrarían detalles técnicos."
          />
        ) : null}
        <dl>
          <Fila etiqueta="Versión">{app.version}</Fila>
          <Fila etiqueta="Entorno">{app.entorno}</Fila>
          <Fila etiqueta="Modo depuración">{app.debug ? "Activo" : "Apagado"}</Fila>
          <Fila etiqueta="Laravel">{app.laravel}</Fila>
          <Fila etiqueta="PHP">{app.php}</Fila>
        </dl>
      </Tarjeta>

      <Tarjeta titulo="Base de datos">
        <Estado
          ok={migraciones.pendientes === 0}
          texto={
            migraciones.pendientes === 0
              ? "Todas las migraciones están aplicadas"
              : `${migraciones.pendientes} ${migraciones.pendientes === 1 ? "migración pendiente" : "migraciones pendientes"}: ejecuta php artisan migrate`
          }
        />
        <dl>
          <Fila etiqueta="Migraciones aplicadas">{migraciones.aplicadas}</Fila>
          <Fila etiqueta="Última">
            <span className="font-mono text-xs">{migraciones.ultima ?? SIN_DATO}</span>
          </Fila>
        </dl>
      </Tarjeta>

      <Tarjeta titulo="Correo">
        <Estado ok={correo.configurado} texto={textoCorreo} />
        <dl>
          <Fila etiqueta="Mailer">{correo.mailer}</Fila>
          {correo.mailer === "smtp" ? (
            <>
              <Fila etiqueta="Servidor">{correo.host ?? SIN_DATO}</Fila>
              <Fila etiqueta="Puerto">{correo.puerto ?? SIN_DATO}</Fila>
              <Fila etiqueta="Seguridad">{correo.seguridad ?? "Automática (STARTTLS si el servidor la ofrece)"}</Fila>
              <Fila etiqueta="Usuario">{correo.usuario ?? SIN_DATO}</Fila>
              <Fila etiqueta="Contraseña">{correo.password_configurada ? "Configurada (no se muestra)" : "Falta"}</Fila>
            </>
          ) : null}
          <Fila etiqueta="Remitente">
            {correo.remitente
              ? `${correo.remitente_nombre ? `${correo.remitente_nombre} · ` : ""}${correo.remitente}`
              : SIN_DATO}
          </Fila>
        </dl>
        <CorreoPrueba email={email} />
      </Tarjeta>
    </div>
  );
}
