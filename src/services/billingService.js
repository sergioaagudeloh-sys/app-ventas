import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  orderBy,
  getFirestore,
} from 'firebase/firestore'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { db } from '../config/firebaseConfig'
import { updateAppConfig } from './appConfigService'
import { COLLECTIONS, ORDER_STATES } from '../constants'

const ordersRef = collection(db, COLLECTIONS.ORDERS)
const SETTINGS_REF = doc(db, 'config', 'settings')

// Variables de entorno para conectar al Firebase Central de Control (Spark mode)
const CENTRAL_API_KEY = import.meta.env.VITE_DEVELOPER_CENTRAL_API_KEY;
const CENTRAL_PROJECT_ID = import.meta.env.VITE_DEVELOPER_CENTRAL_PROJECT_ID;
const CLIENT_ID = import.meta.env.VITE_DEVELOPER_CLIENT_ID;

/**
 * Inicializa y retorna la instancia del Firestore Central de forma perezosa.
 */
function getCentralFirestore() {
  if (!CENTRAL_API_KEY || !CENTRAL_PROJECT_ID) {
    return null;
  }
  const appName = "centralDevApp";
  try {
    let app;
    if (getApps().some(a => a.name === appName)) {
      app = getApp(appName);
    } else {
      app = initializeApp({
        apiKey: CENTRAL_API_KEY,
        authDomain: import.meta.env.VITE_DEVELOPER_CENTRAL_AUTH_DOMAIN,
        projectId: CENTRAL_PROJECT_ID,
        storageBucket: import.meta.env.VITE_DEVELOPER_CENTRAL_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_DEVELOPER_CENTRAL_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_DEVELOPER_CENTRAL_APP_ID,
      }, appName);
    }
    return getFirestore(app);
  } catch (err) {
    console.error("Error inicializando Firebase Central en Billing:", err);
    return null;
  }
}

/**
 * Guarda el nuevo porcentaje de comisión del desarrollador en Firestore.
 * @param {number} percent - Porcentaje (ej: 1, 2.5)
 */
export async function updateCommissionPercent(percent) {
  // Guardar en config local de la app
  await updateAppConfig({ developerCommissionPercent: percent })
}

/**
 * Agrupa un array de pedidos completados por mes y calcula las métricas.
 * @param {Array} orders - Pedidos con estado 'completado'
 * @param {number} commissionPercent - Porcentaje de comisión
 * @returns {object} Métricas calculadas
 */
/**
 * Agrupa un array de pedidos completados por mes y calcula las métricas.
 * @param {Array} orders - Pedidos con estado 'completado'
 * @param {object} billingConfig - Configuración de facturación del cliente
 * @returns {object} Métricas calculadas
 */
function calcMetrics(orders, billingConfig) {
  const {
    billingMode = 'percentage',
    comisionPorcentaje = 1,
    montoFijoServicio = 0,
    pagoMensualFijo = 0,
    enableDianBilling = false,
    costoPorFacturaDian = 0
  } = billingConfig || {}

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-indexed

  // Función helper para calcular comisión de un pedido individual
  const getPedidoComision = (o) => {
    if (billingMode === 'flat_monthly') return 0;
    const baseComisionable = enableDianBilling ? (o.subtotal || o.total || 0) : (o.total || 0);
    let comision = 0;
    if (billingMode === 'percentage') {
      comision = (baseComisionable * comisionPorcentaje) / 100;
    } else if (billingMode === 'fixed_per_service') {
      comision = montoFijoServicio;
    }
    
    // Sumar tarifa de procesamiento DIAN si aplica
    if (enableDianBilling && o.requiereFacturaElectronica) {
      comision += costoPorFacturaDian;
    }
    return comision;
  };

  // ─── Totales del mes en curso ─────────────────────────────────────
  const ordenesMes = orders.filter((o) => {
    if (!o.createdAt) return false
    const fecha = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)
    return fecha.getFullYear() === currentYear && fecha.getMonth() === currentMonth
  })
  const totalMes = ordenesMes.reduce((sum, o) => sum + (o.total || 0), 0)
  const pedidosMes = ordenesMes.length

  let comisionMes = 0
  if (billingMode === 'flat_monthly') {
    comisionMes = pagoMensualFijo
  } else {
    comisionMes = ordenesMes.reduce((sum, o) => sum + getPedidoComision(o), 0)
  }

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
      if (billingMode !== 'flat_monthly') {
        desgloseMap[key].comision += getPedidoComision(o)
      }
    }
  })

  // Calcular la comisión de tarifa plana si aplica
  if (billingMode === 'flat_monthly') {
    Object.keys(desgloseMap).forEach((key) => {
      const item = desgloseMap[key]
      const [y, m] = key.split('-').map(Number)
      const isCurrent = y === currentYear && m === currentMonth
      if (item.pedidos > 0 || isCurrent) {
        item.comision = pagoMensualFijo
      } else {
        item.comision = 0
      }
    })
  }

  // ─── Totales históricos ───────────────────────────────────────────
  const totalHistorico = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  let comisionHistorica = 0
  if (billingMode === 'flat_monthly') {
    const activeMonths = new Set()
    orders.forEach((o) => {
      if (!o.createdAt) return
      const fecha = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)
      activeMonths.add(`${fecha.getFullYear()}-${fecha.getMonth()}`)
    })
    activeMonths.add(`${currentYear}-${currentMonth}`)
    comisionHistorica = activeMonths.size * pagoMensualFijo
  } else {
    comisionHistorica = orders.reduce((sum, o) => sum + getPedidoComision(o), 0)
  }

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
    billingMode,
    comisionPorcentaje,
    montoFijoServicio,
    pagoMensualFijo,
    enableDianBilling,
    costoPorFacturaDian
  }
}

