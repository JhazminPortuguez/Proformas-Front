import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OrdenActions } from "@/components/ordenes/orden-actions";
import { ordenMontoCierre } from "@/lib/ordenes";

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

function renderCerrar(
  display: "icons" | "detail",
  montoCierre?: { total: number; moneda?: string | null } | null,
) {
  return render(
    <OrdenActions
      ordenId={9}
      numero="ORD-000009"
      acciones={["ver", "cerrar"]}
      display={display}
      montoCierre={montoCierre}
      hideVer
    />,
  );
}

describe("OrdenActions · cierre", () => {
  it("en el detalle avisa que cerrar genera la cuenta por cobrar", () => {
    renderCerrar("detail", { total: 587.6, moneda: "BOB" });

    expect(
      screen.getByRole("button", {
        name: "Cerrar orden (genera la cuenta por cobrar) ORD-000009",
      }),
    ).toBeInTheDocument();
  });

  it("confirma con el total de la proforma en Bs", async () => {
    const user = userEvent.setup();
    renderCerrar("detail", { total: 587.6, moneda: "BOB" });

    await user.click(screen.getByRole("button", { name: /Cerrar orden/ }));

    const dialog = screen.getByRole("alertdialog", { name: "Cerrar orden" });

    expect(dialog).toHaveTextContent(
      /¿Cerrar la orden y generar la cuenta por cobrar por Bs\s?587,60\?/,
    );
  });

  it("confirma en la moneda de la proforma sin convertir", async () => {
    const user = userEvent.setup();
    renderCerrar("icons", { total: 339, moneda: "USD" });

    await user.click(screen.getByRole("button", { name: "Cerrar ORD-000009" }));

    expect(
      screen.getByRole("alertdialog", { name: "Cerrar orden" }),
    ).toHaveTextContent(/cuenta por cobrar por USD\s?339,00\?/);
  });

  it("sin proforma cargada no inventa un monto", async () => {
    const user = userEvent.setup();
    renderCerrar("icons", null);

    await user.click(screen.getByRole("button", { name: "Cerrar ORD-000009" }));

    const dialog = screen.getByRole("alertdialog", { name: "Cerrar orden" });

    expect(dialog).toHaveTextContent(
      "¿Cerrar la orden y generar la cuenta por cobrar?",
    );
    expect(dialog).not.toHaveTextContent(/Bs/);
  });
});

describe("ordenMontoCierre", () => {
  it("toma el total y la moneda de la proforma", () => {
    expect(
      ordenMontoCierre({
        proforma: {
          id: 1,
          numero: "PR-1",
          estado: "ACEPTADA",
          moneda: "USD",
          total: 339,
        },
      }),
    ).toEqual({ total: 339, moneda: "USD" });
    expect(ordenMontoCierre({ proforma: null })).toBeNull();
  });
});
