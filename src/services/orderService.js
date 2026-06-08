import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  limit,
  serverTimestamp,
  orderBy,
  runTransaction,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS, ORDER_STATES, PAYMENT_METHODS } from '../constants'
import { createCentralNotification, NC_TYPES } from './notificationCenterService'

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

    // 3. Escribir actualizaciones de stock e incrementar ventas comerciales (salesCount)
    Object.values(updatedProducts).forEach(productInfo => {
      const productItems = items.filter(item => item.productId === productInfo.ref.id)
      const totalQtySold = productItems.reduce((sum, item) => sum + item.cantidad, 0)

      transaction.update(productInfo.ref, {
        variantes: productInfo.data.variantes,
        salesCount: (productInfo.data.salesCount || 0) + totalQtySold,
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

  // 5. Emitir Notificación Central de Pedido Recibido para el Administrador
  try {
    const isWholesale = orderData.tipo === 'wholesale' || orderData.items?.some(item => item.wholesale)
    const isCustomOrder = orderData.tipo === 'custom_order' || orderData.customOrder || orderData.items?.some(item => item.custom)
    const typeLabel = isWholesale ? 'Al por mayor' : isCustomOrder ? 'Por encargo' : 'Normal'

    await createCentralNotification({
      recipientId: 'admin',
      recipientRole: 'admin',
      title: 'Nuevo Pedido Recibido',
      body: `Pedido ${typeLabel} de ${orderData.cliente?.nombre || 'Cliente'} (${orderData.cliente?.celular || ''}) por valor de $${orderData.total || 0}.`,
      type: NC_TYPES.PEDIDO_RECIBIDO,
      orderId: orderIdRef.id,
      orderNumber
    })
  } catch (err) {
    console.error('[orderService] Error al notificar creación de pedido:', err)
  }

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
export function subscribeToOrders(callback) {
  const q = query(ordersRef, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(list)
  }, (error) => {
    console.error('[orderService] Error al escuchar todos los pedidos:', error)
    callback([])
  })
}

/**
 * Obtiene los pedidos asociados a un cliente mediante su número celular
 */
export async function getClientOrders(celular) {
  const q = query(ordersRef, where('cliente.celular', '==', celular))
  const snap = await getDocs(q)
  const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return list.sort((a, b) => {
    const tA = a.createdAt?.toMillis?.() || 0
    const tB = b.createdAt?.toMillis?.() || 0
    return tB - tA
  })
}

/**
 * Se suscribe a los pedidos de un cliente específico en tiempo real
 */
export function subscribeToClientOrders(celular, callback) {
  const q = query(ordersRef, where('cliente.celular', '==', celular))
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const sorted = list.sort((a, b) => {
      const tA = a.createdAt?.toMillis?.() || 0
      const tB = b.createdAt?.toMillis?.() || 0
      return tB - tA
    })
    callback(sorted)
  }, (error) => {
    console.error('[orderService] Error al escuchar pedidos del cliente:', error)
    callback([])
  })
}

/**
 * Se suscribe a los pedidos registrados por un vendedor específico en tiempo real
 */
export function subscribeToVendedorOrders(vendedorId, callback) {
  const q = query(ordersRef, where('vendedorId', '==', vendedorId))
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const sorted = list.sort((a, b) => {
      const tA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
      const tB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
      return tB - tA
    })
    callback(sorted)
  }, (error) => {
    console.error('[orderService] Error al escuchar pedidos del vendedor:', error)
    callback([])
  })
}

/**
 * Elimina lógicamente (o limpia del cliente) un historial de pedidos en lote
 */
