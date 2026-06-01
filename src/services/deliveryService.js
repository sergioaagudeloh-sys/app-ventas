import { collection, doc, getDocs, setDoc, updateDoc, serverTimestamp, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

const COL = COLLECTIONS.DELIVERIES

/**
 * Registra un nuevo pedido en la cola de domicilios.
 */
export async function queueDelivery({ orderId, orderNumber, address, clientName, phone, mensajeroId = null, items = [] }) {
  const ref = doc(db, COL, orderId)
  await setDoc(ref, {
    orderId,
    orderNumber: orderNumber || '',
    address: address || '',
    clientName: clientName || '',
    phone: phone || '',
    mensajeroId,
    items,
    estado: 'pendiente', // 'pendiente' | 'asignado' | 'en_camino' | 'entregado' | 'fallido'
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function assignDelivery(orderId, mensajeroId) {
  const ref = doc(db, COL, orderId)
  await updateDoc(ref, {
    mensajeroId,
    estado: 'asignado',
    updatedAt: serverTimestamp(),
  })
}

export async function updateDeliveryStatus(orderId, estado) {
  const ref = doc(db, COL, orderId)
  await updateDoc(ref, { estado, updatedAt: serverTimestamp() })
}

export async function getPendingDeliveries() {
  const q = query(collection(db, COL), where('estado', 'in', ['pendiente', 'asignado', 'en_camino']), orderBy('createdAt'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function subscribeToDeliveries(callback, mensajeroId = null) {
  const q = mensajeroId
    ? query(collection(db, COL), where('mensajeroId', '==', mensajeroId), where('estado', 'in', ['asignado', 'en_camino']))
    : query(collection(db, COL), where('estado', 'in', ['pendiente', 'asignado', 'en_camino']))
  return onSnapshot(q, snap => {
    // Ordenar localmente por createdAt descendiente para evitar la necesidad de un índice compuesto en Firestore
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    data.sort((a, b) => {
      const tA = a.createdAt?.seconds || 0
      const tB = b.createdAt?.seconds || 0
      return tA - tB
    })
    callback(data)
  })
}
