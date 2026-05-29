import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'

const clientNotificationsRef = collection(db, 'clientNotifications')

/**
 * Crea una notificación persistente para el cliente en Firestore.
 */
export async function createClientNotification({ clienteCelular, message, type, orderId = null }) {
  if (!clienteCelular || clienteCelular === 'Desconocido') return
  try {
    await addDoc(clientNotificationsRef, {
      clienteCelular,
      message,
      type,
      orderId,
      leida: false,
      createdAt: serverTimestamp()
    })
  } catch (error) {
    console.error('[clientNotificationService] Error al crear notificación de cliente:', error)
  }
}

/**
 * Se suscribe a las notificaciones activas (no leídas) de un cliente en tiempo real.
 */
export function subscribeToClientNotifications(clienteCelular, onUpdate) {
  if (!clienteCelular) {
    onUpdate([])
    return () => {}
  }
  
  const q = query(
    clientNotificationsRef,
    where('clienteCelular', '==', clienteCelular),
    where('leida', '==', false)
  )

  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Ordenar localmente por fecha de creación descendente para evitar el requisito de índice compuesto
    notifications.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
      return dateB - dateA
    })

    onUpdate(notifications)
  }, (error) => {
    console.error('[clientNotificationService] Error suscribiendo a notificaciones del cliente:', error)
  })
}

/**
 * Marca una notificación como leída.
 */
export async function markNotificationAsRead(id) {
  try {
    const docRef = doc(db, 'clientNotifications', id)
    await updateDoc(docRef, { leida: true })
  } catch (error) {
    console.error('[clientNotificationService] Error al marcar notificación como leída:', error)
  }
}

/**
 * Marca todas las notificaciones de un cliente como leídas.
 */
export async function clearAllClientNotifications(clienteCelular) {
  if (!clienteCelular) return
  try {
    const q = query(
      clientNotificationsRef,
      where('clienteCelular', '==', clienteCelular),
      where('leida', '==', false)
    )
    const snap = await getDocs(q)
    const batch = writeBatch(db)
    snap.docs.forEach(d => {
      batch.update(d.ref, { leida: true })
    })
    await batch.commit()
  } catch (error) {
    console.error('[clientNotificationService] Error al limpiar todas las notificaciones:', error)
  }
}
