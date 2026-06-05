import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  runTransaction,
  onSnapshot,
  limit,
  startAfter,
  addDoc
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'
import { createCentralNotification, NC_TYPES, subscribeToAdminNotifications } from './notificationCenterService'

const creditsRef = collection(db, COLLECTIONS.CREDITS)

/**
 * Obtener todos los créditos (Para el Admin)
 */
export async function getCredits(estado = 'activo') {
  const q = query(creditsRef, where('estado', '==', estado))
  const snap = await getDocs(q)
  
  const credits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return credits.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
}

/**
 * Obtener los créditos de un cliente específico
 */
export async function getClientCredits(celular) {
  if (!celular) return []
  const q = query(creditsRef, where('cliente.celular', '==', celular))
  const snap = await getDocs(q)
  
  const credits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return credits.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
}

/**
 * Agregar un abono a una deuda.
 * Se usa una transacción para asegurar que el saldo restante es exacto
 * incluso si dos administradores abonan al tiempo.
 */
export async function addPaymentToCredit(creditId, paymentData) {
  const creditRef = doc(db, COLLECTIONS.CREDITS, creditId)
  let creditData = null

  await runTransaction(db, async (transaction) => {
    const creditDoc = await transaction.get(creditRef)
    if (!creditDoc.exists()) throw new Error('Crédito no encontrado')
    
    const data = creditDoc.data()
    creditData = data
    
    if (data.estado === 'pagado') {
      throw new Error('Esta deuda ya se encuentra totalmente pagada.')
    }
    
    const nuevoAbono = {
      monto: paymentData.monto,
      nota: paymentData.nota || '',
      fecha: new Date().toISOString(),
    }

    const nuevosAbonos = [...(data.abonos || []), nuevoAbono]
    const nuevoSaldo = Math.max(0, data.saldoPending || data.saldoPendiente - paymentData.monto)
    const nuevoEstado = nuevoSaldo === 0 ? 'pagado' : 'activo'

    transaction.update(creditRef, {
      abonos: nuevosAbonos,
      saldoPendiente: nuevoSaldo,
      estado: nuevoEstado,
      updatedAt: serverTimestamp()
    })

    // Si la deuda se liquida por completo, marcar el pedido original como COMPLETADO
    if (nuevoSaldo === 0 && data.orderId) {
      const orderRef = doc(db, COLLECTIONS.ORDERS, data.orderId)
      transaction.update(orderRef, {
        estado: 'completado',
        updatedAt: serverTimestamp()
      })
    }
  })

  // Crear notificación persistente para el cliente utilizando el Notification Center
  if (creditData && creditData.cliente?.celular) {
    await createCentralNotification({
      recipientId: creditData.cliente.celular,
      recipientRole: 'client',
      title: 'Abono Registrado',
      body: `Se aplicó un abono de $${paymentData.monto.toLocaleString()} a tu crédito para el pedido #${creditData.orderNumber || ''}.`,
      type: NC_TYPES.ABONO_RECIBIDO,
      orderId: creditData.orderId,
      orderNumber: creditData.orderNumber
    })
  }

  // Notificar al Admin en tiempo real sobre el abono/pago recibido
  if (creditData) {
    await createCentralNotification({
      recipientId: 'admin',
      recipientRole: 'admin',
      title: 'Abono Recibido',
      body: `Se ha registrado un abono de $${paymentData.monto.toLocaleString()} por parte de ${creditData.cliente?.nombre || 'Cliente'} para el pedido #${creditData.orderNumber || ''}.`,
      type: NC_TYPES.ABONO_RECIBIDO,
      orderId: creditData.orderId,
      orderNumber: creditData.orderNumber
    })
  }
}

/**
 * Se suscribe a todos los créditos en tiempo real (Para el Admin)
 */
export function subscribeToCredits(estado = 'activo', onUpdate) {
  const q = query(creditsRef, where('estado', '==', estado))
  return onSnapshot(q, (snap) => {
    const credits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const sorted = credits.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
    onUpdate(sorted)
  }, (error) => {
    console.error('[creditService] Error al escuchar créditos activos:', error)
    onUpdate([])
  })
}

/**
 * Se suscribe a los créditos de un cliente específico en tiempo real
 */
export function subscribeToClientCredits(celular, onUpdate) {
  if (!celular) {
    onUpdate([])
    return () => {}
  }
  const q = query(creditsRef, where('cliente.celular', '==', celular))
  return onSnapshot(q, (snap) => {
    const credits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const sorted = credits.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
    onUpdate(sorted)
  }, (error) => {
    console.error('[creditService] Error al escuchar créditos del cliente:', error)
    onUpdate([])
  })
}

/**
 * Obtener créditos paginados e indexados (Para el Admin)
 */
export async function getCreditsPaged(estado = 'activo', limitSize = 10, startAfterDoc = null) {
  const constraints = [
    where('estado', '==', estado),
    orderBy('createdAt', 'desc'),
    limit(limitSize)
  ]
  
  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc))
  }
  
  const q = query(creditsRef, ...constraints)
  const snap = await getDocs(q)
  
  const credits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return {
    credits,
    lastDoc: snap.docs[snap.docs.length - 1] || null
  }
}

/**
 * Registra una notificación de abono/pago de crédito en el Notification Center
 */
export async function reportCreditPayment({ creditId, monto, clienteNombre, clienteCelular, orderNumber, orderId }) {
  await createCentralNotification({
    recipientId: 'admin',
    recipientRole: 'admin',
    title: 'Reporte de Pago Recibido',
    body: `${clienteNombre} (${clienteCelular}) reportó un abono de $${monto.toLocaleString()} para el pedido #${orderNumber}.`,
    type: NC_TYPES.ABONO_RECIBIDO,
    orderId,
    orderNumber
  })
}

/**
 * Registra una notificación de abono/pago de crédito (compatibilidad legacy)
 */
export async function createCreditNotification(notificationData) {
  await createCentralNotification({
    recipientId: 'admin',
    recipientRole: 'admin',
    title: 'Abono de Crédito',
    body: `${notificationData.clienteNombre || 'Cliente'} abonó $${(notificationData.monto || 0).toLocaleString()}`,
    type: NC_TYPES.ABONO_RECIBIDO,
    orderId: notificationData.orderId || null,
    orderNumber: notificationData.orderNumber || null
  })
}

/**
 * Suscripción compatible legada a notificaciones de crédito (compatibilidad legacy)
 */
export function subscribeToNotifications(onUpdate) {
  return subscribeToAdminNotifications(onUpdate)
}
