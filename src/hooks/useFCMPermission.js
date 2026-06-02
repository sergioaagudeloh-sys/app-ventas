/**
 * useFCMPermission.js
 * ─────────────────────────────────────────────────────────────────
 * Hook inteligente para gestionar permisos push de forma no intrusiva.
 * NO solicita permisos de forma automática para evitar el bloqueo del navegador.
 * Permite disparar la solicitud a través de una acción voluntaria del usuario.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useCallback } from 'react'
import { messaging } from '../config/firebaseConfig'
import { getToken } from 'firebase/messaging'
import { saveFCMToken } from '../services/notificationCenterService'

export default function useFCMPermission(userId, role) {
  const [fcmToken, setFcmToken] = useState(null)
  const [permissionStatus, setPermissionStatus] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }
    return 'unsupported'
  })

  // Refrescar el estado del permiso en caliente
  const refreshPermissionStatus = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission)
      return Notification.permission
    }
    return 'unsupported'
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('[FCM Hook] Las notificaciones no están soportadas en este navegador.')
      setPermissionStatus('unsupported')
      return 'unsupported'
    }

    try {
      const permission = await Notification.requestPermission()
      setPermissionStatus(permission)

      if (permission === 'granted') {
        if (!messaging) {
          console.warn('[FCM Hook] El servicio FCM no está inicializado o soportado.')
          return 'granted'
        }

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY

        // Validar si la VAPID key tiene la longitud y formato correcto para evitar excepciones en el navegador
        if (!vapidKey || vapidKey.length < 80 || vapidKey.includes('placeholder')) {
          console.warn('[FCM Hook] VAPID Key no configurada o inválida. Las notificaciones push en segundo plano (FCM) están inactivas.')
          return 'granted'
        }

        const token = await getToken(messaging, { vapidKey })

        if (token) {
          setFcmToken(token)
          await saveFCMToken(userId, role, token, {
            platform: navigator.platform,
            userAgent: navigator.userAgent
          })
          return 'granted'
        }
      }
      return permission
    } catch (error) {
      if (error.code === 'messaging/failed-service-worker-registration' || error.message?.includes('service-worker-registration') || window.location.hostname === 'localhost') {
        console.warn('[FCM Hook] Las notificaciones push FCM no están activas en este entorno (común en localhost o sin HTTPS):', error.message || error)
      } else {
        console.error('[FCM Hook] Error al solicitar permisos FCM:', error)
      }
      return 'denied'
    }
  }, [userId, role])

  // Obtener token silenciosamente ÚNICAMENTE si el permiso ya fue concedido previamente
  useEffect(() => {
    if (permissionStatus === 'granted' && userId && role && messaging) {
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY

      if (!vapidKey || vapidKey.length < 80 || vapidKey.includes('placeholder')) {
        return
      }

      getToken(messaging, { vapidKey }).then(async (token) => {
        if (token) {
          setFcmToken(token)
          await saveFCMToken(userId, role, token, {
            platform: navigator.platform,
            userAgent: navigator.userAgent
          })
        }
      }).catch(err => {
        if (err.code === 'messaging/failed-service-worker-registration' || err.message?.includes('service-worker-registration') || window.location.hostname === 'localhost') {
          console.log('[FCM Hook] Notificaciones push inactivas en local (esperado en localhost/HTTP).')
        } else {
          console.warn('[FCM Hook] Error obteniendo token silencioso:', err.message || err)
        }
      })
    }
  }, [permissionStatus, userId, role])

  return {
    fcmToken,
    permissionStatus,
    requestPermission,
    refreshPermissionStatus,
    isSupported: permissionStatus !== 'unsupported'
  }
}
