"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@heroui/react";
import { ClienteFormDrawer } from "./cliente-form-drawer";
import type { Cliente } from "@/lib/api/types";

/**
 * Botón Editar de la ficha. Reutiliza el drawer del listado y refresca el
 * server component al guardar para que el encabezado y los totales se actualicen.
 */
export function ClienteEditarAction({ cliente }: { cliente: Cliente }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);

  return (
    <>
      <Button
        variant="secondary"
        onPress={() => {
          setSession((value) => value + 1);
          setIsOpen(true);
        }}
      >
        <Pencil aria-hidden className="size-4" />
        Editar
      </Button>

      <ClienteFormDrawer
        key={session}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        cliente={cliente}
        onSaved={() => {
          setIsOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