export async function clearClientOrderHistory(orders) {
  const promises = orders.map(o => {
    const docRef = doc(db, COLLECTIONS.ORDERS, o.id)
    return updateDoc(docRef, {
      clienteOculto: true,
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
 * REGLA CRÍTICA: Si pasa a COMPLETADO, descuenta el stock de las variantes si no estaba descontado.
 * Si pasa a CRÉDITO_APROBADO, descuenta el stock Y genera el documento de deuda en 'credits'.
 */
export async function updateOrderStatus(orderId, newStatus, currentOrder) {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId)
  const stockYaDescontado = currentOrder?.stockDescontado === true

  const notifyClient = async () => {
    if (currentOrder?.cliente?.celular && currentOrder.cliente.celular !== 'Desconocido') {
      let resolvedType = NC_TYPES.PEDIDO_ESTADO
      let title = 'Actualización de Pedido'
      let body = `Tu pedido #${currentOrder.orderNumber || ''} cambió a ${newStatus.toUpperCase()}`

      if (newStatus === ORDER_STATES.COMPLETED) {
        resolvedType = NC_TYPES.PEDIDO_ENTREGADO
        title = 'Pedido Completado'
        body = `Tu pedido #${currentOrder.orderNumber || ''} ha sido completado con éxito. ¡Gracias por tu compra!`
      } else if (newStatus === ORDER_STATES.DELIVERING) {
        resolvedType = NC_TYPES.PEDIDO_EN_CAMINO
        title = 'Pedido en Camino'
        body = `Tu pedido #${currentOrder.orderNumber || ''} está en camino a tu dirección con nuestro mensajero.`
      } else if (newStatus === ORDER_STATES.READY) {
        resolvedType = NC_TYPES.PEDIDO_LISTO
        title = 'Pedido Listo'
        body = `Tu pedido #${currentOrder.orderNumber || ''} ya está listo y empacado.`
      }

      await createCentralNotification({
        recipientId: currentOrder.cliente.celular,
        recipientRole: 'client',
        title,
        body,
        type: resolvedType,
        orderId: orderId,
        orderNumber: currentOrder.orderNumber
      })
    }
  }

  // ─── CANCELAR ─────────────────────────────────────────────────────────────
  if (newStatus === ORDER_STATES.CANCELLED) {
    if (stockYaDescontado) {
      const items = currentOrder?.items || []
      await runTransaction(db, async (transaction) => {
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

        const updatedProducts = {}
        for (const item of items) {
          if (item.productId?.startsWith('custom-')) continue
          const productInfo = updatedProducts[item.productId] || productsCache[item.productId]
          if (!productInfo) continue

          const variantes = [...productInfo.data.variantes]
          const variantIndex = variantes.findIndex(v => v.id === item.variantId)

          if (variantIndex !== -1) {
            variantes[variantIndex].stock = variantes[variantIndex].stock + item.cantidad
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
          stockDescontado: false,
          updatedAt: serverTimestamp()
        })
      })
    } else {
      await updateDoc(orderRef, {
        estado: newStatus,
        updatedAt: serverTimestamp()
      })
    }
    await notifyClient()
    return
  }

  // ─── CRÉDITO APROBADO ──────────────────────────────────────────────────────
  if (newStatus === ORDER_STATES.CREDIT_APPROVED) {
    if (!stockYaDescontado) {
      const items = currentOrder?.items || []
      await runTransaction(db, async (transaction) => {
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
              throw new Error(`Stock insuficiente para variante de ${item.nombre}`)
            }
            variantes[variantIndex].stock = stockActual - item.cantidad
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
          stockDescontado: true,
          updatedAt: serverTimestamp()
        })
      })
    } else {
      await updateDoc(orderRef, {
        estado: newStatus,
        updatedAt: serverTimestamp()
      })
    }

    // Generar documento en Colección Credits
    const creditsRef = collection(db, 'credits')
    await addDoc(creditsRef, {
      orderId,
      orderNumber: currentOrder.orderNumber || '—',
      cliente: currentOrder.cliente,
      clienteNombre: currentOrder.cliente?.nombre || '',
      clienteCelular: currentOrder.cliente?.celular || '',
      total: currentOrder.total,
      montoTotal: currentOrder.total,
      saldoPendiente: currentOrder.total,
      abonos: [],
      estado: 'activo',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    await notifyClient()
    return
  }

  // ─── OTROS ESTADOS (PENDING, PREPARING, DELIVERING, COMPLETED, READY) ───────
  await updateDoc(orderRef, {
    estado: newStatus,
    updatedAt: serverTimestamp()
  })
  await notifyClient()
}

/**
 * Crea un pedido físico directamente en el portal admin (venta POS/Local)
 */
export async function createPhysicalOrder(orderData, adminId) {
  const orderNumber = `OR-POS-${Math.floor(100000 + Math.random() * 900000)}`
  const orderIdRef = doc(collection(db, COLLECTIONS.ORDERS))

  await runTransaction(db, async (transaction) => {
    const items = orderData.items || []

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
          throw new Error(`Stock insuficiente para "${item.nombre}"`)
        }
        variantes[variantIndex].stock = stockActual - item.cantidad
        updatedProducts[item.productId] = {
          ...productInfo,
          data: { ...productInfo.data, variantes }
        }
      }
    }

    Object.values(updatedProducts).forEach(productInfo => {
      const productItems = items.filter(item => item.productId === productInfo.ref.id)
      const totalQtySold = productItems.reduce((sum, item) => sum + item.cantidad, 0)

      transaction.update(productInfo.ref, {
        variantes: productInfo.data.variantes,
        salesCount: (productInfo.data.salesCount || 0) + totalQtySold,
        updatedAt: serverTimestamp()
      })
    })

    const resolvedStatus = (orderData.metodoPago === PAYMENT_METHODS.CASH || orderData.metodoPago === PAYMENT_METHODS.TRANSFER)
      ? ORDER_STATES.COMPLETED
      : (orderData.metodoPago === PAYMENT_METHODS.CREDIT ? ORDER_STATES.CREDIT_APPROVED : ORDER_STATES.PENDING)

    transaction.set(orderIdRef, {
      ...orderData,
      orderNumber,
      estado: resolvedStatus,
      stockDescontado: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  })

  // Generar deuda si es método Crédito
  if (orderData.metodoPago === PAYMENT_METHODS.CREDIT) {
    const creditsRef = collection(db, 'credits')
    await addDoc(creditsRef, {
      orderId: orderIdRef.id,
      orderNumber,
      cliente: orderData.cliente,
      clienteNombre: orderData.cliente?.nombre || '',
      clienteCelular: orderData.cliente?.celular || '',
      total: orderData.total,
      montoTotal: orderData.total,
      saldoPendiente: orderData.total,
      abonos: [],
      estado: 'activo',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }

  return { id: orderIdRef.id, orderNumber }
}

/**
 * Actualiza el costo de envío de un pedido y recalcula el total.
 * @param {string} orderId - ID del pedido
 * @param {number} newCost - Nuevo costo de envío
 * @param {number} currentTotal - Total actual del pedido (para calcular la diferencia)
 * @param {number} currentDeliveryCost - Costo de envío actual (para calcular la diferencia)
 */
export async function updateOrderDeliveryCost(orderId, newCost, currentTotal, currentDeliveryCost) {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId)
  const diff = newCost - (currentDeliveryCost || 0)
  await updateDoc(orderRef, {
    costoEnvio: newCost,
    total: Math.max(0, (currentTotal || 0) + diff),
    updatedAt: serverTimestamp()
  })
}

/**
 * Se suscribe a un pedido específico por su trackingToken en tiempo real.
 * @param {string} token - Token de seguimiento del pedido
 * @param {function} onUpdate - Callback con el pedido actualizado
 * @param {function} onError - Callback de error
 * @returns {function} Función para cancelar la suscripción
 */
export function subscribeToOrderByToken(token, onUpdate, onError) {
  const q = query(ordersRef, where('trackingToken', '==', token), limit(1))
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      onUpdate(null)
    } else {
      onUpdate({ id: snap.docs[0].id, ...snap.docs[0].data() })
    }
  }, onError)
}

