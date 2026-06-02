/**
 * useNotificationCenter.js
 * ─────────────────────────────────────────────────────────────────
 * Hook unificado del Notification Center.
 *
 * Se suscribe en tiempo real a la colección 'notifications' de Firestore
 * para el recipiente activo, procesa sonidos por categoría, y distingue
 * entre notificaciones nuevas (no vistas en esta sesión) y existentes.
 *
 * Uso:
 *   const { notifications, unreadCount, isRinging, markRead, clearAll } =
 *     useNotificationCenter({ recipientId, recipientRole })
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  subscribeToCentralNotifications,
  markAsRead,
  markAllAsRead,
  archiveAll,
  NC_TYPE_META,
} from '../services/notificationCenterService'
import { playSynthesizedSound } from '../utils/audio'

/**
 * @param {Object} params
 * @param {string} params.recipientId    - Celular, employeeId o 'admin'
 * @param {string} params.recipientRole  - 'admin' | 'client' | 'cocinero' | etc.
 * @param {boolean} [params.soundEnabled] - Si se reproducen sonidos (default: true)
 * @param {number} [params.maxItems]     - Máx de notificaciones a cargar (default: 50)
 */
export default function useNotificationCenter({
  recipientId,
  recipientRole,
  soundEnabled = true,
  maxItems = 50,
} = {}) {
  const [notifications, setNotifications] = useState([])
  const [isRinging, setIsRinging] = useState(false)

  // IDs vistos en esta sesión para disparar sonido solo en nuevas
  const seenIdsRef = useRef(new Set())
  const isInitializedRef = useRef(false)

  // Ref para sonido habilitado (evita stale closure)
  const soundEnabledRef = useRef(soundEnabled)
  useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])

  const triggerRing = useCallback(() => {
    setIsRinging(true)
    const t = setTimeout(() => setIsRinging(false), 2000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!recipientId && !recipientRole) return

    isInitializedRef.current = false

    const unsub = subscribeToCentralNotifications(
      recipientId,
      recipientRole,
      (items) => {
        if (!isInitializedRef.current) {
          // Primera carga: registrar todos como vistos sin disparar sonidos
          items.forEach(n => seenIdsRef.current.add(n.id))
          isInitializedRef.current = true
          setNotifications(items)
          return
        }

        // Detectar notificaciones genuinamente nuevas
        const newItems = items.filter(n => !seenIdsRef.current.has(n.id))

        if (newItems.length > 0) {
          // Registrar como vistos
          newItems.forEach(n => seenIdsRef.current.add(n.id))

          // Usar el sonido de la primera notificación nueva (más reciente)
          const firstNew = newItems[0]
          const meta = NC_TYPE_META[firstNew.type] || {}
          const sound = firstNew.soundCategory || meta.sound || 'pedido'
          playSynthesizedSound(sound, soundEnabledRef.current)
          triggerRing()
        }

        setNotifications(items)
      },
      maxItems
    )

    return () => {
      unsub()
      isInitializedRef.current = false
    }
  }, [recipientId, recipientRole, maxItems, triggerRing])

  // ─── Contadores ────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => n.status === 'unread').length

  // ─── Acciones ──────────────────────────────────────────────────────────────
  const markRead = useCallback((notificationId) => {
    markAsRead(notificationId)
  }, [])

  const markAllRead = useCallback(() => {
    markAllAsRead(recipientId, recipientRole)
  }, [recipientId, recipientRole])

  const clearAll = useCallback(() => {
    archiveAll(recipientId, recipientRole)
  }, [recipientId, recipientRole])

  return {
    notifications,
    unreadCount,
    isRinging,
    markRead,
    markAllRead,
    clearAll,
  }
}
