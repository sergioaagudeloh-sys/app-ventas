/**
 * notificationCenterService.js
 * ─────────────────────────────────────────────────────────────────
 * ÚNICO punto de entrada para crear, distribuir, suscribir y
 * gestionar todas las notificaciones de la plataforma.
 *
 * Reemplaza completamente:
 *  - clientNotificationService.js  (colección 'clientNotifications')
 *  - creditService.subscribeToNotifications  (colección 'notifications')
 *
 * Modelo de datos (colección 'notifications'):
 * {
 *   recipientId: string,       // celular, employeeId, o 'admin'
 *   recipientRole: string,     // 'admin' | 'client' | 'cocinero' | 'bodeguero' | 'mesero' | 'mensajero' | 'vendedor'
 *   title: string,
 *   body: string,
 *   type: string,              // 'pedido_recibido' | 'pedido_preparando' | 'pedido_listo' | 'abono' | 'stock_bajo' | 'reclamo' | 'encargo' | etc.
 *   soundCategory: string,     // 'pedido' | 'entrega' | 'inventario' | 'promocion' | 'alerta' | 'cuenta'
 *   clickAction: string,       // URL de redirección al abrir la notificación
 *   orderId: string | null,
 *   orderNumber: string | null,
 *   status: 'unread' | 'read' | 'archived',
 *   createdAt: Timestamp,
 * }
 * ─────────────────────────────────────────────────────────────────
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
  serverTimestamp,
  limit
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'

const COL = 'notifications'
const COL_TOKENS = 'fcmTokens'

// ─── Tipos de Notificación ────────────────────────────────────────────────────
export const NC_TYPES = {
  // Pedidos
  PEDIDO_RECIBIDO: 'pedido_recibido',
  PEDIDO_ACEPTADO: 'pedido_aceptado',
  PEDIDO_PREPARANDO: 'pedido_preparando',
  PEDIDO_LISTO: 'pedido_listo',
  PEDIDO_LISTO_RECOGER: 'pedido_listo_recoger',
  PEDIDO_EN_CAMINO: 'pedido_en_camino',
  PEDIDO_ENTREGADO: 'pedido_entregado',
  PEDIDO_CANCELADO: 'pedido_cancelado',
  PEDIDO_ESTADO: 'pedido_estado',
  // Créditos
  ABONO_RECIBIDO: 'abono_recibido',
  CREDITO_APROBADO: 'credito_aprobado',
  // Entregas
  ENTREGA_ASIGNADA: 'entrega_asignada',
  ENTREGA_COMPLETADA: 'entrega_completada',
  ENTREGA_FALLIDA: 'entrega_fallida',
  // Empleados (cocina/bodega/mesero)
  PEDIDO_COCINA: 'pedido_cocina',
  PEDIDO_MODIFICADO: 'pedido_modificado',
  PEDIDO_LISTO_SERVIR: 'pedido_listo_servir',
  SOLICITUD_ATENCION: 'solicitud_atencion',
  // Inventario
  STOCK_BAJO: 'stock_bajo',
  PRODUCTO_AGOTADO: 'producto_agotado',
  // Comercial / Encargos
  RECLAMO_NUEVO: 'reclamo_nuevo',
  ENCARGO_NUEVO: 'encargo_nuevo',
  // Cuenta
  BIENVENIDA: 'bienvenida',
}

// ─── Categorías de Sonido ────────────────────────────────────────────────────
export const NC_SOUND = {
  PEDIDO: 'pedido',
  ENTREGA: 'entrega',
  INVENTARIO: 'inventario',
  PROMOCION: 'promocion',
  ALERTA: 'alerta',
  CUENTA: 'cuenta',
}

// ─── Metadatos por Tipo (icono, color, sonido, ruta por defecto) ──────────────
export const NC_TYPE_META = {
  [NC_TYPES.PEDIDO_RECIBIDO]:    { label: 'Nuevo Pedido',       icon: 'ShoppingBag', color: 'primary',  sound: NC_SOUND.PEDIDO,      adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.PEDIDO_ACEPTADO]:    { label: 'Pedido Aceptado',    icon: 'CheckCircle2',color: 'emerald',  sound: NC_SOUND.PEDIDO,      adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.PEDIDO_PREPARANDO]:  { label: 'En Preparación',     icon: 'ChefHat',     color: 'orange',   sound: NC_SOUND.PEDIDO,      adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.PEDIDO_LISTO]:       { label: 'Pedido Listo',       icon: 'ShoppingBag', color: 'blue',     sound: NC_SOUND.PEDIDO,      adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.PEDIDO_LISTO_RECOGER]:{ label: 'Listo para Recoger',icon: 'Store',       color: 'blue',     sound: NC_SOUND.PEDIDO,      adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.PEDIDO_EN_CAMINO]:   { label: 'En Camino',          icon: 'Truck',       color: 'indigo',   sound: NC_SOUND.ENTREGA,     adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.PEDIDO_ENTREGADO]:   { label: 'Entregado',          icon: 'CheckCircle2',color: 'emerald',  sound: NC_SOUND.ENTREGA,     adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.PEDIDO_CANCELADO]:   { label: 'Cancelado',          icon: 'XCircle',     color: 'red',      sound: NC_SOUND.ALERTA,      adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.PEDIDO_ESTADO]:      { label: 'Actualización',      icon: 'RefreshCw',   color: 'primary',  sound: NC_SOUND.PEDIDO,      adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.ABONO_RECIBIDO]:     { label: 'Abono Recibido',     icon: 'CreditCard',  color: 'emerald',  sound: NC_SOUND.CUENTA,      adminRoute: '/admin/credito',     clientRoute: '/tienda/creditos' },
  [NC_TYPES.CREDITO_APROBADO]:   { label: 'Crédito Aprobado',   icon: 'ShieldCheck', color: 'indigo',   sound: NC_SOUND.CUENTA,      adminRoute: '/admin/credito',     clientRoute: '/tienda/creditos' },
  [NC_TYPES.ENTREGA_ASIGNADA]:   { label: 'Entrega Asignada',   icon: 'Truck',       color: 'primary',  sound: NC_SOUND.ENTREGA,     adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.ENTREGA_COMPLETADA]: { label: 'Entrega Completada', icon: 'CheckCircle2',color: 'emerald',  sound: NC_SOUND.ENTREGA,     adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.ENTREGA_FALLIDA]:    { label: 'Entrega Fallida',    icon: 'AlertTriangle',color: 'red',     sound: NC_SOUND.ALERTA,      adminRoute: '/admin/pedidos',     clientRoute: '/tienda/pedidos' },
  [NC_TYPES.PEDIDO_COCINA]:      { label: 'Nuevo Pedido Cocina',icon: 'ChefHat',     color: 'orange',   sound: NC_SOUND.PEDIDO,      adminRoute: '/admin/pedidos',     clientRoute: null },
  [NC_TYPES.PEDIDO_MODIFICADO]:  { label: 'Pedido Modificado',  icon: 'Edit',        color: 'amber',    sound: NC_SOUND.ALERTA,      adminRoute: '/admin/pedidos',     clientRoute: null },
  [NC_TYPES.PEDIDO_LISTO_SERVIR]:{ label: 'Listo para Servir',  icon: 'Utensils',    color: 'blue',     sound: NC_SOUND.PEDIDO,      adminRoute: '/admin/pedidos',     clientRoute: null },
  [NC_TYPES.SOLICITUD_ATENCION]: { label: 'Solicitud de Mesa',  icon: 'Bell',        color: 'amber',    sound: NC_SOUND.ALERTA,      adminRoute: '/admin/pedidos',     clientRoute: null },
  [NC_TYPES.STOCK_BAJO]:         { label: 'Stock Bajo',         icon: 'AlertTriangle',color: 'amber',   sound: NC_SOUND.INVENTARIO,  adminRoute: '/admin/inicio/alertas-stock', clientRoute: null },
  [NC_TYPES.PRODUCTO_AGOTADO]:   { label: 'Producto Agotado',   icon: 'Package',     color: 'red',      sound: NC_SOUND.INVENTARIO,  adminRoute: '/admin/inicio/alertas-stock', clientRoute: null },
  [NC_TYPES.RECLAMO_NUEVO]:      { label: 'Nuevo Reclamo',      icon: 'ShieldAlert', color: 'red',      sound: NC_SOUND.ALERTA,      adminRoute: '/admin/reclamos',    clientRoute: null },
  [NC_TYPES.ENCARGO_NUEVO]:      { label: 'Nuevo Encargo',      icon: 'Package',     color: 'purple',   sound: NC_SOUND.PEDIDO,      adminRoute: '/admin/pedidos',     clientRoute: null },
  [NC_TYPES.BIENVENIDA]:         { label: 'Bienvenida',         icon: 'Star',        color: 'primary',  sound: NC_SOUND.CUENTA,      adminRoute: null,                 clientRoute: '/tienda/catalogo' },
}

// ─── CREAR NOTIFICACIÓN CENTRAL ───────────────────────────────────────────────
/**
 * Único punto de entrada para emitir notificaciones en la plataforma.
 *
 * @param {Object} params
 * @param {string} params.recipientId   - Celular del cliente o ID del empleado (usar 'admin' para rol admin)
 * @param {string} params.recipientRole - Rol del destinatario (ej: 'admin', 'client', 'cocinero')
 * @param {string} params.title         - Título de la notificación
 * @param {string} params.body          - Cuerpo / mensaje
 * @param {string} params.type          - Clave de tipo (usar NC_TYPES)
 * @param {string} [params.orderId]     - ID del pedido relacionado
 * @param {string} [params.orderNumber] - Número legible del pedido
 * @param {string} [params.clickAction] - URL a abrir al hacer click
 * @param {string} [params.soundCategory] - Categoría de sonido (NC_SOUND)
 * @param {Object} [params.extra]       - Datos adicionales del contexto
 */
