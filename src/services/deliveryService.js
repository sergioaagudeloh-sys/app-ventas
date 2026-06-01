import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, onSnapshot, query, where, orderBy, limit,
  arrayUnion, increment, runTransaction,
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS, DELIVERY_STATES } from '../constants'

const COL      = COLLECTIONS.DELIVERIES
const COL_ORD  = COLLECTIONS.ORDERS
const COL_CONF = COLLECTIONS.CONFIG

// ─────────────────────────────────────────────────────────────────────────────
// MENSAJEROS EXTERNOS — CRUD en config/delivery/messengers (subcolección)
// ─────────────────────────────────────────────────────────────────────────────

/** Obtiene la ref de la subcolección de mensajeros externos */
function messengersColRef() {
  return collection(db, COL_CONF, 'delivery', 'messengers')
}

/** Lista todos los mensajeros externos configurados por el negocio */
export async function getExternalMessengers() {
  const snap = await getDocs(query(messengersColRef(), orderBy('createdAt')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Agrega un nuevo mensajero externo */
export async function addExternalMessenger({ name, phone, whatsapp = '', notes = '' }) {
  const ref = await addDoc(messengersColRef(), {
    name:      name.trim(),
    phone:     phone.trim(),
    whatsapp:  whatsapp.trim(),
    notes:     notes.trim(),
    status:    'disponible',  // disponible | ocupado | fuera_servicio
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/** Actualiza un mensajero externo existente */
export async function updateExternalMessenger(id, data) {
  const ref = doc(messengersColRef(), id)
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

/** Elimina un mensajero externo */
export async function deleteExternalMessenger(id) {
  await deleteDoc(doc(messengersColRef(), id))
}

/** Actualiza solo el estado operativo del mensajero externo */
export async function setMessengerStatus(id, status) {
  await updateDoc(doc(messengersColRef(), id), { status, updatedAt: serverTimestamp() })
}

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE — registrar un pedido en la cola de domicilios
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea o sobreescribe el documento de entrega en la colección `deliveries`.
 * @param {Object} payload
 * @param {string} payload.orderId       - ID del documento en `orders`
 * @param {string} payload.orderNumber   - Número legible del pedido
 * @param {string} payload.address       - Dirección de entrega
 * @param {string} payload.clientName    - Nombre del cliente
 * @param {string} payload.phone         - Teléfono del cliente
 * @param {string} [payload.mensajeroId] - UID del empleado mensajero (null si externo)
 * @param {string} [payload.mensajeroExtId] - ID del mensajero externo (null si empleado)
 * @param {Object} [payload.deliveryCost]   - { tipo: 'fijo'|'personalizado', valor: Number }
 * @param {Array}  [payload.items]       - Resumen de productos para el mensajero
 * @param {string} [payload.notas]       - Observaciones para la entrega
 */
export async function queueDelivery({
  orderId,
  orderNumber,
  address,
  clientName,
  phone,
  mensajeroId    = null,
  mensajeroExtId = null,
  deliveryCost   = null,
  items          = [],
  notas          = '',
}) {
  const ref = doc(db, COL, orderId)
  const estado = mensajeroId || mensajeroExtId ? DELIVERY_STATES.ASSIGNED : DELIVERY_STATES.PENDING

  await setDoc(ref, {
    orderId,
    orderNumber:    orderNumber || '',
    address:        address || '',
    clientName:     clientName || '',
    phone:          phone || '',
    mensajeroId,
    mensajeroExtId,
    deliveryCost,
    items,
    notas,
    estado,
    history: [{
      estado,
      timestamp: new Date().toISOString(),
      actor: 'sistema',
      nota: 'Pedido registrado en cola de domicilios',
    }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })

  // Sincronizar deliveryInfo en la orden principal
  await _syncOrderDeliveryInfo(orderId, {
    estado,
    mensajeroId,
    mensajeroExtId,
    deliveryCost,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// ASIGNACIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asigna (o reasigna) un mensajero a la entrega. Acepta empleado o externo.
 * @param {string} orderId
 * @param {Object} assignment
 * @param {string|null} assignment.mensajeroId    - UID del empleado
 * @param {string|null} assignment.mensajeroExtId - ID mensajero externo
 * @param {string}      assignment.actorName      - Nombre de quien asignó
 */
export async function assignDelivery(orderId, { mensajeroId = null, mensajeroExtId = null, actorName = 'admin' } = {}) {
  const ref = doc(db, COL, orderId)
  const nuevoEstado = DELIVERY_STATES.ASSIGNED
  const histEntry = {
    estado:    nuevoEstado,
    timestamp: new Date().toISOString(),
    actor:     actorName,
    nota:      `Asignado a ${mensajeroId ? 'empleado' : 'mensajero externo'}`,
  }

  await updateDoc(ref, {
    mensajeroId,
    mensajeroExtId,
    estado:    nuevoEstado,
    updatedAt: serverTimestamp(),
    history:   arrayUnion(histEntry),
  })

  await _syncOrderDeliveryInfo(orderId, { estado: nuevoEstado, mensajeroId, mensajeroExtId })
}

/** Retira la asignación dejando el pedido como pendiente */
export async function unassignDelivery(orderId, actorName = 'admin') {
  const ref = doc(db, COL, orderId)
  const nuevoEstado = DELIVERY_STATES.PENDING
  const histEntry = {
    estado:    nuevoEstado,
    timestamp: new Date().toISOString(),
    actor:     actorName,
    nota:      'Asignación retirada',
  }

  await updateDoc(ref, {
    mensajeroId:    null,
    mensajeroExtId: null,
    estado:         nuevoEstado,
    updatedAt:      serverTimestamp(),
    history:        arrayUnion(histEntry),
  })

  await _syncOrderDeliveryInfo(orderId, { estado: nuevoEstado, mensajeroId: null, mensajeroExtId: null })
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMBIO DE ESTADO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Actualiza el estado logístico de una entrega.
 * @param {string} orderId
 * @param {string} estado   - Ver DELIVERY_STATES
 * @param {Object} opts
 * @param {string} [opts.actorName]  - Nombre del actor
 * @param {string} [opts.nota]       - Nota libre (requerida para fallido/reprogramado)
 */
export async function updateDeliveryStatus(orderId, estado, { actorName = 'sistema', nota = '' } = {}) {
  const ref = doc(db, COL, orderId)
  const histEntry = {
    estado,
    timestamp: new Date().toISOString(),
    actor:     actorName,
    nota,
  }

  await updateDoc(ref, {
    estado,
    updatedAt: serverTimestamp(),
    history:   arrayUnion(histEntry),
    // En entrega exitosa registrar el timestamp
    ...(estado === DELIVERY_STATES.DELIVERED ? { deliveredAt: serverTimestamp() } : {}),
  })

  // Sincronizar estado en la orden principal
  await _syncOrderDeliveryInfo(orderId, { estado })

  // Si se entregó, actualizar analítica agregada
  if (estado === DELIVERY_STATES.DELIVERED || estado === DELIVERY_STATES.FAILED) {
    _updateDeliveryAnalytics(orderId, estado).catch(console.error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINCRONIZACIÓN CON ORDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escribe el campo `deliveryInfo` dentro del documento `orders/{orderId}`.
 * Mantiene en la orden el estado logístico sin necesitar consultar `deliveries`.
 */
async function _syncOrderDeliveryInfo(orderId, partial) {
  try {
    const ref = doc(db, COL_ORD, orderId)
    await updateDoc(ref, {
      'deliveryInfo.estado':         partial.estado         ?? null,
      'deliveryInfo.mensajeroId':    partial.mensajeroId    ?? null,
      'deliveryInfo.mensajeroExtId': partial.mensajeroExtId ?? null,
      ...(partial.deliveryCost !== undefined
        ? { 'deliveryInfo.deliveryCost': partial.deliveryCost }
        : {}),
      updatedAt: serverTimestamp(),
    })
  } catch (e) {
    // La orden puede no existir en modo sandbox; silenciar para no bloquear el flujo
    console.warn('[deliveryService] No se pudo sincronizar deliveryInfo en order:', e.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALÍTICA AGREGADA
// ─────────────────────────────────────────────────────────────────────────────

async function _updateDeliveryAnalytics(orderId, estado) {
  try {
    const delivRef = doc(db, COL, orderId)
    const delivSnap = await getDoc(delivRef)
    if (!delivSnap.exists()) return

    const data = delivSnap.data()
    const mensajeroKey = data.mensajeroId || data.mensajeroExtId || 'sin_asignar'
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const analyticsRef = doc(db, COLLECTIONS.DELIVERY_ANALYTICS, `${today}_${mensajeroKey}`)
    await runTransaction(db, async tx => {
      const snap = await tx.get(analyticsRef)
      if (!snap.exists()) {
        tx.set(analyticsRef, {
          date:         today,
          mensajeroKey,
          total:        0,
          entregados:   0,
          fallidos:     0,
          reprogramados: 0,
          createdAt:    serverTimestamp(),
        })
      }
      const updates = { total: increment(1) }
      if (estado === DELIVERY_STATES.DELIVERED) updates.entregados   = increment(1)
      if (estado === DELIVERY_STATES.FAILED)    updates.fallidos     = increment(1)
      if (estado === DELIVERY_STATES.RESCHEDULED) updates.reprogramados = increment(1)
      tx.update(analyticsRef, updates)
    })
  } catch (e) {
    console.warn('[deliveryService] Analytics error:', e.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTAS / SUSCRIPCIONES
// ─────────────────────────────────────────────────────────────────────────────

/** Obtiene una única entrega por orderId */
export async function getDelivery(orderId) {
  const snap = await getDoc(doc(db, COL, orderId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/** Obtiene todos los pedidos pendientes + asignados + en_camino */
export async function getPendingDeliveries() {
  const q = query(
    collection(db, COL),
    where('estado', 'in', [
      DELIVERY_STATES.PENDING,
      DELIVERY_STATES.ASSIGNED,
      DELIVERY_STATES.READY,
      DELIVERY_STATES.ON_ROUTE,
    ]),
    orderBy('createdAt'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Suscripción en tiempo real a entregas activas.
 * Si se pasa mensajeroId, filtra solo las del domiciliario actual.
 */
export function subscribeToDeliveries(callback, mensajeroId = null) {
  const activeStates = [
    DELIVERY_STATES.PENDING,
    DELIVERY_STATES.ASSIGNED,
    DELIVERY_STATES.READY,
    DELIVERY_STATES.ON_ROUTE,
  ]

  const q = mensajeroId
    ? query(
        collection(db, COL),
        where('mensajeroId', '==', mensajeroId),
        where('estado', 'in', [DELIVERY_STATES.ASSIGNED, DELIVERY_STATES.READY, DELIVERY_STATES.ON_ROUTE]),
      )
    : query(collection(db, COL), where('estado', 'in', activeStates))

  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
    callback(data)
  })
}

/**
 * Suscripción para el administrador: incluye todos los estados para
 * el panel de gestión de pedidos en AdminOrders.
 */
export function subscribeToAllDeliveries(callback) {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'), limit(200))
  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(data)
  })
}

/**
 * Consulta entregas históricas para analítica (rango de fechas).
 * @param {Date} from
 * @param {Date} to
 */
export async function getDeliveriesForAnalytics(from, to) {
  const q = query(
    collection(db, COL),
    where('createdAt', '>=', from),
    where('createdAt', '<=', to),
    orderBy('createdAt', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Genera el mensaje de WhatsApp para enviar al mensajero usando la plantilla configurada.
 * @param {Object} order     - Documento del pedido desde `orders`
 * @param {string} template  - Plantilla con variables {pedido}, {cliente}, etc.
 */
export function buildMessengerMessage(order, template) {
  const total = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(order.total || 0)
  const variables = {
    '{pedido}':       order.orderNumber || order.id?.slice(-6)?.toUpperCase() || '---',
    '{cliente}':      order.clientName  || order.cliente?.nombre || '---',
    '{direccion}':    order.deliveryAddress || order.direccion   || '---',
    '{telefono}':     order.phone       || order.cliente?.telefono || '---',
    '{total}':        total,
    '{metodo_pago}':  order.paymentMethod || order.metodoPago   || '---',
    '{notas}':        order.notes       || order.notas          || 'Sin observaciones',
  }

  return Object.entries(variables).reduce(
    (msg, [key, val]) => msg.replaceAll(key, val),
    template,
  )
}
