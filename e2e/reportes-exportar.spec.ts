import { readFileSync } from "node:fs";
import type { Download, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * Mejora 2: los reportes se descargan en CSV, PDF y Excel desde la pantalla,
 * con los mismos filtros. Sobre la COPIA de la base.
 */
const TABS = ["ordenes", "servicios", "inventario", "cobros"] as const;

async function descargar(page: Page, nombre: string): Promise<{ archivo: Download; datos: Buffer }> {
  const enlace = page.getByRole("link", { name: nombre });
  let archivo: Download | undefined;

  // Un clic durante la hidratación puede perderse: se reintenta.
  await expect(async () => {
    const espera = page.waitForEvent("download", { timeout: 5_000 });

    await enlace.click();
    archivo = await espera;
  }).toPass({ timeout: 40_000 });

  return { archivo: archivo!, datos: readFileSync((await archivo!.path())!) };
}

test("cada reporte se descarga en CSV, PDF y Excel con los filtros de la pantalla", async ({
  page,
}) => {
  test.setTimeout(240_000);

  for (const tab of TABS) {
    await page.goto(`/reportes?tab=${tab}`);

    const grupo = page.getByRole("group", { name: "Exportar reporte" });

    await expect(grupo.getByRole("link")).toHaveCount(3);

    for (const enlace of await grupo.getByRole("link").all()) {
      await expect(enlace).toHaveAttribute("href", new RegExp(`^/api/v1/reportes/${tab}\\?desde=\\d{4}-\\d{2}-01&hasta=`));
    }

    const csv = await descargar(page, "Exportar CSV");

    expect(csv.archivo.suggestedFilename()).toMatch(new RegExp(`^reporte-${tab}_.*\\.csv$`));
    expect(csv.datos.length).toBeGreaterThan(0);

    const pdf = await descargar(page, "Exportar PDF");

    expect(pdf.archivo.suggestedFilename()).toMatch(new RegExp(`^reporte-${tab}_.*\\.pdf$`));
    expect(pdf.datos.subarray(0, 4).toString()).toBe("%PDF");

    const xlsx = await descargar(page, "Exportar Excel");

    expect(xlsx.archivo.suggestedFilename()).toMatch(new RegExp(`^reporte-${tab}_.*\\.xlsx$`));
    // Un .xlsx real es un ZIP ("PK\x03\x04"), no un CSV renombrado.
    expect(xlsx.datos.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
  }
});

test("los botones de exportar explican su formato al pasar el mouse", async ({ page }) => {
  await page.goto("/reportes?tab=cobros");

  const pdf = page.getByRole("link", { name: "Exportar PDF" });

  await expect(async () => {
    await page.mouse.move(0, 0);
    await pdf.hover();
    await expect(page.getByRole("tooltip", { name: /carta con logo/ })).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 20_000 });

  await page.mouse.move(0, 0);
  await page.getByRole("link", { name: "Exportar Excel" }).hover();
  // Mientras uno se cierra y otro se abre pueden convivir dos tooltips.
  await expect(page.getByRole("tooltip", { name: /\.xlsx/ })).toBeVisible();
});

test("el filtro de cliente viaja a los tres archivos", async ({ page }) => {
  await page.goto("/reportes?tab=cobros&desde=2026-11-01&hasta=2026-11-30&cliente_id=1");

  for (const [nombre, formato] of [
    ["Exportar CSV", "csv"],
    ["Exportar PDF", "pdf"],
    ["Exportar Excel", "xlsx"],
  ] as const) {
    await expect(page.getByRole("link", { name: nombre })).toHaveAttribute(
      "href",
      `/api/v1/reportes/cobros?desde=2026-11-01&hasta=2026-11-30&cliente_id=1&formato=${formato}`,
    );
  }
});
