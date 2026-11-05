import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { OrdenActions } from "@/components/ordenes/orden-actions";
import { ProformaListActions } from "@/components/proformas/proforma-list-actions";
import type { Cliente, Proforma } from "@/lib/api/types";
import type { AccionProforma } from "@/lib/proformas";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api/client", () => ({
  clientes: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  ordenes: {},
  proformaPdfUrl: (id: number) => `/api/v1/proformas/${id}/pdf`,
}));

/**
 * Enfoca el icono como lo haría el teclado y devuelve el texto del tooltip.
 * (En jsdom React Aria no abre tooltips con el hover simulado; el hover se
 * revisa en el navegador.)
 */
async function tooltipDe(element: HTMLElement): Promise<string | null> {
  const user = userEvent.setup();

  await user.keyboard("{Shift}");
  act(() => element.focus());
  // En una tabla (grid) el primer foco lo toma la fila; se vuelve a enfocar.
  if (document.activeElement !== element) act(() => element.focus());

  const tooltip = await screen.findByRole("tooltip");
  const texto = tooltip.textContent;

  act(() => element.blur());
  await waitFor(() =>
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
  );

  return texto;
}

const PROFORMA = { id: 4, numero: "PR-2026-000004" } as Proforma;

describe("tooltips en las acciones de proformas", () => {
  it("cada icono de la tabla explica lo que hace en pocas palabras", async () => {
    const acciones = new Set<AccionProforma>([
      "ver",
      "editar",
      "enviar",
      "aceptar",
      "rechazar",
      "crear_orden",
      "pdf",
      "eliminar",
    ]);

    render(
      <ProformaListActions
        proforma={PROFORMA}
        acciones={acciones}
        display="icons"
        onRequestAction={vi.fn()}
      />,
    );

    const esperados: [RegExp, "link" | "button", string][] = [
      [/^Ver proforma/, "link", "Ver detalle"],
      [/^Editar proforma/, "link", "Editar"],
      [/^Enviar/, "button", "Enviar al cliente"],
      [/^Aceptar/, "button", "Aceptar"],
      [/^Rechazar/, "button", "Rechazar"],
      [/^Crear orden/, "link", "Crear orden"],
      [/^Abrir PDF/, "link", "Abrir PDF"],
      [/^Eliminar/, "button", "Eliminar"],
    ];

    for (const [name, role, texto] of esperados) {
      expect(await tooltipDe(screen.getByRole(role, { name }))).toBe(texto);
    }

    // El nombre accesible sigue siendo el aria-label completo.
    expect(
      screen.getByRole("link", { name: "Ver proforma PR-2026-000004" }),
    ).toHaveAttribute("href", "/proformas/4");
  });

  it("en las cards del celular los botones ya tienen texto y no llevan tooltip", async () => {
    render(
      <ProformaListActions
        proforma={PROFORMA}
        acciones={new Set<AccionProforma>(["ver", "enviar"])}
        display="labels"
        onRequestAction={vi.fn()}
      />,
    );

    const user = userEvent.setup();
    await user.tab();
    await user.tab();

    expect(screen.getByRole("button", { name: /^Enviar/ })).toHaveFocus();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("tooltips en las acciones de órdenes (tabla y tablero)", () => {
  it("muestra Ver detalle, Iniciar, Cancelar orden y Cerrar orden", async () => {
    render(
      <OrdenActions
        ordenId={9}
        numero="OS-2026-000009"
        acciones={["ver", "iniciar", "cancelar", "cerrar"]}
        display="icons"
      />,
    );

    expect(
      await tooltipDe(screen.getByRole("link", { name: "Ver orden OS-2026-000009" })),
    ).toBe("Ver detalle");
    expect(
      await tooltipDe(screen.getByRole("button", { name: "Iniciar OS-2026-000009" })),
    ).toBe("Iniciar");
    expect(
      await tooltipDe(screen.getByRole("button", { name: "Cancelar OS-2026-000009" })),
    ).toBe("Cancelar orden");
    expect(
      await tooltipDe(screen.getByRole("button", { name: "Cerrar OS-2026-000009" })),
    ).toBe("Cerrar orden");
  });
});

describe("tooltips en el listado de clientes", () => {
  it("el enlace al historial dentro de la tabla", async () => {
    const cliente = {
      id: 3,
      nombre_razon: "Constructora Andina",
      nit_ci: "123456789",
      estado: "activo",
    } as Cliente;

    render(
      <ClientesTable
        clientes={[cliente]}
        meta={{ current_page: 1, per_page: 15, total: 1, last_page: 1 }}
        query={{ search: "", estado: "", page: 1 }}
        canDelete
      />,
    );

    const tabla = screen.getByRole("grid", { name: "Clientes" });

    expect(
      await tooltipDe(
        within(tabla).getByRole("link", { name: "Ver historial de Constructora Andina" }),
      ),
    ).toBe("Ver historial");
  });
});
