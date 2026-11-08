import type { Empresa, EmpresaInput } from "@/lib/api/types";

/** Igual que el back: PNG o JPG de hasta 1 MB. */
export const LOGO_TIPOS = ["image/png", "image/jpeg"] as const;
export const LOGO_MAX_BYTES = 1024 * 1024;

/** Mensaje de error para un logo inválido, o `null` si se puede subir. */
export function validarLogo(archivo: Pick<File, "type" | "size">): string | null {
  if (!(LOGO_TIPOS as readonly string[]).includes(archivo.type)) {
    return "El logo debe ser una imagen PNG o JPG.";
  }

  if (archivo.size > LOGO_MAX_BYTES) {
    return "El logo no puede pesar más de 1 MB.";
  }

  return null;
}

export interface EmpresaDraft {
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
  direccion: string;
  condiciones: string;
}

export function empresaDraft(empresa: Empresa): EmpresaDraft {
  return {
    nombre: empresa.nombre ?? "",
    nit: empresa.nit ?? "",
    telefono: empresa.telefono ?? "",
    email: empresa.email ?? "",
    direccion: empresa.direccion ?? "",
    condiciones: empresa.condiciones ?? "",
  };
}

/** Campos vacíos viajan como null. */
export function empresaPayload(draft: EmpresaDraft): EmpresaInput {
  const valor = (texto: string) => texto.trim() || null;

  return {
    nombre: draft.nombre.trim(),
    nit: valor(draft.nit),
    telefono: valor(draft.telefono),
    email: valor(draft.email),
    direccion: valor(draft.direccion),
    condiciones: valor(draft.condiciones),
  };
}
