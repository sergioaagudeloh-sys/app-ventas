import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Wifi, Bell } from 'lucide-react'
import usePortalStore from '../store/portalStore'
import { ROLES, PORTAL_CONFIG } from '../constants'
import { useEffect, useState } from 'react'

import useNotificationCenter from '../hooks/useNotificationCenter'
import useFCMPermission from '../hooks/useFCMPermission'
import NCToastContainer from '../components/common/NCToastContainer'
import NotificationHistoryTray from '../components/common/NotificationHistoryTray'
import { AnimatePresence, motion } from 'framer-motion'

export default function PortalLayout() {
  const { portalEmployee, clearPortalEmployee, currentLogId } = usePortalStore()
  const nav = useNavigate()
  const config = PORTAL_CONFIG[portalEmployee?.rol] || { color: 'var(--color-primary)', emoji: '👤', label: 'Portal', labelCorto: 'Portal' }

  // Sincronizar el permiso y tokens de FCM para Empleados (usando su employeeId o celular)
  const { requestPermission } = useFCMPermission(portalEmployee?.celular || portalEmployee?.id || 'employee', portalEmployee?.rol || 'employee')

  useEffect(() => {
    if (portalEmployee) {
      requestPermission()
    }
  }, [portalEmployee, requestPermission])

  // Hook central del Notification Center para el rol específico
  const [soundEnabled, setSoundEnabled] = useState(true)
  const {
    notifications,
    unreadCount,
    isRinging,
    markRead,
    markAllRead,
    clearAll
  } = useNotificationCenter({
    recipientId: portalEmployee?.celular || portalEmployee?.id || 'employee',
    recipientRole: portalEmployee?.rol || 'employee',
    soundEnabled
  })

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [toasts, setToasts] = useState([])

  // Generar toasts en tiempo real cuando llega una notificación no leída genuinamente nueva
  useEffect(() => {
    const unread = notifications.filter(n => n.status === 'unread')
    if (unread.length > 0) {
      const mostRecent = unread[0]
      setToasts(prev => {
        if (prev.some(t => t.id === mostRecent.id)) return prev
        const newToast = {
          id: mostRecent.id,
          title: mostRecent.title,
          body: mostRecent.body,
          clickAction: mostRecent.clickAction
        }
        setTimeout(() => {
          setToasts(current => current.filter(t => t.id !== mostRecent.id))
        }, 5000)
        return [...prev, newToast]
      })
    }
  }, [notifications])

  const handleLogout = async () => {
    if (currentLogId) {
      try {
        const { logLogout } = await import('../services/accessLogService')
        await logLogout(currentLogId)
      } catch (e) {
        console.error('Error logging logout:', e)
      }
    }
    clearPortalEmployee()
    nav('/portal/auth', { replace: true })
  }

  const handleToastClick = (toast) => {
    setToasts(prev => prev.filter(t => t.id !== toast.id))
    if (toast.clickAction) {
      nav(toast.clickAction)
    }
  }

  return (
    <div className="portal-layout" style={{ '--accent-color': config.color }}>
      {/* Contenedor de Toasts del NC */}
      <NCToastContainer
        toasts={toasts}
        onCloseToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
        onToastClick={handleToastClick}
      />

      <header className="portal-header relative">
        <div className="portal-header-info">
          <div 
            className="portal-role-badge" 
            style={{ 
              background: config.colorBg || 'rgba(128,128,128,0.1)', 
              border: `1px solid ${config.colorBorder || 'rgba(128,128,128,0.2)'}`, 
              color: config.color 
            }}
          >
            {config.emoji} {config.label}
          </div>
          <span className="portal-employee-name">{portalEmployee?.nombre || '—'}</span>
        </div>

        <div className="portal-header-actions">
          {/* Campana de Notificaciones en el portal */}
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 rounded-xl bg-surface-2 border border-app flex items-center justify-center text-muted hover:text-app transition-all hover:scale-105 active:scale-95"
            aria-label="Campana de Notificaciones"
          >
            <motion.div
              animate={isRinging ? { rotate: [0, -20, 18, -14, 10, -6, 4, 0] } : {}}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            >
              <Bell size={16} />
            </motion.div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <span className="portal-online-dot">
            <Wifi size={14} />
            En línea
          </span>
          <button onClick={handleLogout} className="portal-logout-btn" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Popover de Notificaciones Lateral en el Portal */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsNotificationsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 h-screen w-full md:w-80 z-50 shadow-2xl"
            >
              <NotificationHistoryTray
                notifications={notifications}
                unreadCount={unreadCount}
                soundEnabled={soundEnabled}
                onToggleSound={() => setSoundEnabled(!soundEnabled)}
                onMarkRead={markRead}
                onMarkAllRead={markAllRead}
                onClearAll={clearAll}
                onClose={() => setIsNotificationsOpen(false)}
                onNavigate={(path) => {
                  setIsNotificationsOpen(false)
                  nav(path)
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="portal-main">
        <Outlet />
      </main>
    </div>
  )
}
