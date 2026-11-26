import type { Metadata } from "next";
import { OlvideContrasenaForm } from "@/components/auth/olvide-contrasena-form";

export const metadata: Metadata = {
  title: "Olvidé mi contraseña",
};

/** Ronda C, parte 2: pública, sin sesión. */
export default function OlvideContrasenaPage() {
  return <OlvideContrasenaForm />;
}
