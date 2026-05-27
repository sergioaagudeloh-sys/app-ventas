import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'

/** Ruta del documento de configuración global en Firestore */
const SETTINGS_REF = doc(db, 'config', 'settings')
const FILTERS_REF = doc(db, 'config', 'catalogFilters')

/**
 * Configuración por defecto que se crea si Firestore está vacío.
 * (Primera vez que se abre la app)
 */
const DEFAULT_SETTINGS = {
  appName: 'Mi Tienda',
  sellerName: 'Vendedor',
  appIcon: '',
  theme: 'rosa-elegante',
  whatsappAdmin: '',
  bankInfo: {
    numeroCuenta: '',
    banco: '',
    tipoCuenta: 'ahorros',
  },
  adminRegistered: false,
  // ─── Apariencia avanzada ───────────────────────────────────────────
  appFont: 'inter',
  appRadius: 'rounded',
  catalogBanner: { type: 'none', value: '' },
  catalogLayout: 'grid2',
  animationsEnabled: true,
  actionColor: '',
  deliverySettings: {
    pickup: {
      enabled: true,
      address: '',
      instructions: 'Recoge tu pedido directamente en nuestro local.'
    },
    shipping: {
      enabled: true,
      cost: 0,
      estimatedTime: '30 a 60 min',
      instructions: 'Recibe tu pedido en la comodidad de tu casa.'
    },
    digital: {
      enabled: false,
      instructions: 'Entrega digital o prestación de servicio presencial.'
    }
  },
  wholesaleSettings: {
    enabled: true,
    minQuantity: 12,
    discountType: 'percentage', // 'percentage' | 'fixed'
    discountValue: 15
  },
  updatedAt: null,
}

const DEFAULT_FILTERS = {
  gender: true,
  sizes: true,
  colors: true,
  brand: false,
  material: false,
  categories: true,
}

/**
 * Obtiene la configuración actual de Firestore una sola vez.
 * Si no existe, la inicializa con los valores por defecto.
 * @returns {Promise<object>} Configuración de la app
 */
export async function getAppConfig() {
  const snap = await getDoc(SETTINGS_REF)
  if (!snap.exists()) {
    await setDoc(SETTINGS_REF, {
      ...DEFAULT_SETTINGS,
      updatedAt: serverTimestamp(),
    })
    return DEFAULT_SETTINGS
  }
  return snap.data()
}

/**
 * Actualiza la configuración general de la app en Firestore.
 * @param {object} updates - Campos a actualizar (parcial)
 */
export async function updateAppConfig(updates) {
  await setDoc(
    SETTINGS_REF,
    { ...updates, updatedAt: serverTimestamp() },
    { merge: true }
  )
}

/**
 * Actualiza los filtros del catálogo en Firestore.
 * @param {object} filters - Mapa de filtros activos/inactivos
 */
export async function updateCatalogFilters(filters) {
  await setDoc(FILTERS_REF, filters, { merge: true })
}

/**
 * Escucha cambios en tiempo real de la configuración.
 * @param {function} onUpdate - Callback con la config actualizada
 * @returns {function} Función para cancelar la suscripción
 */
export function subscribeToAppConfig(onUpdate) {
  return onSnapshot(SETTINGS_REF, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data())
    }
  })
}

/**
 * Escucha cambios en tiempo real de los filtros del catálogo.
 * @param {function} onUpdate - Callback con los filtros actualizados
 * @returns {function} Función para cancelar la suscripción
 */
export function subscribeToCatalogFilters(onUpdate) {
  return onSnapshot(FILTERS_REF, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data())
    } else {
      onUpdate(DEFAULT_FILTERS)
    }
  })
}
