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
import { createClientNotification } from './clientNotificationService'

const ordersRef = collection(db, COLLECTIONS.ORDERS)

/**
 * Genera un token hash único y seguro SHA-256 basado en ID del pedido y celular.
 */
async function generateTrackingToken(orderId, celular) {
  const cleanCelular = (celular || '').replace(/\D/g, '')
  const data = `${orderId}_${cleanCelular}`
  try {
    const msgBuffer = new TextEncoder().encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    console.error('Crypto error, fallback used:', error)
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data.charCodeAt(i)
      hash |= 0
    }
    return 'fallback_' + Math.abs(hash) + '_' + Date.now()
  }
}

/**
 * Crea un nuevo pedido desde el cliente.
 * Descuenta el stock INMEDIATAMENTE de forma atómica (reserva temporal).
 * Si no hay stock suficiente lanza un error con el detalle del producto.
 * El pedido se guarda con stockDescontado: true para evitar doble descuento al completar.
 */
export async function createOrder(orderData) {
  const orderNumber = `OR-${Math.floor(10000000 + Math.random() * 90000000)}`
  const orderIdRef = doc(collection(db, COLLECTIONS.ORDERS))

  const trackingToken = await generateTrackingToken(orderIdRef.id, orderData.cliente?.celular)

  await runTransaction(db, async (transaction) => {
    const items = orderData.items || []

    // 1. Leer todos los productos involucrados
    const productsCache = {}
    for (const item of items) {
      if (item.productId?.startsWith('custom-')) continue
      if (!productsCache[item.productId]) {
        const pRef = doc(db, COLLECTIONS.PRODUCTS, item.productId)
        const pDoc = await transaction.get(pRef)
        if (!pDoc.exists()) throw new Error(`Producto no encontrado: ${item.nombre}`)
        productsCache[item.productId] = { ref: pRef, data: pDoc.data() }
      }
    }

    // 2. Verificar stock y calcular descuentos
    const updatedProducts = {}
    for (const item of items) {
      if (item.productId?.startsWith('custom-')) continue
      const productInfo = updatedProducts[item.productId] || productsCache[item.productId]
      if (!productInfo) continue

      const variantes = [...productInfo.data.variantes]
      const variantIndex = variantes.findIndex(v => v.id === item.variantId)

      if (variantIndex !== -1) {
        const stockActual = variantes[variantIndex].stock
        if (stockActual < item.cantidad) {
          const variantLabel = [variantes[variantIndex].talla, variantes[variantIndex].color]
            .filter(Boolean).join(' / ')
          throw new Error(
            `Stock insuficiente para "${item.nombre}${variantLabel ? ` (${variantLabel})` : ''}". ` +
            `Solo ${stockActual > 0 ? `quedan ${stockActual} unidades` : 'está agotado'}.`
          )
        }
        variantes[variantIndex].stock = stockActual - item.cantidad
        updatedProducts[item.productId] = {
          ...productInfo,
          data: { ...productInfo.data, variantes }
        }
      }
    }

    // 3. Escribir actualizaciones de stock
    Object.values(updatedProducts).forEach(productInfo => {
      transaction.update(productInfo.ref, {
        variantes: productInfo.data.variantes,
        updatedAt: serverTimestamp()
      })
    })

    // 4. Crear el pedido con flag de stock ya descontado
    transaction.set(orderIdRef, {
      ...orderData,
      orderNumber,
      estado: ORDER_STATES.PENDING,
      stockDescontado: true,
      trackingToken,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  return { id: orderIdRef.id, trackingToken }
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
  const stockYaDescontado = currentOrder?.stockDescontado === true

  const notifyClient = async () => {
    if (currentOrder?.cliente?.celular && currentOrder.cliente.celular !== 'Desconocido') {
      await createClientNotification({
        clienteCelular: currentOrder.cliente.celular,
        message: `Tu pedido ${currentOrder.orderNumber || ''} cambió a ${newStatus.toUpperCase()}`,
        type: 'status',
        orderId: orderId
      })
    }
  }

  // ─── CANCELAR ─────────────────────────────────────────────────────────────
  // Si el pedido tenía stock reservado, hay que devolverlo al inventario
  if (newStatus === ORDER_STATES.CANCELLED) {
    if (stockYaDescontado) {
      const items = currentOrder?.items || []
      await runTransaction(db, async (transaction) => {
        // Leer todos los productos afectados
        const productsCache = {}
        for (const item of items) {
          if (item.productId?.startsWith('custom-')) continue
          if (!productsCache[item.productId]) {
            const pRef = doc(db, COLLECTIONS.PRODUCTS, item.productId)
            const pDoc = await transaction.get(pRef)
            if (pDoc.exists()) {
              productsCache[item.productId] = { ref: pRef, data: pDoc.data() }
            }
          }
        }

        // Restaurar stock
        const updatedProducts = {}
        for (const item of items) {
          if (item.productId?.startsWith('custom-')) continue
          const productInfo = updatedProducts[item.productId] || productsCache[item.productId]
          if (!productInfo) continue

          const variantes = [...productInfo.data.variantes]
          const variantIndex = variantes.findIndex(v => v.id === item.variantId)
          if (variantIndex !== -1) {
            variantes[variantIndex].stock += item.cantidad
            updatedProducts[item.productId] = {
              ...productInfo,
              data: { ...productInfo.data, variantes }
            }
          }
        }

        Object.values(updatedProducts).forEach(productInfo => {
          transaction.update(productInfo.ref, {
            variantes: productInfo.data.variantes,
            updatedAt: serverTimestamp()
          })
        })

        transaction.update(orderRef, {
          estado: newStatus,
          updatedAt: serverTimestamp()
        })
      })
    } else {
      // Pedido viejo sin reserva: solo cambiar estado
      await updateDoc(orderRef, { estado: newStatus, updatedAt: serverTimestamp() })
    }
    await notifyClient()
    return
  }

  // ─── COMPLETAR / CRÉDITO APROBADO ─────────────────────────────────────────
  if (newStatus === ORDER_STATES.COMPLETED || newStatus === 'credito_aprobado') {
    let orderData = null

    if (stockYaDescontado) {
      // Stock ya fue descontado al crear el pedido → solo actualizar estado
      const orderDoc = await getDoc(orderRef)
      if (!orderDoc.exists()) throw new Error('Pedido no encontrado')
      if (orderDoc.data().estado === ORDER_STATES.COMPLETED || orderDoc.data().estado === 'credito_aprobado') {
        throw new Error('El pedido ya había sido procesado.')
      }
      orderData = orderDoc.data()
      await updateDoc(orderRef, { estado: newStatus, updatedAt: serverTimestamp() })
    } else {
      // Pedido viejo (sin reserva): descontar stock ahora (comportamiento original)
      await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(orderRef)
        if (!orderDoc.exists()) throw new Error('Pedido no encontrado')
        if (orderDoc.data().estado === ORDER_STATES.COMPLETED || orderDoc.data().estado === 'credito_aprobado') {
          throw new Error('El pedido ya había sido procesado.')
        }
        orderData = orderDoc.data()
        const items = orderDoc.data().items || []

        const productRefs = items
          .filter(item => item.productId && !item.productId.startsWith('custom-'))
          .map(item => doc(db, COLLECTIONS.PRODUCTS, item.productId))
        const productsCache = {}
        for (const pRef of productRefs) {
          if (!productsCache[pRef.id]) {
            const pDoc = await transaction.get(pRef)
            if (pDoc.exists()) productsCache[pRef.id] = { ref: pRef, data: pDoc.data() }
          }
        }

        const updatedProducts = {}
        for (const item of items) {
          if (item.productId && item.productId.startsWith('custom-')) continue
          const productInfo = updatedProducts[item.productId] || productsCache[item.productId]
          if (!productInfo) continue
          const variantes = [...productInfo.data.variantes]
          const variantIndex = variantes.findIndex(v => v.id === item.variantId)
          if (variantIndex !== -1) {
            variantes[variantIndex].stock = Math.max(0, variantes[variantIndex].stock - item.cantidad)
            updatedProducts[item.productId] = { ...productInfo, data: { ...productInfo.data, variantes } }
          }
        }

        Object.values(updatedProducts).forEach(productInfo => {
          transaction.update(productInfo.ref, { variantes: productInfo.data.variantes, updatedAt: serverTimestamp() })
        })
        transaction.update(orderRef, { estado: newStatus, updatedAt: serverTimestamp() })
      })
    }

    // Generar crédito si aplica
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
    await notifyClient()
    return
  }

  // ─── CUALQUIER OTRO ESTADO (simple update) ────────────────────────────────
  await updateDoc(orderRef, { estado: newStatus, updatedAt: serverTimestamp() })
  await notifyClient()
}

/**
 * Crea un pedido físico (venta directa POS) y descuenta stock inmediatamente en una transacción.
 */
export async function createPhysicalOrder(orderData, adminId) {
  const orderNumber = `OR-${Math.floor(10000000 + Math.random() * 90000000)}`
  const orderIdRef = doc(collection(db, COLLECTIONS.ORDERS))
  const orderId = orderIdRef.id

  const trackingToken = await generateTrackingToken(orderId, orderData.cliente?.celular)

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
      trackingToken,
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