export async function createCentralNotification({
  recipientId,
  recipientRole,
  title,
  body,
  type,
  orderId = null,
  orderNumber = null,
  clickAction = null,
  soundCategory = null,
  extra = {}
}) {
  if (!recipientId || !recipientRole || !title || !body || !type) {
    console.warn('[NC] createCentralNotification: parámetros incompletos', { recipientId, recipientRole, type })
    return null
  }

  const meta = NC_TYPE_META[type] || {}
  const resolvedSound = soundCategory || meta.sound || NC_SOUND.PEDIDO
  const resolvedAction = clickAction || (recipientRole === 'client' ? meta.clientRoute : meta.adminRoute) || null

  try {
    const ref = await addDoc(collection(db, COL), {
      recipientId,
      recipientRole,
      title,
      body,
      type,
      orderId,
      orderNumber,
      clickAction: resolvedAction,
      soundCategory: resolvedSound,
      status: 'unread',
      createdAt: serverTimestamp(),
      ...extra
    })
    return ref.id
  } catch (error) {
    console.error('[NC] Error al crear notificación:', error)
    return null
  }
}

// ─── SUSCRIPCIONES EN TIEMPO REAL ─────────────────────────────────────────────

/**
 * Se suscribe a notificaciones no archivadas del recipiente.
 * Para clientes: usa recipientId (celular).
 * Para empleados o admin: usa recipientRole.
 *
 * @param {string} recipientId   - Celular, ID de empleado, o 'admin'
 * @param {string} recipientRole - Rol ('admin' | 'client' | 'cocinero' | etc.)
 * @param {Function} onUpdate    - Callback que recibe el array de notificaciones
 * @param {number} [maxItems=50] - Máximo de items a cargar
 * @returns {Function} - Función de unsuscribirse
 */
