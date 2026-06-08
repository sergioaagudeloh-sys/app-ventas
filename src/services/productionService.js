import { collection, doc, getDocs, setDoc, query, where, serverTimestamp, updateDoc, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

/**
 * Registra una nueva cola de producción para cocina/bodega.
 * @param {object} orderData - Datos de la orden original
 */
export async function queueProductionOrder(orderData) {
  if (!orderData?.id) return;
  const prodRef = doc(db, COLLECTIONS.PRODUCTION, orderData.id);
  await setDoc(prodRef, {
    orderId: orderData.id,
    orderNumber: orderData.orderNumber || '',
    items: orderData.items || [],
    notas: orderData.notas || '',
    estado: 'alistamiento', // 'alistamiento' | 'listo' | 'entregado'
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Actualiza el estado de un pedido en la cola de producción.
 * @param {string} prodId - ID del documento en la colección de producción (coincide con orderId)
 * @param {string} newStatus - 'alistamiento' | 'listo' | 'entregado'
 */
export async function updateProductionStatus(prodId, newStatus) {
  const prodRef = doc(db, COLLECTIONS.PRODUCTION, prodId);
  const orderRef = doc(db, COLLECTIONS.ORDERS, prodId);
  
  await updateDoc(prodRef, {
    estado: newStatus,
    updatedAt: serverTimestamp()
  });

  // Sincronizar con el pedido principal para el stepper de tracking público del cliente
  await updateDoc(orderRef, {
    estado: newStatus,
    updatedAt: serverTimestamp()
  });
}

/**
 * Obtiene las órdenes en preparación (para KitchenPanel/Cocinero).
 * @returns {Promise<Array>} Lista de órdenes en producción activa
 */
export async function getActiveProductionOrders() {
  const q = query(collection(db, COLLECTIONS.PRODUCTION), where('estado', 'in', ['alistamiento', 'listo']));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Suscripción en tiempo real a las órdenes de producción activas.
 * Usada por PortalCocina para reflejar cambios al instante.
 */
export function subscribeToProductionOrders(callback) {
  const q = query(
    collection(db, COLLECTIONS.PRODUCTION),
    where('estado', 'in', ['alistamiento', 'listo']),
    orderBy('createdAt')
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (error) => {
    console.error('[productionService] Error al escuchar órdenes de producción:', error)
    callback([])
  })
}

/**
 * Suscripción en tiempo real a las órdenes entregadas/completadas en producción.
 */
export function subscribeToCompletedProductionOrders(callback) {
  const q = query(
    collection(db, COLLECTIONS.PRODUCTION),
    where('estado', '==', 'entregado'),
    orderBy('createdAt')
  )
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(list.reverse().slice(0, 30)) // Mostrar las últimas 30
  }, (error) => {
    console.error('[productionService] Error al escuchar órdenes de producción completadas:', error)
    callback([])
  })
}

