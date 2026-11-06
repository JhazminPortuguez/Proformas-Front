import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@heroui/react";
import { describe, expect, it } from "vitest";
import { ActionTooltip, LinkTooltip } from "@/components/ui/action-tooltip";

describe("ActionTooltip", () => {
  it("muestra el texto corto al enfocar el botón de icono", async () => {
    const user = userEvent.setup();

    render(
      <ActionTooltip label="Editar">
        <Button isIconOnly aria-label="Editar Cliente Demo SRL">
          <Pencil aria-hidden className="size-4" />
        </Button>
      </ActionTooltip>,
    );

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.tab();

    expect(await screen.findByRole("tooltip")).toHaveTextContent("Editar");
    // El nombre accesible sigue siendo el aria-label completo.
    expect(
      screen.getByRole("button", { name: "Editar Cliente Demo SRL" }),
    ).toHaveFocus();
  });

  it("se cierra con Escape", async () => {
    const user = userEvent.setup();

    render(
      <ActionTooltip label="Eliminar">
        <Button isIconOnly aria-label="Eliminar Cliente Demo SRL">
          <Pencil aria-hidden className="size-4" />
        </Button>
      </ActionTooltip>,
    );

    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Eliminar");

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
  });
});

describe("LinkTooltip", () => {
  it("el enlace es el disparador: una sola parada de tabulación y rol de enlace", async () => {
    const user = userEvent.setup();

    render(
      <>
        <LinkTooltip label="Ver detalle">
          <Link href="/proformas/4" className="size-9" aria-label="Ver proforma PR-2026-000004">
            <Pencil aria-hidden className="size-4" />
          </Link>
        </LinkTooltip>
        <button type="button">Siguiente</button>
      </>,
    );

    const enlace = screen.getByRole("link", { name: "Ver proforma PR-2026-000004" });
    expect(enlace).toHaveAttribute("href", "/proformas/4");
    expect(enlace).toHaveClass("size-9");
    // El icono del enlace no se pierde al usar el enlace como disparador.
    expect(enlace.querySelector("svg")).toBeInTheDocument();

    await user.tab();
    expect(enlace).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Ver detalle");

    await user.tab();
    expect(screen.getByRole("button", { name: "Siguiente" })).toHaveFocus();
  });

  it("conserva el contenido de un <a> normal", () => {
    render(
      <LinkTooltip label="Abrir PDF">
        <a href="/api/v1/proformas/4/pdf" target="_blank" aria-label="Abrir PDF de PR-2026-000004">
          <Pencil aria-hidden className="size-4" />
          <span className="sr-only">(se abre en otra pestaña)</span>
        </a>
      </LinkTooltip>,
    );

    const enlace = screen.getByRole("link", { name: "Abrir PDF de PR-2026-000004" });

    expect(enlace.querySelector("svg")).toBeInTheDocument();
    expect(enlace).toHaveTextContent("(se abre en otra pestaña)");
    expect(enlace).toHaveAttribute("target", "_blank");
  });
});
