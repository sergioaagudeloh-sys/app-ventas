/**
 * accessLogService.js
 * Servicio de registro de accesos y sesiones del sistema de portales operativos.
 * Gestiona: login/logout de empleados, historial de accesos, sesiones activas.
 */
import {
  collection, doc, addDoc, updateDoc,
  query, where, orderBy, limit,
  onSnapshot, serverTimestamp, getDocs, Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

const COL = COLLECTIONS.ACCESS_LOGS

/**
 * Registra un evento de LOGIN y devuelve el ID del documento creado.
 */
export async function logLogin(employee) {
  const ref = await addDoc(collection(db, COL), {
    employeeId:   employee.id,
    employeeName: employee.nombre || '',
    rol:          employee.rol || '',
    portal:       `/portal/${employee.rol}`,
    action:       'login',
    sessionStart: serverTimestamp(),
    sessionEnd:   null,
    device:       navigator.userAgent?.slice(0, 200) || '',
    createdAt:    serverTimestamp(),
  })
  return ref.id
}

/**
 * Cierra la sesión marcando sessionEnd en el log.
 */
export async function logLogout(logId) {
  if (!logId) return
  try {
    await updateDoc(doc(db, COL, logId), {
      action:     'logout',
      sessionEnd: serverTimestamp(),
    })
  } catch {
    // silencioso si el log ya no existe
  }
}

/**
 * Suscripción en tiempo real a sesiones ACTIVAS (sessionEnd === null).
 */
export function subscribeToActiveSessions(callback) {
  const q = query(
    collection(db, COL),
    where('sessionEnd', '==', null),
    where('action', '==', 'login'),
    orderBy('sessionStart', 'desc')
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

/**
 * Suscripción a los N accesos más recientes (historial).
 */
export function subscribeToRecentLogs(callback, limitCount = 100) {
  const q = query(
    collection(db, COL),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

/**
 * Obtiene estadísticas del día actual para el panel de monitoreo.
 * @returns {{ total, byRol, topEmployee }}
 */
export async function getDayStats() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const q = query(
    collection(db, COL),
    where('action', '==', 'login'),
    where('createdAt', '>=', Timestamp.fromDate(startOfDay))
  )
  const snap = await getDocs(q)
  const logs = snap.docs.map(d => d.data())

  const byRol = {}
  const byEmployee = {}

  logs.forEach(l => {
    byRol[l.rol] = (byRol[l.rol] || 0) + 1
    const k = `${l.employeeId}__${l.employeeName}`
    byEmployee[k] = (byEmployee[k] || 0) + 1
  })

  let topEmployee = null
  let max = 0
  Object.entries(byEmployee).forEach(([k, count]) => {
    if (count > max) {
      max = count
      const [, name] = k.split('__')
      topEmployee = { name, count }
    }
  })

  return { total: logs.length, byRol, topEmployee }
}
