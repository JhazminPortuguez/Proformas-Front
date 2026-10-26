import { Alert } from "@heroui/react";
import { cn } from "@/lib/utils";

interface FormErrorSummaryProps {
  count: number;
  message?: string | null;
  className?: string;
}

/**
 * Resumen accesible de validación. El foco no se manda acá: se manda al primer
 * campo inválido para que la persona pueda corregirlo de inmediato.
 */
export function FormErrorSummary({
  count,
  message,
  className,
}: FormErrorSummaryProps) {
  if (count <= 0) return null;

  const title = `Revisa ${count} ${count === 1 ? "campo" : "campos"}`;

  return (
    <Alert status="danger" role="alert" className={cn("items-start", className)}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>
          {message ?? "Corrige los campos marcados para continuar."}
        </Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