/**
 * Suscripción en tiempo real a las métricas de facturación.
 * Escucha pedidos completados y la configuración de facturación simultáneamente.
 * @param {function} onUpdate - Callback con las métricas calculadas
 * @returns {function} Función para cancelar ambas suscripciones
 */
export function subscribeToBillingData(onUpdate) {
  let latestOrders = []
  let latestConfig = {
    billingMode: 'percentage',
    comisionPorcentaje: 1,
    montoFijoServicio: 0,
    pagoMensualFijo: 0,
    enableDianBilling: false,
    costoPorFacturaDian: 0
  }

  // ─── Suscripción a pedidos completados ───────────────────────────
  const qOrders = query(
    ordersRef,
    where('estado', '==', ORDER_STATES.COMPLETED),
    orderBy('createdAt', 'desc')
  )

  const unsubOrders = onSnapshot(qOrders, (snap) => {
    latestOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    onUpdate(calcMetrics(latestOrders, latestConfig))
  })

  // ─── Suscripción a la configuración de facturación ───────────────────
  const centralDb = getCentralFirestore()
  let unsubSettings = () => {}

  if (centralDb && CLIENT_ID) {
    console.log(`[Billing] Escuchando configuración de facturación en vivo desde central para ${CLIENT_ID}...`)
    const centralClientRef = doc(centralDb, 'clientes_saas', CLIENT_ID)
    unsubSettings = onSnapshot(centralClientRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        latestConfig = {
          billingMode: data.billingMode || 'percentage',
          comisionPorcentaje: data.comisionPorcentaje ?? 1,
          montoFijoServicio: data.montoFijoServicio ?? 0,
          pagoMensualFijo: data.pagoMensualFijo ?? 0,
          enableDianBilling: data.enableDianBilling === true,
          costoPorFacturaDian: data.costoPorFacturaDian ?? 0
        }
      } else {
        latestConfig = {
          billingMode: 'percentage',
          comisionPorcentaje: 1,
          montoFijoServicio: 0,
          pagoMensualFijo: 0,
          enableDianBilling: false,
          costoPorFacturaDian: 0
        }
      }
      onUpdate(calcMetrics(latestOrders, latestConfig))
    }, (err) => {
      console.warn("[Billing] Fallo al leer configuración central, usando fallback local:", err)
      onSnapshot(SETTINGS_REF, (localSnap) => {
        if (localSnap.exists()) {
          const data = localSnap.data()
          latestConfig = {
            billingMode: data.developerBillingMode || 'percentage',
            comisionPorcentaje: data.developerCommissionPercent ?? 1,
            montoFijoServicio: data.developerFixedServiceFee ?? 0,
            pagoMensualFijo: data.developerFlatMonthlyFee ?? 0,
            enableDianBilling: data.enableDianBilling === true,
            costoPorFacturaDian: data.costoPorFacturaDian ?? 0
          }
          onUpdate(calcMetrics(latestOrders, latestConfig))
        }
      })
    })
  } else {
    unsubSettings = onSnapshot(SETTINGS_REF, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        latestConfig = {
          billingMode: data.developerBillingMode || 'percentage',
          comisionPorcentaje: data.developerCommissionPercent ?? 1,
          montoFijoServicio: data.developerFixedServiceFee ?? 0,
          pagoMensualFijo: data.developerFlatMonthlyFee ?? 0,
          enableDianBilling: data.enableDianBilling === true,
          costoPorFacturaDian: data.costoPorFacturaDian ?? 0
        }
        onUpdate(calcMetrics(latestOrders, latestConfig))
      }
    })
  }

  return () => {
    unsubOrders()
    unsubSettings()
  }
}