export function subscribeToCentralNotifications(recipientId, recipientRole, onUpdate, maxItems = 50) {
  if (!recipientId && !recipientRole) {
    onUpdate([])
    return () => {}
  }

  const isClient = recipientRole === 'client'
  
  let q
  if (isClient && recipientId) {
    q = query(
      collection(db, COL),
      where('recipientId', '==', recipientId),
      where('recipientRole', '==', 'client'),
      limit(maxItems * 2)
    )
  } else if (recipientRole) {
    q = query(
      collection(db, COL),
      where('recipientRole', '==', recipientRole),
      limit(maxItems * 2)
    )
  } else {
    onUpdate([])
    return () => {}
  }

  return onSnapshot(q, (snap) => {
    // Filtrar localmente en memoria las archivadas para evitar requerir índices compuestos de rango
    const items = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(n => n.status !== 'archived')
      .slice(0, maxItems)

    // Ordenar localmente por fecha descendente
    items.sort((a, b) => {
      const tA = a.createdAt?.toMillis?.() || 0
      const tB = b.createdAt?.toMillis?.() || 0
      return tB - tA
    })
    onUpdate(items)
  }, (error) => {
    console.error('[NC] Error en suscripción:', error)
    onUpdate([])
  })
}

/**
 * Suscripción para ADMINISTRADOR — recibe notificaciones de rol 'admin'
 * más notificaciones que los administradores necesitan ver de todos los tipos.
 */
