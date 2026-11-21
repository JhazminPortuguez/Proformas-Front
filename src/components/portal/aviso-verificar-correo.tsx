import { Alert } from "@heroui/react";
import { ReenviarEnlace } from "@/components/portal/reenviar-enlace";

export const MENSAJE_SIN_VERIFICAR =
  "Hasta que lo verifiques puedes ver tu portal, pero no enviar solicitudes ni aceptar o rechazar proformas.";

/**
 * Ronda A, parte 3: aviso en todo el portal mientras el cliente no verifica
 * su correo, con "Reenviar enlace".
 */
export function AvisoVerificarCorreo({ email }: { email: string }) {
  return (
    <Alert status="warning" className="mb-6">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>Verifica tu correo</Alert.Title>
        <Alert.Description>
          Te enviamos un enlace a <span className="font-medium">{email}</span>. {MENSAJE_SIN_VERIFICAR}{" "}
          Si no lo encuentras, revisa la carpeta de spam o pide otro.
        </Alert.Description>
        <div className="mt-2">
          <ReenviarEnlace />
        </div>
      </Alert.Content>
    </Alert>
  );
}