/**
 * Sincroniza las ventas físicas que fueron realizadas offline y guardadas en IndexedDB.
 */
export async function syncOfflineSales(retryCount = 0) {
  const { getOfflineSales, removeOfflineSale } = await import('./offlineDB')
  const pendingSales = await getOfflineSales()
  
  if (pendingSales.length === 0) return { success: true, count: 0 }
  
  let syncedCount = 0
  let conflicts = []
  
  for (const sale of pendingSales) {
    try {
      // Re-crear el pedido en el servidor
      const orderData = { ...sale.orderData }
      const adminId = sale.adminId || 'admin'
      
      await createPhysicalOrder(orderData, adminId)
      
      // Si tiene éxito, remover del IndexedDB local
      await removeOfflineSale(sale.id)
      syncedCount++
    } catch (error) {
      console.error(`[syncOfflineSales] Error al sincronizar venta offline ${sale.id}:`, error)
      conflicts.push({ sale, error: error.message })
    }
  }
  
  if (syncedCount > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sales-synced', { detail: { count: syncedCount } }))
  }

  // Si hay fallas de sincronización (por lag en reconexión de Firestore), reintentar automáticamente
  if (conflicts.length > 0 && retryCount < 4) {
    console.log(`[syncOfflineSales] Sincronización incompleta, programando reintento #${retryCount + 1} en 5s...`)
    setTimeout(() => {
      syncOfflineSales(retryCount + 1).catch(console.error)
    }, 5000)
  }
  
  return {
    success: conflicts.length === 0,
    count: syncedCount,
    conflicts
  }
}
