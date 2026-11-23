"use client";

/**
 * Los botones de exportar se dibujan del lado del cliente: `LinkTooltip`
 * clona su enlace hijo, y si ese hijo viene de un componente de servidor
 * puede llegar como referencia perezosa (sin `props`) cuando el servidor
 * está frío. Eso tiraba la página de Reportes ("Algo salió mal").
 */
export { ExportarReporte } from "@/components/reportes/reporte-ui";
