import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BarSerie } from "@/components/reportes/bar-chart";
import { barChartOptions } from "@/components/reportes/bar-chart";
import { ReporteCobrosView } from "@/components/reportes/reporte-cobros";
import { ReporteInventarioView } from "@/components/reportes/reporte-inventario";
import { ReporteOrdenesView } from "@/components/reportes/reporte-ordenes";
import { ReporteServiciosView } from "@/components/reportes/reporte-servicios";
import type {
  ReporteCobros,
  ReporteInventario,
  ReporteOrdenes,
  ReporteServiciosProformas,
} from "@/lib/api/types";

/** Etiquetas que cada reporte entrega al gráfico. */
const graficos: { labels: readonly string[]; series: BarSerie[] }[] = [];

vi.mock("@/components/reportes/bar-chart", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/components/reportes/bar-chart")>();

  return {
    ...original,
    BarChart: (props: { labels: readonly string[]; series: BarSerie[] }) => {
      graficos.push({ labels: props.labels, series: props.series });

      return null;
    },
  };
});

const PERIODO = { desde: "2026-11-01", hasta: "2026-11-30" };

type TickCallback = (value: number) => string;

function opciones(horizontal: boolean, money = false, labels = ["A"]) {
  return barChartOptions({
    labels,
    seriesCount: 1,
    horizontal,
    money,
    stacked: false,
    muted: "gray",
    grid: "silver",
  });
}

/** Lo que Chart.js dibuja en el eje de categorías para cada barra. */
function etiquetasDelEje(labels: string[], horizontal: boolean): string[] {
  const scales = opciones(horizontal, false, labels).scales;
  const eje = horizontal ? scales?.y : scales?.x;
  const callback = eje?.ticks?.callback as unknown as TickCallback;

  return labels.map((_, index) => callback(index));
}

describe("barChartOptions", () => {
  it("el eje de categorías muestra los nombres, no los índices", () => {
    const labels = ["Operario Demo", "Sin asignar"];

    expect(etiquetasDelEje(labels, false)).toEqual(labels);
    expect(etiquetasDelEje(labels, true)).toEqual(labels);
  });

  it("el eje de valores formatea montos en Bs", () => {
    const callback = opciones(true, true).scales?.x?.ticks
      ?.callback as unknown as TickCallback;

    expect(callback(110.5).replace(/\s/g, " ")).toBe("Bs 110,50");
  });
});

describe("etiquetas de los gráficos de cada reporte", () => {
  beforeEach(() => {
    graficos.length = 0;
  });

  it("Órdenes usa el nombre del operario y «Sin asignar»", () => {
    const data: ReporteOrdenes = {
      periodo: PERIODO,
      total: 3,
      por_estado: { PENDIENTE: 0, ASIGNADA: 0, EN_PROCESO: 1, FINALIZADA: 1, CANCELADA: 1 },
      por_operario: [
        { operario_id: 2, operario: "Operario Demo", pendientes: 0, asignadas: 0, en_proceso: 1, finalizadas: 1, canceladas: 0, total: 2 },
        { operario_id: null, operario: null, pendientes: 0, asignadas: 0, en_proceso: 0, finalizadas: 0, canceladas: 1, total: 1 },
      ],
      cumplimiento: { a_tiempo: 0, con_atraso: 1, sin_fecha: 0, porcentaje_a_tiempo: 0 },
      atrasadas: [],
    };

    render(<ReporteOrdenesView data={data} />);

    expect(graficos).toHaveLength(1);
    expect(graficos[0].labels).toEqual(["Operario Demo", "Sin asignar"]);
  });

  it("Servicios usa el nombre del servicio", () => {
    const data: ReporteServiciosProformas = {
      periodo: PERIODO,
      proformas: { cotizado: 850, cotizadas: 1, aceptado: 850, aceptadas: 1, rechazadas: 0, en_espera: 0, tasa_aceptacion: 100 },
      servicios: [
        { servicio_id: 1, nombre: "Instalación básica", categoria: "Instalación", cantidad: 2, monto: 700 },
        { servicio_id: 4, nombre: "Soporte remoto", categoria: null, cantidad: 1, monto: 150 },
      ],
    };

    render(<ReporteServiciosView data={data} />);

    expect(graficos[0].labels).toEqual(["Instalación básica", "Soporte remoto"]);
  });

  it("Inventario usa el nombre del producto", () => {
    const data: ReporteInventario = {
      periodo: PERIODO,
      consumo: { costo_total: 128, movimientos: 2, productos: 2 },
      productos: [
        { producto_id: 6, nombre: "Ventilador de reemplazo", unidad_medida: "unidad", cantidad: 2, costo: 110 },
        { producto_id: 2, nombre: "Cable HDMI 2 m", unidad_medida: "unidad", cantidad: 1, costo: 18 },
      ],
      stock_bajo: [],
    };

    render(<ReporteInventarioView data={data} />);

    expect(graficos[0].labels).toEqual(["Ventilador de reemplazo", "Cable HDMI 2 m"]);
  });

  it("Cuentas por cobrar usa el nombre de cada franja", () => {
    const data: ReporteCobros = {
      periodo: PERIODO,
      cobrado: 100,
      pagos: 1,
      saldo_pendiente: 265,
      cuentas_con_saldo: 1,
      vencidas: 0,
      monto_vencido: 0,
      aging: { al_dia: 265, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 },
      cuentas: [
        {
          id: 1,
          numero: "CXC-2026-000001",
          cliente: { nombre_razon: "Cliente Prospecto SRL", nit_ci: "9001002" },
          fecha_vencimiento: "2026-11-25",
          dias_vencida: 0,
          saldo: 265,
          franja: "al_dia",
        },
      ],
    };

    render(<ReporteCobrosView data={data} />);

    expect(graficos[0].labels).toEqual([
      "Al día",
      "1 a 30 días",
      "31 a 60 días",
      "61 a 90 días",
      "Más de 90 días",
    ]);
  });
});
