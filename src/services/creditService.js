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

const creditsRef = collection(db, COLLECTIONS.CREDITS)
const notificationsRef = collection(db, 'notifications')

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
  const q = query(creditsRef, where('clienteCelular', '==', celular))
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

  await runTransaction(db, async (transaction) => {
    const creditDoc = await transaction.get(creditRef)
    if (!creditDoc.exists()) throw new Error('Crédito no encontrado')
    
    const data = creditDoc.data()
    
    if (data.estado === 'pagado') {
      throw new Error('Esta deuda ya se encuentra totalmente pagada.')
    }
    
    const nuevoAbono = {
      monto: paymentData.monto,
      nota: paymentData.nota || '',
      fecha: new Date().toISOString(), // Usamos string local para arrays en Firebase
    }

    const nuevosAbonos = [...(data.abonos || []), nuevoAbono]
    const nuevoSaldo = Math.max(0, data.saldoPendiente - paymentData.monto)
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
  const q = query(creditsRef, where('clienteCelular', '==', celular))
  return onSnapshot(q, (snap) => {
    const credits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const sorted = credits.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
    onUpdate(sorted)
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
 * Registra una notificación de abono/pago de crédito en Firestore
 */
export async function createCreditNotification(notificationData) {
  try {
    await addDoc(notificationsRef, {
      ...notificationData,
      createdAt: serverTimestamp(),
      leida: false
    })
  } catch (error) {
    console.error('Error al crear notificación de crédito:', error)
  }
}

/**
 * Se suscribe a las notificaciones en tiempo real (para el Admin)
 */
export function subscribeToNotifications(onUpdate) {
  const q = query(notificationsRef, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    onUpdate(notifications)
  }, (error) => {
    console.error('Error suscribiendo a notificaciones:', error)
  })
}

