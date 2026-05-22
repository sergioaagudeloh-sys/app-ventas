import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  runTransaction,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS, ORDER_STATES } from '../constants'

const ordersRef = collection(db, COLLECTIONS.ORDERS)

/**
 * Crea un nuevo pedido desde el cliente.
 * El estado inicial siempre es PENDIENTE y NO descuenta stock.
 */
export async function createOrder(orderData) {
  // Construir el número de pedido (ej: OR-12345678)
  const orderNumber = `OR-${Math.floor(10000000 + Math.random() * 90000000)}`
  
  const docRef = await addDoc(ordersRef, {
    ...orderData,
    orderNumber,
    estado: ORDER_STATES.PENDIENTE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Obtiene todos los pedidos (para Admin)
 */
export async function getOrders() {
  const q = query(ordersRef, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

/**
 * Se suscribe a todos los pedidos en tiempo real (para Admin)
 */
export function subscribeToOrders(onUpdate) {
  const q = query(ordersRef, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    onUpdate(orders)
  })
}

/**
 * Obtiene los pedidos de un cliente específico (para su Perfil)
 */
export async function getClientOrders(celular) {
  if (!celular) return []
  const q = query(ordersRef, where('cliente.celular', '==', celular))
  const snap = await getDocs(q)
  
  const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return orders.sort((a, b) => {
    const timeA = a.createdAt?.toMillis() || 0
    const timeB = b.createdAt?.toMillis() || 0
    return timeB - timeA
  })
}

/**
 * Se suscribe a los pedidos de un cliente en tiempo real
 */
export function subscribeToClientOrders(celular, onUpdate) {
  if (!celular) {
    onUpdate([])
    return () => {}
  }
  const q = query(ordersRef, where('cliente.celular', '==', celular))
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const sorted = orders.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0
      const timeB = b.createdAt?.toMillis() || 0
      return timeB - timeA
    })
    onUpdate(sorted)
  })
}

/**
 * Actualiza el estado de un pedido.
 * REGLA CRÍTICA (Fase 5): Si pasa a COMPLETADO, descuenta el stock de las variantes.
 * Se usa una Transacción de Firestore para evitar condiciones de carrera.
 */
export async function updateOrderStatus(orderId, newStatus, currentOrder) {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId)

  // Si no va a pasar a completado, es un update simple
  if (newStatus !== ORDER_STATES.COMPLETADO) {
    await updateDoc(orderRef, {
      estado: newStatus,
      updatedAt: serverTimestamp(),
    })
    return
  }

  // SI PASA A COMPLETADO -> Ejecutamos la transacción para descontar stock
  await runTransaction(db, async (transaction) => {
    // 1. Verificar el pedido
    const orderDoc = await transaction.get(orderRef)
    if (!orderDoc.exists()) throw new Error('Pedido no encontrado')
    
    // Si ya estaba completado, no descontamos dos veces
    if (orderDoc.data().estado === ORDER_STATES.COMPLETADO) {
      throw new Error('El pedido ya había sido marcado como Completado.')
    }

    const items = orderDoc.data().items || []

    // 2. Leer todos los productos involucrados ANTES de modificar (regla de transacciones de Firestore)
    const productRefs = items.map(item => doc(db, COLLECTIONS.PRODUCTS, item.productId))
    const productsCache = {}
    
    for (const pRef of productRefs) {
      if (!productsCache[pRef.id]) {
        const pDoc = await transaction.get(pRef)
        if (pDoc.exists()) {
          productsCache[pRef.id] = { ref: pRef, data: pDoc.data() }
        }
      }
    }

    // 3. Modificar el stock en los productos
    const updatedProducts = {} // Para no sobrescribir si el pedido tiene el mismo producto 2 veces

    for (const item of items) {
      const productInfo = updatedProducts[item.productId] || productsCache[item.productId]
      if (!productInfo) continue // Producto fue borrado del inventario, igual cobramos el pedido

      const variantes = [...productInfo.data.variantes]
      const variantIndex = variantes.findIndex(v => v.id === item.variantId)

      if (variantIndex !== -1) {
        // Reducir stock, pero no dejar que baje de 0 por seguridad
        variantes[variantIndex].stock = Math.max(0, variantes[variantIndex].stock - item.cantidad)
        
        // Guardar en nuestro objeto local temporal
        updatedProducts[item.productId] = {
          ...productInfo,
          data: { ...productInfo.data, variantes }
        }
      }
    }

    // 4. Aplicar todas las escrituras (writes) al final
    // Actualizar productos
    Object.values(updatedProducts).forEach(productInfo => {
      transaction.update(productInfo.ref, {
        variantes: productInfo.data.variantes,
        updatedAt: serverTimestamp()
      })
    })

    // Actualizar estado del pedido
    transaction.update(orderRef, {
      estado: ORDER_STATES.COMPLETADO,
      updatedAt: serverTimestamp()
    })

    // FASE 6: Si el pedido es a CRÉDITO (FIADO), generar automáticamente la deuda
    if (orderDoc.data().metodoPago === 'credito') {
      const creditRef = doc(collection(db, COLLECTIONS.CREDITS))
      transaction.set(creditRef, {
        orderId: orderDoc.id,
        orderNumber: orderDoc.data().orderNumber,
        clienteNombre: orderDoc.data().cliente?.nombre || 'Desconocido',
        clienteCelular: orderDoc.data().cliente?.celular || 'Desconocido',
        montoTotal: orderDoc.data().total || 0,
        saldoPendiente: orderDoc.data().total || 0,
        abonos: [],
        estado: 'activo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }
  })
}
