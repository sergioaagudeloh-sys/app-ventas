import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  orderBy
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'

const qrAnalyticsRef = collection(db, 'qrAnalytics')

/**
 * Registra un evento de analítica de código QR.
 * @param {string} productId - ID del producto
 * @param {string} eventType - Tipo de evento: 'scan' | 'view' | 'cart_add' | 'checkout_start' | 'purchase' | 'quote' | 'reserve'
 * @param {object} metadata - Información adicional del evento
 */
export async function trackQREvent(productId, eventType, metadata = {}) {
  try {
    await addDoc(qrAnalyticsRef, {
      productId,
      eventType,
      metadata,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      referrer: document.referrer || ''
    })
  } catch (error) {
    console.error('[QR Analytics] Error trackQREvent:', error)
  }
}

/**
 * Obtiene todos los eventos de analítica QR.
 */
export async function getQRAnalyticsData() {
  try {
    const snap = await getDocs(qrAnalyticsRef)
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('[QR Analytics] Error getQRAnalyticsData:', error)
    return []
  }
}
