import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Variables de entorno para conectar al Firebase Central de Control
const CENTRAL_API_KEY = import.meta.env.VITE_DEVELOPER_CENTRAL_API_KEY;
const CENTRAL_AUTH_DOMAIN = import.meta.env.VITE_DEVELOPER_CENTRAL_AUTH_DOMAIN;
const CENTRAL_PROJECT_ID = import.meta.env.VITE_DEVELOPER_CENTRAL_PROJECT_ID;
const CENTRAL_STORAGE_BUCKET = import.meta.env.VITE_DEVELOPER_CENTRAL_STORAGE_BUCKET;
const CENTRAL_MESSAGING_SENDER_ID = import.meta.env.VITE_DEVELOPER_CENTRAL_MESSAGING_SENDER_ID;
const CENTRAL_APP_ID = import.meta.env.VITE_DEVELOPER_CENTRAL_APP_ID;

const appName = "centralDevApp";
let centralDbInstance = null;

/**
 * Inicializa y retorna la instancia del Firestore Central de forma segura y unificada.
 */
export function getCentralFirestore() {
  if (!CENTRAL_API_KEY || !CENTRAL_PROJECT_ID) {
    console.warn("[CentralFirebase] Falta configuración de Firebase Central de Control.");
    return null;
  }

  if (centralDbInstance) {
    return centralDbInstance;
  }

  try {
    let app;
    if (getApps().some(a => a.name === appName)) {
      app = getApp(appName);
    } else {
      app = initializeApp({
        apiKey: CENTRAL_API_KEY,
        authDomain: CENTRAL_AUTH_DOMAIN,
        projectId: CENTRAL_PROJECT_ID,
        storageBucket: CENTRAL_STORAGE_BUCKET,
        messagingSenderId: CENTRAL_MESSAGING_SENDER_ID,
        appId: CENTRAL_APP_ID,
      }, appName);
      console.log("[CentralFirebase] App secundaria centralDevApp inicializada con éxito.");
    }
    centralDbInstance = getFirestore(app);
    return centralDbInstance;
  } catch (err) {
    console.error("[CentralFirebase] Error al inicializar Firebase Central:", err);
    return null;
  }
}
