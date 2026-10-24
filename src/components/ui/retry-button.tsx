"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";

export function RetryButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onPress={() => router.refresh()}
    >
      Reintentar
    </Button>
  );
}
