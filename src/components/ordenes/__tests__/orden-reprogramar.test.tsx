import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrdenActions } from "@/components/ordenes/orden-actions";
import { OrdenTimeline } from "@/components/ordenes/orden-timeline";
import { ApiError, type Orden } from "@/lib/api/types";

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

const reprogramar = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ordenes: {
    reprogramar: (...args: unknown[]) => reprogramar(...args),
  },
}));

function renderReprogramar(
  fechaProgramada: string | null = "2026-11-05",
  acciones: Parameters<typeof OrdenActions>[0]["acciones"] = ["reprogramar"],
) {
  return render(
    <OrdenActions
      ordenId={9}
      numero="OS-2026-000009"
      acciones={acciones}
      fechaProgramada={fechaProgramada}
      display="detail"
      hideVer
    />,
  );
}

function campoFecha() {
  return screen.getByLabelText(/Nueva fecha programada/) as HTMLInputElement;
}

describe("OrdenActions · reprogramar", () => {
  beforeEach(() => {
    reprogramar.mockReset();
  });

  it("solo aparece si el back ofrece la acción", () => {
    renderReprogramar("2026-11-05", ["ver", "iniciar"]);

    expect(
      screen.queryByRole("button", { name: /Reprogramar/ }),
    ).not.toBeInTheDocument();
  });

  it("abre el diálogo con la fecha actual y guarda la nueva", async () => {
    const user = userEvent.setup();
    reprogramar.mockResolvedValue({ id: 9 });
    renderReprogramar();

    await user.click(
      screen.getByRole("button", { name: "Reprogramar OS-2026-000009" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Reprogramar orden" });

    expect(dialog).toHaveTextContent(/programada para el 5 nov\.? de 2026/);
    expect(dialog).toHaveTextContent("queda en el historial");
    expect(campoFecha()).toHaveValue("2026-11-05");

    fireEvent.change(campoFecha(), { target: { value: "2026-11-12" } });
    await user.click(screen.getByRole("button", { name: "Reprogramar" }));

    await waitFor(() =>
      expect(reprogramar).toHaveBeenCalledWith(9, "2026-11-12"),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Reprogramar orden" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("no envía la misma fecha ni una vacía", async () => {
    const user = userEvent.setup();
    renderReprogramar();

    await user.click(
      screen.getByRole("button", { name: "Reprogramar OS-2026-000009" }),
    );
    await user.click(screen.getByRole("button", { name: "Reprogramar" }));

    expect(
      await screen.findByText("La fecha nueva es igual a la fecha programada actual."),
    ).toBeInTheDocument();

    fireEvent.change(campoFecha(), { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Reprogramar" }));

    expect(
      await screen.findByText("Elige la nueva fecha programada."),
    ).toBeInTheDocument();
    expect(reprogramar).not.toHaveBeenCalled();
  });

  it("una orden sin fecha lo dice y muestra el error del back", async () => {
    const user = userEvent.setup();
    reprogramar.mockRejectedValue(
      new ApiError("Solo se puede reprogramar una orden pendiente o asignada.", 422, {
        estado: ["Solo se puede reprogramar una orden pendiente o asignada."],
      }),
    );
    renderReprogramar(null);

    await user.click(
      screen.getByRole("button", { name: "Reprogramar OS-2026-000009" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Reprogramar orden" }),
    ).toHaveTextContent("todavía no tiene fecha programada");
    expect(campoFecha()).toHaveValue("");

    fireEvent.change(campoFecha(), { target: { value: "2026-11-20" } });
    await user.click(screen.getByRole("button", { name: "Reprogramar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Solo se puede reprogramar una orden pendiente o asignada.",
    );
  });
});

describe("OrdenActions · reprogramar con error de fecha del back", () => {
  it("muestra el error en el campo", async () => {
    const user = userEvent.setup();
    reprogramar.mockRejectedValue(
      new ApiError("Datos inválidos", 422, {
        fecha_programada: ["La fecha nueva es igual a la fecha programada actual."],
      }),
    );
    renderReprogramar("2026-11-05");

    await user.click(
      screen.getByRole("button", { name: "Reprogramar OS-2026-000009" }),
    );
    fireEvent.change(campoFecha(), { target: { value: "2026-11-06" } });
    await user.click(screen.getByRole("button", { name: "Reprogramar" }));

    expect(
      await screen.findByText("La fecha nueva es igual a la fecha programada actual."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No pudimos reprogramar la orden."),
    ).not.toBeInTheDocument();
  });
});

describe("OrdenTimeline · reprogramación", () => {
  it("muestra el evento con la fecha anterior y la nueva", () => {
    const orden = {
      id: 9,
      numero: "OS-2026-000009",
      estado: "ASIGNADA",
      eventos: [
        {
          id: 1,
          orden_id: 9,
          tipo: "REPROGRAMACION",
          descripcion: "Fecha programada cambiada de 05/11/2026 a 12/11/2026.",
          estado_anterior: null,
          estado_nuevo: null,
          user_id: 1,
          usuario: { id: 1, name: "Admin Demo" },
          created_at: "2026-11-08T14:00:00Z",
        },
      ],
    } as unknown as Orden;

    render(<OrdenTimeline orden={orden} />);

    expect(screen.getByText("Fecha reprogramada")).toBeInTheDocument();
    expect(
      screen.getByText("Fecha programada cambiada de 05/11/2026 a 12/11/2026."),
    ).toBeInTheDocument();
  });
});
