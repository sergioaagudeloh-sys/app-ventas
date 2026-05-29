import {
  collection,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'
import { createClientNotification } from './clientNotificationService'

const wholesaleRef = collection(db, COLLECTIONS.WHOLESALE_ORDERS)

/**
 * Obtiene solicitudes especiales paginadas para el administrador.
 */
export async function getWholesaleRequestsPaged(tipoFilter, statusFilter = 'Todos', limitSize = 10, startAfterDoc = null) {
  const constraints = []

  // Filtro de tipo obligatoriamente para usar los índices correctamente
  constraints.push(where('tipo', '==', tipoFilter))

  // Filtro de estado si no es "Todos"
  if (statusFilter !== 'Todos') {
    constraints.push(where('estado', '==', statusFilter))
  }

  // Ordenar por fecha de creación descendente
  constraints.push(orderBy('createdAt', 'desc'))

  // Límite de la página
  constraints.push(limit(limitSize))

  // Cursor para la página siguiente
  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc))
  }

  const q = query(wholesaleRef, ...constraints)
  const snap = await getDocs(q)
  
  const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  
  return {
    requests,
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === limitSize
  }
}

/**
 * Se suscribe a todas las solicitudes al por mayor pendientes en tiempo real (para Admin).
 */
export function subscribeToWholesaleRequests(onUpdate) {
  const q = query(
    wholesaleRef,
    where('estado', '==', 'pendiente'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    onUpdate(requests)
  }, (error) => {
    console.error("Error subscribiendo a solicitudes al por mayor pendientes:", error)
  })
}

/**
 * Se suscribe a las solicitudes al por mayor y por encargo de un cliente específico en tiempo real.
 */
export function subscribeToClientWholesaleRequests(celular, onUpdate) {
  const q = query(
    wholesaleRef,
    where('clienteCelular', '==', celular)
  )
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Ordenar localmente por fecha de creación descendente para evitar el requisito de índice compuesto
    requests.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
      return dateB - dateA
    })

    onUpdate(requests)
  }, (error) => {
    console.error("Error subscribiendo a solicitudes del cliente:", error)
  })
}

/**
 * Actualiza el estado de una solicitud al por mayor.
 */
export async function updateWholesaleRequestStatus(id, newStatus) {
  const docRef = doc(db, COLLECTIONS.WHOLESALE_ORDERS, id)
  const docSnap = await getDoc(docRef)
  
  if (docSnap.exists()) {
    const data = docSnap.data()
    await updateDoc(docRef, {
      estado: newStatus,
      updatedAt: new Date()
    })

    // Crear notificación persistente para el cliente
    const concept = data.tipo === 'encargo' ? 'por encargo' : 'al por mayor'
    const stLabel = newStatus === 'revisando' ? 'En Revisión' : newStatus === 'aprobado' ? 'Aprobado' : 'Rechazado'
    await createClientNotification({
      clienteCelular: data.clienteCelular,
      message: `Tu solicitud ${concept} de "${data.productoNombre}" cambió a: ${stLabel.toUpperCase()}`,
      type: 'wholesale',
      orderId: null
    })
  } else {
    // Fallback simple si no existe el doc
    await updateDoc(docRef, {
      estado: newStatus,
      updatedAt: new Date()
    })
  }
}

/**
 * Oculta las solicitudes al por mayor / encargo rechazadas del historial del cliente
 */
export async function clearClientWholesaleHistory(requests) {
  const promises = requests.map(r => {
    const docRef = doc(db, COLLECTIONS.WHOLESALE_ORDERS, r.id)
    return updateDoc(docRef, {
      ocultoCliente: true,
      updatedAt: new Date()
    })
  })
  await Promise.all(promises)
}

