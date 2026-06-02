import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, onSnapshot, orderBy
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

const COL = COLLECTIONS.EMPLOYEES

export async function saveEmployee(data) {
  const ref = data.id ? doc(db, COL, data.id) : doc(collection(db, COL))
  await setDoc(ref, {
    nombre: data.nombre || '',
    rol: data.rol || 'vendedor',
    pin: data.pin || '',
    activo: data.activo !== false,
    salario: Number(data.salario) || 0,
    frecuenciaPago: data.frecuenciaPago || 'quincenal',
    telefono: data.telefono || '',
    observaciones: data.observaciones || '',
    createdAt: data.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })
  return ref.id
}

export async function deleteEmployee(id) {
  await deleteDoc(doc(db, COL, id))
}

export async function getEmployee(id) {
  const snap = await getDoc(doc(db, COL, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getEmployees() {
  const snap = await getDocs(query(collection(db, COL), orderBy('nombre')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function subscribeToEmployees(callback) {
  const q = query(collection(db, COL), orderBy('nombre'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, error => {
    console.warn("[employeeService] Error en la suscripción a empleados:", error.message)
  })
}

/**
 * Autentica un empleado por PIN táctil (para /portal/auth).
 * @param {string} pin
 * @returns {Promise<object|null>}
 */
export async function authenticateEmployeeByPin(pin) {
  if (!pin) return null
  const q = query(collection(db, COL), where('pin', '==', pin), where('activo', '==', true))
  const snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0]
    return { id: d.id, ...d.data() }
  }
  return null
}

export async function toggleEmployeeStatus(id, activo) {
  await updateDoc(doc(db, COL, id), { activo, updatedAt: serverTimestamp() })
}

/**
 * Obtiene empleados filtrados por rol activos.
 * @param {string} rol
 * @returns {Promise<object[]>}
 */
export async function getEmployeesByRole(rol) {
  const q = query(
    collection(db, COL),
    where('rol', '==', rol),
    where('activo', '==', true),
    orderBy('nombre')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Autentica un empleado específico por su ID + PIN.
 * Más seguro que la búsqueda global por PIN.
 * @param {string} employeeId
 * @param {string} pin
 * @returns {Promise<object|null>}
 */
export async function authenticateEmployeeByIdAndPin(employeeId, pin) {
  if (!employeeId || !pin) return null
  const snap = await getDocs(
    query(
      collection(db, COL),
      where('__name__', '==', employeeId), // busca por doc ID
      where('pin', '==', pin),
      where('activo', '==', true)
    )
  )
  // Fallback: getDoc directo y comparar
  if (snap.empty) {
    const ref = doc(db, COL, employeeId)
    const d = await import('firebase/firestore').then(m => m.getDoc(ref))
    if (!d.exists()) return null
    const data = d.data()
    if (data.pin !== pin || !data.activo) return null
    return { id: d.id, ...data }
  }
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

/**
 * Suscripción a empleados de un rol específico en tiempo real.
 */
export function subscribeToEmployeesByRole(rol, callback) {
  const q = query(
    collection(db, COL),
    where('rol', '==', rol),
    where('activo', '==', true),
    orderBy('nombre')
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, error => {
    console.warn(`[employeeService] Error en la suscripción a empleados por rol (${rol}):`, error.message)
  })
}

