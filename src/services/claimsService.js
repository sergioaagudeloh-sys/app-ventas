import {
  collection,
  doc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'
import { createCentralNotification, NC_TYPES } from './notificationCenterService'

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
 * Registra un reclamo de cliente y notifica al Admin mediante el Notification Center
 */
export async function createClientClaim({ orderId, orderNumber, clientName, clientCelular, reason, description }) {
  const ref = await addDoc(claimsRef, {
    orderId,
    orderNumber,
    clientName,
    clientCelular,
    reason,
    description,
    status: 'PENDING',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  // Notificar al Admin en tiempo real
  await createCentralNotification({
    recipientId: 'admin',
    recipientRole: 'admin',
    title: 'Nuevo Reclamo Recibido',
    body: `Reclamo de ${clientName} (${clientCelular}) para el pedido #${orderNumber}. Motivo: ${reason}`,
    type: NC_TYPES.RECLAMO_NUEVO,
    orderId,
    orderNumber
  })

  return ref.id
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

/**
 * Crea un reclamo con un payload completo y flexible (para ClaimRequestModal).
 * A diferencia de createClientClaim, acepta el objeto completo con productos detallados.
 * @param {object} payload - Datos completos del reclamo
 * @returns {Promise<string>} ID del documento creado
 */
export async function createClaim(payload) {
  const ref = await addDoc(claimsRef, payload)
  return ref.id
}
