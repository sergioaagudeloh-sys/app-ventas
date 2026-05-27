import {
  collection,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

const wholesaleRef = collection(db, COLLECTIONS.WHOLESALE_ORDERS)

/**
 * Se suscribe a todas las solicitudes al por mayor en tiempo real (para Admin).
 */
export function subscribeToWholesaleRequests(onUpdate) {
  const q = query(wholesaleRef, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    onUpdate(requests)
  }, (error) => {
    console.error("Error subscribiendo a solicitudes al por mayor:", error)
  })
}

/**
 * Actualiza el estado de una solicitud al por mayor.
 */
export async function updateWholesaleRequestStatus(id, newStatus) {
  const docRef = doc(db, COLLECTIONS.WHOLESALE_ORDERS, id)
  await updateDoc(docRef, {
    estado: newStatus,
    updatedAt: new Date()
  })
}
