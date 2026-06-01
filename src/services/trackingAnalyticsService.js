import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'

const COLLECTION_NAME = 'trackingAnalytics'

/**
 * Registra un evento de analítica / telemetría de seguimiento de un pedido.
 * 
 * @param {string} orderId - ID interno del pedido
 * @param {string} orderNumber - Número del pedido (Ej. PED-1001)
 * @param {'qr_generate' | 'scan' | 'link_open' | 'whatsapp_share' | 'catalog_click' | 'app_download_click' | 'recompra_click'} eventType - Tipo de interacción
 * @param {object} [extraData] - Datos adicionales útiles para marketing
 */
export async function trackTrackingEvent(orderId, orderNumber, eventType, extraData = {}) {
  try {
    const payload = {
      orderId,
      orderNumber,
      eventType,
      extraData,
      userAgent: navigator.userAgent || 'unknown',
      createdAt: serverTimestamp()
    }
    
    await addDoc(collection(db, COLLECTION_NAME), payload)
  } catch (error) {
    console.error('[trackTrackingEvent] Error al guardar telemetría:', error)
  }
}

/**
 * Obtiene todas las métricas agregadas de conversión y telemetría de seguimiento.
 * Exclusivo para administradores.
 * 
 * @returns {Promise<{
 *   qrGenerados: number,
 *   accesosQR: number,
 *   accesosEnlace: number,
 *   sharesWa: number,
 *   clicsTienda: number,
 *   clicsApp: number
 * }>}
 */
export async function getTrackingMetrics() {
  try {
    const q = query(collection(db, COLLECTION_NAME))
    const snap = await getDocs(q)
    
    const metrics = {
      qrGenerados: 0,
      accesosQR: 0,
      accesosEnlace: 0,
      sharesWa: 0,
      clicsTienda: 0,
      clicsApp: 0
    }
    
    snap.docs.forEach(doc => {
      const data = doc.data()
      if (data.eventType === 'qr_generate') metrics.qrGenerados++
      else if (data.eventType === 'scan') metrics.accesosQR++
      else if (data.eventType === 'link_open') metrics.accesosEnlace++
      else if (data.eventType === 'whatsapp_share') metrics.sharesWa++
      else if (data.eventType === 'catalog_click') metrics.clicsTienda++
      else if (data.eventType === 'app_download_click') metrics.clicsApp++
    })
    
    return metrics
  } catch (error) {
    console.error('[getTrackingMetrics] Error:', error)
    return {
      qrGenerados: 0,
      accesosQR: 0,
      accesosEnlace: 0,
      sharesWa: 0,
      clicsTienda: 0,
      clicsApp: 0
    }
  }
}
