import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

const claimsRef = collection(db, COLLECTIONS.CLAIMS || 'claims')

/**
 * Se suscribe a todos los reclamos en tiempo real.
 * @param {function} onUpdate - Callback con los reclamos actualizados
 * @returns {function} Función para cancelar la suscripción
 */
export function subscribeToClaims(onUpdate) {
  const q = query(claimsRef, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const claims = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    onUpdate(claims)
  })
}

/**
 * Actualiza el estado de un reclamo en Firestore.
 * @param {string} claimId - ID del documento del reclamo
 * @param {string} status - Nuevo estado ('APPROVED' o 'REJECTED')
 * @param {string} adminNotes - Notas escritas por el administrador
 */
export async function updateClaimStatus(claimId, status, adminNotes = '') {
  const docRef = doc(db, COLLECTIONS.CLAIMS || 'claims', claimId)
  await updateDoc(docRef, {
    status,
    adminNotes,
    updatedAt: serverTimestamp()
  })
}