export function subscribeToAdminNotifications(onUpdate) {
  return subscribeToCentralNotifications('admin', 'admin', onUpdate)
}

// ─── GESTIÓN DE ESTADOS ───────────────────────────────────────────────────────

/** Marca una notificación como leída */
export async function markAsRead(notificationId) {
  if (!notificationId) return
  try {
    await updateDoc(doc(db, COL, notificationId), { status: 'read' })
  } catch (error) {
    console.error('[NC] Error al marcar como leída:', error)
  }
}

/** Marca todas las notificaciones no leídas de un recipiente como leídas */
export async function markAllAsRead(recipientId, recipientRole) {
  if (!recipientId && !recipientRole) return
  try {
    const isClient = recipientRole === 'client'
    let q
    if (isClient && recipientId) {
      q = query(
        collection(db, COL),
        where('recipientId', '==', recipientId),
        where('status', '==', 'unread')
      )
    } else {
      q = query(
        collection(db, COL),
        where('recipientRole', '==', recipientRole),
        where('status', '==', 'unread')
      )
    }
    const snap = await getDocs(q)
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.update(d.ref, { status: 'read' }))
    await batch.commit()
  } catch (error) {
    console.error('[NC] Error al marcar todas como leídas:', error)
  }
}

/** Archiva una notificación (desaparece de la bandeja activa pero queda en historial) */
export async function archiveNotification(notificationId) {
  if (!notificationId) return
  try {
    await updateDoc(doc(db, COL, notificationId), { status: 'archived' })
  } catch (error) {
    console.error('[NC] Error al archivar:', error)
  }
}

/** Archiva todas las notificaciones de un recipiente */
export async function archiveAll(recipientId, recipientRole) {
  if (!recipientId && !recipientRole) return
  try {
    const isClient = recipientRole === 'client'
    let q
    if (isClient && recipientId) {
      q = query(
        collection(db, COL),
        where('recipientId', '==', recipientId)
      )
    } else {
      q = query(
        collection(db, COL),
        where('recipientRole', '==', recipientRole)
      )
    }
    const snap = await getDocs(q)
    const batch = writeBatch(db)
    snap.docs.forEach(d => {
      if (d.data().status !== 'archived') {
        batch.update(d.ref, { status: 'archived' })
      }
    })
    await batch.commit()
  } catch (error) {
    console.error('[NC] Error al archivar todas:', error)
  }
}

// ─── GESTIÓN DE TOKENS FCM ────────────────────────────────────────────────────

/**
 * Registra o actualiza el token FCM de un usuario/dispositivo en Firestore.
 *
 * @param {string} userId         - ID del usuario (celular para clientes, uid para admin, employeeId para empleados)
 * @param {string} role           - Rol del usuario
 * @param {string} token          - Token FCM del dispositivo
 * @param {Object} platformInfo   - Información del dispositivo/plataforma
 */
