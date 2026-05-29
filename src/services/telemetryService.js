// Telemetry Service - Reporta las comisiones acumuladas al servidor central del desarrollador
const CENTRAL_ENDPOINT = import.meta.env.VITE_DEVELOPER_TELEMETRY_ENDPOINT;
const DEV_TOKEN = import.meta.env.VITE_DEVELOPER_TELEMETRY_TOKEN;

/**
 * Reporta los acumulados mensuales de la tienda al panel central del desarrollador.
 * @param {number} totalVentas - Monto total acumulado facturado en el mes.
 * @param {number} comisionPorcentaje - Porcentaje comisionado pactado con el desarrollador.
 * @param {string} periodo - Periodo formateado en año-mes (ej: "2026-05").
 */
export async function reportMonthlyBillingToDeveloper(totalVentas, comisionPorcentaje, periodo) {
  if (!CENTRAL_ENDPOINT || !DEV_TOKEN) {
    // Si no están configuradas las variables, se ignora silenciosamente (útil para desarrollo/plantilla base)
    return;
  }

  try {
    const response = await fetch(CENTRAL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEV_TOKEN}`
      },
      body: JSON.stringify({
        totalVentas,
        comisionPorcentaje,
        periodo
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("[Telemetry] Reporte consolidado al desarrollador enviado exitosamente:", data);
  } catch (error) {
    console.error("[Telemetry] Error reportando telemetría comisional al desarrollador:", error);
  }
}
