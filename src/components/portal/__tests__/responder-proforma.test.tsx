import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResponderProforma } from "@/components/portal/responder-proforma";
import { ApiError } from "@/lib/api/types";
import type { PortalProforma } from "@/lib/api/types";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
  aceptarProforma: vi.fn(),
  rechazarProforma: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mocks.replace,
    refresh: mocks.refresh,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api/client", () => ({
  portal: {
    aceptarProforma: mocks.aceptarProforma,
    rechazarProforma: mocks.rechazarProforma,
  },
}));

const ENVIADA: Pick<
  PortalProforma,
  "id" | "numero" | "estado" | "total" | "moneda" | "puede_responder" | "motivo_no_puede_responder"
> = {
  id: 7,
  numero: "PR-2026-000007",
  estado: "ENVIADA",
  total: 1250.75,
  moneda: "BOB",
  puede_responder: true,
  motivo_no_puede_responder: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ResponderProforma (P-11 / U-05)", () => {
  it("aceptar abre una confirmación con el total y llama al portal", async () => {
    const user = userEvent.setup();
    mocks.aceptarProforma.mockResolvedValue({});

    render(<ResponderProforma proforma={ENVIADA} />);

    await user.click(screen.getByRole("button", { name: "Aceptar la proforma PR-2026-000007" }));

    expect(
      await screen.findByRole("heading", { name: "¿Aceptar la proforma PR-2026-000007?" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Total: Bs\s1\.250,75\./)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aceptar proforma" }));

    await waitFor(() => expect(mocks.aceptarProforma).toHaveBeenCalledWith(7));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("rechazar se puede confirmar sin motivo, y si lo escribe se envía", async () => {
    const user = userEvent.setup();
    mocks.rechazarProforma.mockResolvedValue({});

    render(<ResponderProforma proforma={ENVIADA} />);

    await user.click(screen.getByRole("button", { name: "Rechazar la proforma PR-2026-000007" }));
    const confirmar = await screen.findByRole("button", { name: "Rechazar proforma" });
    expect(confirmar).not.toBeDisabled();
    expect(screen.getByText(/^Total: Bs\s1\.250,75\./)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Motivo (opcional)", { selector: "textarea" }), "Muy caro");
    await user.click(confirmar);

    await waitFor(() => expect(mocks.rechazarProforma).toHaveBeenCalledWith(7, "Muy caro"));
  });

  it("si la empresa respondió antes, muestra su mensaje y actualiza la pantalla", async () => {
    const user = userEvent.setup();
    const mensaje =
      "La empresa ya registró la aceptación de esta proforma el 22/11/2026 a las 10:15, así que no se puede aceptar. Recarga la página para ver su estado.";
    mocks.aceptarProforma.mockRejectedValue(new ApiError(mensaje, 409));

    render(<ResponderProforma proforma={ENVIADA} />);

    await user.click(screen.getByRole("button", { name: "Aceptar la proforma PR-2026-000007" }));
    await user.click(await screen.findByRole("button", { name: "Aceptar proforma" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(mensaje);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("vencida: no hay botones y explica qué hacer", () => {
    const mensaje = "Esta proforma venció el 20/11/2026. Comunícate con la empresa para actualizarla.";

    render(
      <ResponderProforma
        proforma={{ ...ENVIADA, puede_responder: false, motivo_no_puede_responder: mensaje }}
      />,
    );

    expect(screen.getByText(mensaje)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("una proforma ya respondida no muestra nada", () => {
    const { container } = render(
      <ResponderProforma proforma={{ ...ENVIADA, estado: "ACEPTADA", puede_responder: false }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
