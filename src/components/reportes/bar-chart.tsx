"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import type { EstadoTone } from "@/lib/estados";
import { formatMoney, formatNumber } from "@/lib/utils";

// Solo lo necesario para barras: Chart.js descarta el resto del paquete.
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/** Mismas variables que las barras del dashboard (`toneBar`). */
const TONE_VAR: Record<EstadoTone, string> = {
  neutral: "--muted",
  accent: "--accent",
  success: "--success-soft-foreground",
  warning: "--warning-soft-foreground",
  danger: "--danger-soft-foreground",
};

export interface BarSerie {
  label: string;
  data: number[];
  tone: EstadoTone;
  /** Opacidad de la barra, para distinguir dos series del mismo tono. */
  opacity?: number;
}

interface BarChartProps {
  /** Resumen del gráfico para lectores de pantalla; los datos están en la tabla. */
  ariaLabel: string;
  labels: readonly string[];
  series: BarSerie[];
  horizontal?: boolean;
  money?: boolean;
  stacked?: boolean;
}

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value || fallback;
}

/** "oklch(0.45 0.09 200)" + 0.5 → "oklch(0.45 0.09 200 / 0.5)". */
function withAlpha(color: string, alpha: number | undefined): string {
  if (alpha === undefined || alpha >= 1) return color;
  if (!color.endsWith(")") || color.includes("/") || color.includes(",")) {
    return color;
  }

  return color.replace(/\)$/, ` / ${alpha})`);
}

/** Cambia al alternar el tema, para volver a leer los colores. */
function useThemeVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1));

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return version;
}

interface BarChartOptionsInput {
  labels: readonly string[];
  seriesCount: number;
  horizontal: boolean;
  money: boolean;
  stacked: boolean;
  muted: string;
  grid: string;
}

/**
 * Opciones de Chart.js. El eje de categorías siempre muestra el nombre de la
 * etiqueta: sin un `callback` propio Chart.js puede mostrar el índice (0, 1…).
 */
export function barChartOptions({
  labels,
  seriesCount,
  horizontal,
  money,
  stacked,
  muted,
  grid,
}: BarChartOptionsInput): ChartOptions<"bar"> {
  const format = (value: number) =>
    money ? formatMoney(value) : formatNumber(value);

  const categorias = {
    stacked,
    grid: { color: "transparent" },
    ticks: {
      color: muted,
      autoSkip: false,
      callback: (value: string | number) =>
        labels[Number(value)] ?? String(value),
    },
  };

  const valores = {
    stacked,
    beginAtZero: true,
    grid: { color: grid },
    ticks: {
      color: muted,
      precision: money ? undefined : 0,
      callback: (value: string | number) => format(Number(value)),
    },
  };

  return {
    indexAxis: horizontal ? "y" : "x",
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: seriesCount > 1,
        position: "bottom",
        labels: { color: muted, boxWidth: 12, boxHeight: 12 },
      },
      tooltip: {
        callbacks: {
          label: (item) =>
            `${item.dataset.label}: ${format(Number(item.raw ?? 0))}`,
        },
      },
    },
    scales: horizontal
      ? { x: valores, y: categorias }
      : { x: categorias, y: valores },
  };
}

export function BarChart({
  ariaLabel,
  labels,
  series,
  horizontal = false,
  money = false,
  stacked = false,
}: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeVersion = useThemeVersion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    // Sin canvas (pruebas, navegadores sin soporte) la tabla sigue mostrando los datos.
    if (!canvas || !context) return;

    const muted = cssVar("--muted", "#71717a");

    const chart = new Chart(context, {
      type: "bar",
      data: {
        labels: [...labels],
        datasets: series.map((serie) => {
          const color = withAlpha(
            cssVar(TONE_VAR[serie.tone], muted),
            serie.opacity,
          );

          return {
            label: serie.label,
            data: serie.data,
            backgroundColor: color,
            borderRadius: 4,
            maxBarThickness: 36,
          };
        }),
      },
      options: barChartOptions({
        labels,
        seriesCount: series.length,
        horizontal,
        money,
        stacked,
        muted,
        grid: cssVar("--separator", cssVar("--border", "#e4e4e7")),
      }),
    });

    return () => chart.destroy();
  }, [labels, series, horizontal, money, stacked, themeVersion]);

  return (
    <div className="relative h-64 w-full min-w-0">
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel}>
        {ariaLabel}
      </canvas>
    </div>
  );
}
