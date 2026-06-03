import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Variables de entorno para modo Blaze (HTTP)
const CENTRAL_ENDPOINT = import.meta.env.VITE_DEVELOPER_TELEMETRY_ENDPOINT;
const DEV_TOKEN = import.meta.env.VITE_DEVELOPER_TELEMETRY_TOKEN;

// Variables de entorno para modo Spark (Direct Firestore)
const CENTRAL_API_KEY = import.meta.env.VITE_DEVELOPER_CENTRAL_API_KEY;
const CENTRAL_AUTH_DOMAIN = import.meta.env.VITE_DEVELOPER_CENTRAL_AUTH_DOMAIN;
const CENTRAL_PROJECT_ID = import.meta.env.VITE_DEVELOPER_CENTRAL_PROJECT_ID;
const CENTRAL_STORAGE_BUCKET = import.meta.env.VITE_DEVELOPER_CENTRAL_STORAGE_BUCKET;
const CENTRAL_MESSAGING_SENDER_ID = import.meta.env.VITE_DEVELOPER_CENTRAL_MESSAGING_SENDER_ID;
const CENTRAL_APP_ID = import.meta.env.VITE_DEVELOPER_CENTRAL_APP_ID;
const CLIENT_ID = import.meta.env.VITE_DEVELOPER_CLIENT_ID;

/**
 * Inicializa y retorna la instancia del Firestore Central de forma perezosa.
 */
function getCentralFirestore() {
  if (!CENTRAL_API_KEY || !CENTRAL_PROJECT_ID) {
    return null;
  }

  const appName = "centralDevApp";
  let centralApp;

  // Evitar duplicados de inicialización en Hot Reload
  if (getApps().some(app => app.name === appName)) {
    centralApp = getApp(appName);
  } else {
    centralApp = initializeApp({
      apiKey: CENTRAL_API_KEY,
      authDomain: CENTRAL_AUTH_DOMAIN,
      projectId: CENTRAL_PROJECT_ID,
      storageBucket: CENTRAL_STORAGE_BUCKET,
      messagingSenderId: CENTRAL_MESSAGING_SENDER_ID,
      appId: CENTRAL_APP_ID,
    }, appName);
  }

  return getFirestore(centralApp);
}

/**
 * Reporta los acumulados mensuales de la tienda al panel central del desarrollador.
 * Soporta de forma híbrida e inteligente:
 * - Modo Blaze (HTTP POST) si VITE_DEVELOPER_TELEMETRY_ENDPOINT está definido.
 * - Modo Spark (Conexión Directa Firestore) si no está el endpoint pero hay credenciales de base de datos.
 * 
 * @param {number} totalVentas - Monto total acumulado facturado en el mes.
 * @param {number} comisionPorcentaje - Porcentaje comisionado pactado con el desarrollador.
 * @param {string} periodo - Periodo formateado en año-mes (ej: "2026-05").
 */
export async function reportMonthlyBillingToDeveloper(totalVentas, comisionPorcentaje, periodo) {
  const comisionValor = (totalVentas * comisionPorcentaje) / 100;

  // 1. MODO BLAZE: HTTP Endpoint (Cloud Function)
  if (CENTRAL_ENDPOINT && DEV_TOKEN) {
    try {
      console.log("[Telemetry] Reportando vía Cloud Function...");
      const response = await fetch(CENTRAL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEV_TOKEN}`
        },
        body: JSON.stringify({
          clientId: CLIENT_ID || "desconocido",
          totalVentas,
          comisionPorcentaje,
          comisionValor,
          periodo
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("[Telemetry] Reporte HTTP enviado exitosamente:", data);
      return;
    } catch (error) {
      console.error("[Telemetry] Error en reporte HTTP:", error);
    }
  }

  // 2. MODO SPARK: Conexión directa a Firestore Central (Escritura segura)
  const centralDb = getCentralFirestore();
  if (centralDb && DEV_TOKEN && CLIENT_ID) {
    try {
      console.log("[Telemetry] Reportando vía Firestore Directo...");
      // Guardar el reporte usando una ID única (ej: cliente_periodo)
      const reportId = `${CLIENT_ID}_${periodo}`;
      const reportRef = doc(centralDb, "reportesBilling", reportId);

      await setDoc(reportRef, {
        clientId: CLIENT_ID,
        token: DEV_TOKEN, // Enviamos el token para validación por reglas de seguridad
        periodo,
        totalVentas,
        comisionPorcentaje,
        comisionValor,
        updatedAt: serverTimestamp(),
      });

      console.log("[Telemetry] Reporte Firestore directo enviado exitosamente.");
    } catch (error) {
      console.error("[Telemetry] Error en reporte Firestore directo:", error);
    }
    return;
  }

  console.warn("[Telemetry] Transmisión omitida: Faltan variables de configuración.");
}