export async function saveFCMToken(userId, role, token, platformInfo = {}) {
  if (!userId || !token) return
  try {
    const tokenId = `${userId}_${btoa(token).slice(0, 20)}`
    const ref = doc(db, COL_TOKENS, tokenId)
    await updateDoc(ref, {
      userId,
      role,
      token,
      platform: platformInfo.platform || navigator.platform || 'web',
      userAgent: platformInfo.userAgent || navigator.userAgent?.slice(0, 200) || '',
      browser: platformInfo.browser || getBrowserName(),
      lastActive: serverTimestamp(),
      isValid: true
    }).catch(async () => {
      // Si no existe, crear
      const { setDoc } = await import('firebase/firestore')
      await setDoc(ref, {
        userId,
        role,
        token,
        platform: platformInfo.platform || navigator.platform || 'web',
        userAgent: platformInfo.userAgent || navigator.userAgent?.slice(0, 200) || '',
        browser: platformInfo.browser || getBrowserName(),
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        isValid: true
      })
    })
  } catch (error) {
    console.error('[NC] Error al guardar token FCM:', error)
  }
}

/** Invalida un token FCM específico */
export async function invalidateFCMToken(token) {
  if (!token) return
  try {
    const q = query(collection(db, COL_TOKENS), where('token', '==', token))
    const snap = await getDocs(q)
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.update(d.ref, { isValid: false }))
    await batch.commit()
  } catch (error) {
    console.error('[NC] Error al invalidar token:', error)
  }
}

/** Obtiene todos los tokens válidos de un usuario */
export async function getUserFCMTokens(userId) {
  if (!userId) return []
  try {
    const q = query(
      collection(db, COL_TOKENS),
      where('userId', '==', userId),
      where('isValid', '==', true)
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('[NC] Error al obtener tokens:', error)
    return []
  }
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

function getBrowserName() {
  const ua = navigator.userAgent
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return 'Desconocido'
}

/**
 * Obtiene las notificaciones históricas completas (incluye archivadas) de un recipiente.
 * Para el panel de Centro de Notificaciones.
 */
export async function getNotificationHistory(recipientId, recipientRole, maxItems = 100) {
  const isClient = recipientRole === 'client'
  try {
    let q
    if (isClient && recipientId) {
      q = query(
        collection(db, COL),
        where('recipientId', '==', recipientId),
        where('recipientRole', '==', 'client'),
        orderBy('createdAt', 'desc'),
        limit(maxItems)
      )
    } else {
      q = query(
        collection(db, COL),
        where('recipientRole', '==', recipientRole),
        orderBy('createdAt', 'desc'),
        limit(maxItems)
      )
    }
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('[NC] Error al obtener historial:', error)
    return []
  }
}

// ─── COMPATIBILIDAD CON SISTEMAS LEGACY ──────────────────────────────────────
// Estas funciones mantienen compatibilidad con el código existente que aún
// usa clientNotificationService.js y creditService.subscribeToNotifications.
// Se migrarán progresivamente al NC.

/**
 * Crea una notificación de cliente (wrapper de compatibilidad).
 * Reemplaza clientNotificationService.createClientNotification.
 */
export async function createClientNotification({ clienteCelular, message, type, orderId = null, orderNumber = null }) {
  if (!clienteCelular || clienteCelular === 'Desconocido') return

  const typeMap = {
    'status': NC_TYPES.PEDIDO_ESTADO,
    'abono': NC_TYPES.ABONO_RECIBIDO,
    'credito': NC_TYPES.CREDITO_APROBADO,
  }
  const ncType = typeMap[type] || NC_TYPES.PEDIDO_ESTADO
  const meta = NC_TYPE_META[ncType] || {}

  return createCentralNotification({
    recipientId: clienteCelular,
    recipientRole: 'client',
    title: meta.label || 'Actualización',
    body: message,
    type: ncType,
    orderId,
    orderNumber,
  })
}
