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
import { COLLECTIONS, ORDER_STATES, PAYMENT_METHODS } from '../constants'

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
    estado: ORDER_STATES.PENDING,
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
 * Oculta los pedidos completados o cancelados del historial del cliente
 */
export async function clearClientOrderHistory(orders) {
  const promises = orders.map(o => {
    const docRef = doc(db, COLLECTIONS.ORDERS, o.id)
    return updateDoc(docRef, {
      ocultoCliente: true,
      updatedAt: serverTimestamp()
    })
  })
  await Promise.all(promises)
}

/**
 * Archiva los pedidos completados o cancelados del administrador
 */
export async function archiveOrders(orders) {
  const promises = orders.map(o => {
    const docRef = doc(db, COLLECTIONS.ORDERS, o.id)
    return updateDoc(docRef, {
      archivado: true,
      updatedAt: serverTimestamp()
    })
  })
  await Promise.all(promises)
}

/**
 * Actualiza el estado de un pedido.
 * REGLA CRÍTICA (Fase 5): Si pasa a COMPLETADO, descuenta el stock de las variantes.
 * Si pasa a CRÉDITO_APROBADO, descuenta el stock Y genera el documento de deuda en 'credits'.
 * Se usa una Transacción de Firestore para el stock y un addDoc separado para el crédito.
 */
export async function updateOrderStatus(orderId, newStatus, currentOrder) {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId)

  // Si no va a pasar a completado ni a credito_aprobado, es un update simple
  if (newStatus !== ORDER_STATES.COMPLETED && newStatus !== 'credito_aprobado') {
    await updateDoc(orderRef, {
      estado: newStatus,
      updatedAt: serverTimestamp(),
    })
    return
  }

  // Capturar datos del pedido para usarlos fuera de la transacción
  let orderData = null

  // SI PASA A COMPLETADO O CRÉDITO APROBADO -> Ejecutamos la transacción para descontar stock
  await runTransaction(db, async (transaction) => {
    // 1. Verificar el pedido
    const orderDoc = await transaction.get(orderRef)
    if (!orderDoc.exists()) throw new Error('Pedido no encontrado')
    
    // Si ya estaba completado o crédito aprobado, no descontamos dos veces
    if (orderDoc.data().estado === ORDER_STATES.COMPLETED || orderDoc.data().estado === 'credito_aprobado') {
      throw new Error('El pedido ya había sido procesado.')
    }

    // Guardamos los datos para usarlos después
    orderData = orderDoc.data()

    const items = orderDoc.data().items || []

    // 2. Leer todos los productos involucrados ANTES de modificar (regla de transacciones de Firestore)
    const productRefs = items
      .filter(item => item.productId && !item.productId.startsWith('custom-'))
      .map(item => doc(db, COLLECTIONS.PRODUCTS, item.productId))
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
      if (item.productId && item.productId.startsWith('custom-')) continue
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
      estado: newStatus,
      updatedAt: serverTimestamp()
    })
  })

  // FASE 6: Si el nuevo estado es CRÉDITO APROBADO, generar la deuda en un paso separado
  // Se hace fuera de la transacción para evitar problemas de permisos
  if (newStatus === 'credito_aprobado' && orderData) {
    const creditsRef = collection(db, COLLECTIONS.CREDITS)
    await addDoc(creditsRef, {
      orderId: orderId,
      orderNumber: orderData.orderNumber,
      clienteNombre: orderData.cliente?.nombre || 'Desconocido',
      clienteCelular: orderData.cliente?.celular || 'Desconocido',
      montoTotal: orderData.total || 0,
      saldoPendiente: orderData.total || 0,
      abonos: [],
      estado: 'activo',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }

}

/**
 * Crea un pedido físico (venta directa POS) y descuenta stock inmediatamente en una transacción.
 */
export async function createPhysicalOrder(orderData, adminId) {
  const orderNumber = `OR-${Math.floor(10000000 + Math.random() * 90000000)}`
  const orderIdRef = doc(collection(db, COLLECTIONS.ORDERS))
  const orderId = orderIdRef.id

  const items = orderData.items || []
  const newStatus = orderData.metodoPago === PAYMENT_METHODS.CREDIT ? ORDER_STATES.CREDIT_APPROVED : ORDER_STATES.COMPLETED

  await runTransaction(db, async (transaction) => {
    // 1. Leer todos los productos involucrados (excluyendo personalizados)
    const productsCache = {}
    for (const item of items) {
      if (item.productId && item.productId.startsWith('custom-')) continue
      if (!productsCache[item.productId]) {
        const pRef = doc(db, COLLECTIONS.PRODUCTS, item.productId)
        const pDoc = await transaction.get(pRef)
        if (!pDoc.exists()) {
          throw new Error(`Producto no encontrado en inventario: ${item.nombre}`)
        }
        productsCache[item.productId] = { ref: pRef, data: pDoc.data() }
      }
    }

    // 2. Modificar el stock
    const updatedProducts = {}
    for (const item of items) {
      if (item.productId && item.productId.startsWith('custom-')) continue
      const productInfo = updatedProducts[item.productId] || productsCache[item.productId]
      const variantes = [...productInfo.data.variantes]
      const variantIndex = variantes.findIndex(v => v.id === item.variantId)

      if (variantIndex !== -1) {
        if (variantes[variantIndex].stock < item.cantidad) {
          throw new Error(`Stock insuficiente para ${item.nombre} (${variantes[variantIndex].talla || ''} ${variantes[variantIndex].color || ''})`)
        }
        variantes[variantIndex].stock = Math.max(0, variantes[variantIndex].stock - item.cantidad)
        updatedProducts[item.productId] = {
          ...productInfo,
          data: { ...productInfo.data, variantes }
        }
      }
    }

    // 3. Escribir productos actualizados
    Object.values(updatedProducts).forEach(productInfo => {
      transaction.update(productInfo.ref, {
        variantes: productInfo.data.variantes,
        updatedAt: serverTimestamp()
      })
    })

    // 4. Escribir orden
    transaction.set(orderIdRef, {
      ...orderData,
      orderNumber,
      estado: newStatus,
      type: 'physical',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: adminId
    })
  })

  // FASE 6: Si es crédito, registrar la deuda
  if (newStatus === ORDER_STATES.CREDIT_APPROVED) {
    const creditsRef = collection(db, COLLECTIONS.CREDITS)
    await addDoc(creditsRef, {
      orderId: orderId,
      orderNumber: orderNumber,
      clienteNombre: orderData.cliente?.nombre || 'Desconocido',
      clienteCelular: orderData.cliente?.celular || 'Desconocido',
      montoTotal: orderData.total || 0,
      saldoPendiente: orderData.total || 0,
      abonos: [],
      estado: 'activo',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }

  return { id: orderId, orderNumber }
}
