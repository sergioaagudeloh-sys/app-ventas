import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

const COL = COLLECTIONS.STOCK_MOVEMENTS

/**
 * Registra un movimiento de inventario (entrada, salida, ajuste).
 */
export async function registerStockMovement({ productId, productName, type, quantity, reason, employeeId, employeeName }) {
  await addDoc(collection(db, COL), {
    productId: productId || '',
    productName: productName || '',
    type, // 'entrada' | 'salida' | 'ajuste' | 'merma'
    quantity: Number(quantity),
    reason: reason || '',
    employeeId: employeeId || '',
    employeeName: employeeName || '',
    createdAt: serverTimestamp(),
  })
}

export async function getMovementsByProduct(productId) {
  const q = query(collection(db, COL), where('productId', '==', productId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getMovementsByEmployee(employeeId) {
  const q = query(collection(db, COL), where('employeeId', '==', employeeId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getRecentMovements(limitVal = 50) {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.slice(0, limitVal).map(d => ({ id: d.id, ...d.data() }))
}

export function subscribeToEmployeeMovements(employeeId, callback, maxItems = 50) {
  const q = query(
    collection(db, COL),
    where('employeeId', '==', employeeId),
    orderBy('createdAt', 'desc'),
    limit(maxItems)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(list)
  }, (error) => {
    console.error('[stockMovementService] Error subscribing to employee movements:', error)
    callback([])
  })
}

export function subscribeToAllMovements(callback, maxItems = 100) {
  const q = query(
    collection(db, COL),
    orderBy('createdAt', 'desc'),
    limit(maxItems)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(list)
  }, (error) => {
    console.error('[stockMovementService] Error subscribing to all movements:', error)
    callback([])
  })
}
