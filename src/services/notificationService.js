import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'

/**
 * Obtiene las métricas y el historial reciente de notificaciones del sistema.
 * @param {number} recentLimit - Cantidad de notificaciones recientes a traer (por defecto 10)
 * @returns {Promise<{ stats: object, recentNotifications: Array }>}
 */
export async function getNotificationAnalytics(recentLimit = 10) {
  const [notifSnap, tokenSnap] = await Promise.all([
    getDocs(collection(db, 'notifications')),
    getDocs(collection(db, 'fcmTokens')),
  ])

  let read = 0
  let unread = 0
  notifSnap.docs.forEach(doc => {
    const data = doc.data()
    if (data.status === 'read') read++
    if (data.status === 'unread') unread++
  })

  const stats = {
    total: notifSnap.size,
    read,
    unread,
    fcmTokens: tokenSnap.size,
  }

  const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(recentLimit))
  const qSnap = await getDocs(q)
  const recentNotifications = qSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  return { stats, recentNotifications }
}
