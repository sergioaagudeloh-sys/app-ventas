import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, query, orderBy, where } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

const COL = COLLECTIONS.TABLES

export async function createTable(data) {
  const ref = doc(collection(db, COL))
  await setDoc(ref, {
    nombre: data.nombre || '',
    capacidad: Number(data.capacidad) || 4,
    ubicacion: data.ubicacion || '',
    observaciones: data.observaciones || '',
    estado: 'disponible',
    pedidoActivoId: null,
    meseroAsignadoId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTable(id, data) {
  const ref = doc(db, COL, id)
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteTable(id) {
  await deleteDoc(doc(db, COL, id))
}

export async function getTables() {
  const snap = await getDocs(query(collection(db, COL), orderBy('nombre')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Suscripción en tiempo real a todas las mesas */
export function subscribeToTables(callback) {
  const q = query(collection(db, COL), orderBy('nombre'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function openTable(tableId, meseroId) {
  await updateDoc(doc(db, COL, tableId), {
    estado: 'ocupada',
    meseroAsignadoId: meseroId || null,
    updatedAt: serverTimestamp(),
  })
}

export async function requestService(tableId, tableName, type) {
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
  const { db } = await import('../config/firebaseConfig')
  await addDoc(collection(db, 'tableRequests'), {
    tableId,
    tableName,
    type, // 'llamado' | 'cuenta'
    status: 'pendiente',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function requestTableBill(tableId, tableName) {
  await updateDoc(doc(db, COL, tableId), {
    estado: 'solicitando_cuenta',
    updatedAt: serverTimestamp(),
  })
  if (tableName) {
    await requestService(tableId, tableName, 'cuenta')
  }
}

export async function closeTable(tableId) {
  await updateDoc(doc(db, COL, tableId), {
    estado: 'disponible',
    pedidoActivoId: null,
    meseroAsignadoId: null,
    updatedAt: serverTimestamp(),
  })
}

export function subscribeToTableRequests(callback) {
  const q = query(
    collection(db, 'tableRequests'),
    where('status', '==', 'pendiente')
  )
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => {
      const tA = a.createdAt?.seconds || 0
      const tB = b.createdAt?.seconds || 0
      return tB - tA
    })
    callback(list)
  })
}

export async function resolveTableRequest(requestId, meseroId) {
  const ref = doc(db, 'tableRequests', requestId)
  await updateDoc(ref, {
    status: 'atendido',
    meseroId: meseroId || null,
    updatedAt: serverTimestamp(),
  })
}
