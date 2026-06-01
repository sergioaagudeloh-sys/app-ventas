import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy } from 'firebase/firestore'
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

export async function getRecentMovements(limit = 50) {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.slice(0, limit).map(d => ({ id: d.id, ...d.data() }))
}
