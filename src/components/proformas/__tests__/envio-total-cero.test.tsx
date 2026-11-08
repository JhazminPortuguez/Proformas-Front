import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProformaDetailActions } from "@/components/proformas/proforma-detail-actions";
import { ProformaForm } from "@/components/proformas/proforma-form";
import { ProformaListActions } from "@/components/proformas/proforma-list-actions";
import type { Proforma } from "@/lib/api/types";
import { MOTIVO_TOTAL_CERO, type AccionProforma } from "@/lib/proformas";

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

const enviar = vi.fn();

vi.mock("@/lib/api/client", () => ({
  proformas: {
    enviar: (...args: unknown[]) => enviar(...args),
    create: vi.fn(),
    update: vi.fn(),
  },
  proformaPdfUrl: (id: number) => `/api/v1/proformas/${id}/pdf`,
}));

/**
 * Enfoca el botón como el teclado y devuelve el texto del tooltip. React Aria
 * solo abre el tooltip con foco si la última interacción fue de teclado, y
 * Shift solo no cuenta: se usa Escape (no hay diálogos abiertos).
 */
async function tooltipDe(element: HTMLElement): Promise<string | null> {
  const user = userEvent.setup();

  await user.keyboard("{Escape}");
  act(() => element.focus());

  const tooltip = await screen.findByRole("tooltip");
  const texto = tooltip.textContent;

  act(() => element.blur());
  await waitFor(() =>
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
  );

  return texto;
}

/**
 * Saca el puntero del botón y espera que el tooltip se cierre, para que su
 * estado global no pase a la prueba siguiente.
 */
async function soltar(element: HTMLElement) {
  await userEvent.setup().unhover(element);
  await waitFor(() =>
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
  );
}

describe("Enviar una proforma en Bs 0", () => {
  it("en el detalle, el botón queda deshabilitado y el tooltip da el motivo", async () => {
    const user = userEvent.setup();

    render(
      <ProformaDetailActions
        proformaId={5}
        numero="PR-2026-000005"
        acciones={["ver", "editar", "enviar"]}
        canDelete={false}
        total={0}
      />,
    );

    const boton = screen.getByRole("button", { name: /Enviar/ });

    expect(boton).toHaveAttribute("aria-disabled", "true");
    // HeroUI quita los eventos del puntero a un botón aria-disabled; sin esta
    // clase el tooltip no se abre con el mouse (visto en el navegador).
    expect(boton).toHaveClass("pointer-events-auto!");
    expect(await tooltipDe(boton)).toBe(MOTIVO_TOTAL_CERO);

    await user.click(boton);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(enviar).not.toHaveBeenCalled();

    await soltar(boton);
  });

  it("con total mayor a Bs 0 se puede enviar normalmente", async () => {
    const user = userEvent.setup();

    render(
      <ProformaDetailActions
        proformaId={5}
        numero="PR-2026-000005"
        acciones={["ver", "editar", "enviar"]}
        canDelete={false}
        total={410}
      />,
    );

    const boton = screen.getByRole("button", { name: /Enviar/ });

    expect(boton).not.toHaveAttribute("aria-disabled");

    await user.click(boton);

    expect(
      screen.getByRole("alertdialog", { name: "Enviar proforma" }),
    ).toBeInTheDocument();
  });

  it("en la tabla, el icono de enviar se deshabilita con el mismo motivo", async () => {
    const user = userEvent.setup();
    const onRequestAction = vi.fn();

    render(
      <ProformaListActions
        proforma={{ id: 5, numero: "PR-2026-000005", total: 0 } as Proforma}
        acciones={new Set<AccionProforma>(["ver", "enviar"])}
        display="icons"
        onRequestAction={onRequestAction}
      />,
    );

    const boton = screen.getByRole("button", { name: "Enviar PR-2026-000005" });

    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(await tooltipDe(boton)).toBe(MOTIVO_TOTAL_CERO);

    await user.click(boton);

    expect(onRequestAction).not.toHaveBeenCalled();

    await soltar(boton);
  });

  it("en el formulario, Guardar y enviar espera a que el total sea mayor a Bs 0", async () => {
    render(
      <ProformaForm
        proforma={null}
        clientes={[]}
        servicios={[]}
        productos={[]}
        today="2026-11-08"
      />,
    );

    const enviarBoton = screen.getByRole("button", { name: "Guardar y enviar" });

    expect(enviarBoton).toHaveAttribute("aria-disabled", "true");
    expect(enviarBoton).toHaveAttribute("type", "button");
    expect(await tooltipDe(enviarBoton)).toBe(MOTIVO_TOTAL_CERO);

    // El borrador sí se puede guardar.
    expect(
      screen.getByRole("button", { name: /Guardar borrador/ }),
    ).not.toHaveAttribute("aria-disabled");
  });
});
