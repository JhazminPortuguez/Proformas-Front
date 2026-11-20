import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { navItemsFor } from "@/components/layout/nav";

const mocks = vi.hoisted(() => ({ pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));

/** Términos en español y sin repetir "Panel > Panel". */
describe("Breadcrumbs y menú", () => {
  it("el menú dice Panel, no Dashboard", () => {
    const etiquetas = navItemsFor("admin").flatMap((g) => g.items.map((i) => i.label));

    expect(etiquetas).toContain("Panel");
    expect(etiquetas).not.toContain("Dashboard");
  });

  it("en el panel muestra solo Panel", () => {
    mocks.pathname = "/dashboard";
    render(<Breadcrumbs />);

    expect(screen.getAllByText("Panel")).toHaveLength(1);
  });

  it("en otra pantalla: Panel > grupo > pantalla", () => {
    mocks.pathname = "/clientes";
    render(<Breadcrumbs />);

    const nav = screen.getByRole("navigation", { name: "Ruta de navegación" });

    expect(nav).toHaveTextContent(/Panel\s*Comercial\s*Clientes/);
    expect(screen.getByRole("link", { name: "Panel" })).toHaveAttribute("href", "/dashboard");
  });
});
