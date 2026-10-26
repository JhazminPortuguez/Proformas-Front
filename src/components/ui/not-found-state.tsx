import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "./feedback";

interface NotFoundStateProps {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}

export function NotFoundState({
  title,
  description,
  backHref = "/proformas",
  backLabel = "Volver a proformas",
}: NotFoundStateProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon={<FileQuestion aria-hidden className="size-5" />}
      action={
        <Link
          href={backHref}
          className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {backLabel}
        </Link>
      }
    />
  );
}
