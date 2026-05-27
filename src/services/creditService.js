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
  onSnapshot
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

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
