import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { updateAppConfig } from './appConfigService'
import { COLLECTIONS, ORDER_STATES } from '../constants'

const ordersRef = collection(db, COLLECTIONS.ORDERS)
const SETTINGS_REF = doc(db, 'config', 'settings')

/**
 * Guarda el nuevo porcentaje de comisión del desarrollador en Firestore.
 * @param {number} percent - Porcentaje (ej: 1, 2.5)
 */
export async function updateCommissionPercent(percent) {
  await updateAppConfig({ developerCommissionPercent: percent })
}

/**
 * Agrupa un array de pedidos completados por mes y calcula las métricas.
 * @param {Array} orders - Pedidos con estado 'completado'
 * @param {number} commissionPercent - Porcentaje de comisión
 * @returns {object} Métricas calculadas
 */
function calcMetrics(orders, commissionPercent) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-indexed

  // ─── Totales históricos ───────────────────────────────────────────
  const totalHistorico = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const comisionHistorica = (totalHistorico * commissionPercent) / 100

  // ─── Totales del mes en curso ─────────────────────────────────────
  const ordenesMes = orders.filter((o) => {
    if (!o.createdAt) return false
    const fecha = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)
    return fecha.getFullYear() === currentYear && fecha.getMonth() === currentMonth
  })
  const totalMes = ordenesMes.reduce((sum, o) => sum + (o.total || 0), 0)
  const comisionMes = (totalMes * commissionPercent) / 100
  const pedidosMes = ordenesMes.length

  // ─── Desglose últimos 6 meses ─────────────────────────────────────
  const MONTH_NAMES = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ]

  const desgloseMap = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    desgloseMap[key] = {
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      ventas: 0,
      pedidos: 0,
      comision: 0,
    }
  }

  orders.forEach((o) => {
    if (!o.createdAt) return
    const fecha = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)
    const key = `${fecha.getFullYear()}-${fecha.getMonth()}`
    if (desgloseMap[key]) {
      desgloseMap[key].ventas += o.total || 0
      desgloseMap[key].pedidos += 1
      desgloseMap[key].comision = (desgloseMap[key].ventas * commissionPercent) / 100
    }
  })

  // ─── Desglose por método de pago ──────────────────────────────────
  const pagoBreakdown = { efectivo: 0, transferencia: 0, credito: 0 }
  orders.forEach((o) => {
    const met = o.metodoPago || 'efectivo'
    if (pagoBreakdown[met] !== undefined) {
      pagoBreakdown[met] += o.total || 0
    } else {
      pagoBreakdown['efectivo'] += o.total || 0
    }
  })

  const desgloseMensual = Object.values(desgloseMap)

  return {
    totalHistorico,
    comisionHistorica,
    totalMes,
    comisionMes,
    pedidosMes,
    desgloseMensual,
    pagoBreakdown,
    commissionPercent,
  }
}

/**
 * Suscripción en tiempo real a las métricas de facturación.
 * Escucha pedidos completados y el porcentaje de comisión simultáneamente.
 * @param {function} onUpdate - Callback con las métricas calculadas
 * @returns {function} Función para cancelar ambas suscripciones
 */
export function subscribeToBillingData(onUpdate) {
  let latestOrders = []
  let latestPercent = 1

  // ─── Suscripción a pedidos completados ───────────────────────────
  const qOrders = query(
    ordersRef,
    where('estado', '==', ORDER_STATES.COMPLETED),
    orderBy('createdAt', 'desc')
  )

  const unsubOrders = onSnapshot(qOrders, (snap) => {
    latestOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    onUpdate(calcMetrics(latestOrders, latestPercent))
  })

  // ─── Suscripción al porcentaje de configuración ───────────────────
  const unsubSettings = onSnapshot(SETTINGS_REF, (snap) => {
    if (snap.exists()) {
      latestPercent = snap.data().developerCommissionPercent ?? 1
      onUpdate(calcMetrics(latestOrders, latestPercent))
    }
  })

  // Retorna función que cancela ambas suscripciones
  return () => {
    unsubOrders()
    unsubSettings()
  }
}
