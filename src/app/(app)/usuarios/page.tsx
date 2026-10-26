import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { UsuariosTable } from "@/components/usuarios/usuarios-table";
import { getUsuarios, requireUser } from "@/lib/api/server";
import { apiErrorMessage } from "@/lib/api/errors";
import { isApiError } from "@/lib/api/types";
import type { Paginated, User } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Usuarios",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser(["admin"]);
  const params = await searchParams;

  const search = first(params.search).trim();
  const parsedPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let result: Paginated<User>;

  try {
    result = await getUsuarios({ search, page });
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 419)) {
      redirect("/login");
    }

    return (
      <>
        <PageHeader title="Usuarios" />
        <ErrorState
          message={apiErrorMessage(error)}
          action={<RetryButton />}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Administra quién entra al backoffice. Solo un administrador puede cambiar roles o desactivar cuentas."
      />

      <UsuariosTable
        usuarios={result.data}
        meta={result.meta}
        query={{ search, page }}
        currentUserId={user.id}
      />
    </>
  );
}
