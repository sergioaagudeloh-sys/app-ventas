import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  Settings,
  LogOut,
  Store,
  Bell,
  X,
  ShieldAlert,
  QrCode
} from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebaseConfig'
import useAppConfigStore from '../store/appConfigStore'
import useAuthStore from '../store/authStore'
import { useEffect, useState, useMemo } from 'react'

import useNotificationCenter from '../hooks/useNotificationCenter'
import useFCMPermission from '../hooks/useFCMPermission'
import NotificationHistoryTray from '../components/common/NotificationHistoryTray'
import NCToastContainer from '../components/common/NCToastContainer'

const NAV_ITEMS = [
  { path: '/admin/inicio', icon: LayoutDashboard, label: 'Inicio' },
  { path: '/admin/inventario', icon: Package, label: 'Inventario' },
  { path: '/admin/ventas', icon: ShoppingCart, label: 'Venta' },
  { path: '/admin/pedidos', icon: ShoppingBag, label: 'Pedidos' },
  { path: '/admin/configuracion', icon: Settings, label: 'Config.' },
]

export default function AdminLayout() {
  const { appName, appIcon, creditsEnabled } = useAppConfigStore()
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  // Sincronizar el permiso y tokens de FCM para Admin
  const { requestPermission } = useFCMPermission(user?.uid || 'admin', 'admin')

  // Solicitar permiso FCM automáticamente al entrar
  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  // Hook centralizado del Notification Center
  const [soundEnabled, setSoundEnabled] = useState(true)
  const {
    notifications,
    unreadCount,
    isRinging,
    markRead,
    markAllRead,
    clearAll
  } = useNotificationCenter({
    recipientId: 'admin',
    recipientRole: 'admin',
    soundEnabled
  })

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [toasts, setToasts] = useState([])

  // Generar toasts en tiempo real cuando llega una notificación no leída genuinamente nueva
  useEffect(() => {
    const unread = notifications.filter(n => n.status === 'unread')
    if (unread.length > 0) {
      const mostRecent = unread[0]
      // Evitar duplicados en Toasts activos
      setToasts(prev => {
        if (prev.some(t => t.id === mostRecent.id)) return prev
        const newToast = {
          id: mostRecent.id,
          title: mostRecent.title,
          body: mostRecent.body,
          clickAction: mostRecent.clickAction
        }
        // Auto-remover en 5 segundos
        setTimeout(() => {
          setToasts(current => current.filter(t => t.id !== mostRecent.id))
        }, 5000)
        return [...prev, newToast]
      })
    }
  }, [notifications])

  // Navegación adaptativa según feature flags de módulos
  const filteredNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
      if (item.path.includes('credito') && !creditsEnabled) return false
      return true
    })
  }, [creditsEnabled])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      logout()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const handleToastClick = (toast) => {
    setToasts(prev => prev.filter(t => t.id !== toast.id))
    if (toast.clickAction) {
      navigate(toast.clickAction)
    }
  }

  return (
    <div className="min-h-screen bg-app flex w-full max-w-[100vw] overflow-x-hidden">
      {/* Container de Toasts Unificado del Notification Center */}
      <NCToastContainer
        toasts={toasts}
        onCloseToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
        onToastClick={handleToastClick}
      />

      {/* ─── SIDEBAR DESKTOP (hidden en mobile) ─────────────────────────── */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-surface border-r border-app z-40 shadow-sm"
        aria-label="Navegación del administrador"
      >
        {/* Header del sidebar */}
        <div className="flex items-center justify-between p-6 border-b border-app relative">
          <div className="flex items-center gap-3">
            {appIcon ? (
              <img
                src={appIcon}
                alt={`Logo ${appName}`}
                className="w-9 h-9 rounded-xl object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Store size={18} className="text-white" aria-hidden="true" />
              </div>
            )}
            <div>
              <p className="font-bold text-sm text-app leading-tight">{appName}</p>
              <p className="text-xs text-muted">Panel Admin</p>
            </div>
          </div>

          {/* Campana de Notificaciones (Desktop) */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative w-8 h-8 rounded-lg bg-surface-2 border border-app flex items-center justify-center text-muted hover:text-app transition-all hover:scale-105 active:scale-95"
              aria-label="Notificaciones"
            >
              <motion.div
                animate={isRinging ? { rotate: [0, -20, 18, -14, 10, -6, 4, 0] } : {}}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                <Bell size={14} />
              </motion.div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Secciones">
          {filteredNavItems.map(({ path, icon: Icon, label }) => {
            const isConfig = path === '/admin/configuracion'
            return (
              <NavLink
                key={path}
                to={path}
                onClick={() => {
                  if (isConfig && window.location.pathname === path) {
                    window.dispatchEvent(new CustomEvent('reset-settings-menu'))
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-app hover:bg-surface-2'
                  }`
                }
                aria-label={`Ir a ${label}`}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} aria-hidden="true" />
                    <span>{label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="admin-active-pill"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
                      />
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-app">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted hover:bg-surface-2 hover:text-app transition-all duration-300 active:scale-95"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Popover / Cajón Lateral de Notificaciones (Desktop) */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setIsNotificationsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
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
                  navigate(path)
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── CONTENIDO PRINCIPAL ────────────────────────────────────────── */}
      <main
        className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen w-full max-w-[100vw] md:max-w-none overflow-x-hidden"
        id="main-content"
      >
        <Outlet />
      </main>

      {/* ─── NAVBOTTOM MOBILE (hidden en desktop) ───────────────────────── */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-app z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2"
        aria-label="Navegación inferior administrador"
      >
        {filteredNavItems.map(({ path, icon: Icon, label }) => {
          const isVentas = path === '/admin/ventas'
          const isConfig = path === '/admin/configuracion'

          const handleNavClick = (e, isActive) => {
            if (isConfig && isActive) {
              window.dispatchEvent(new CustomEvent('reset-settings-menu'))
            }
          }

          if (isVentas) {
            return (
              <NavLink
                key={path}
                to={path}
                onClick={(e) => handleNavClick(e, window.location.pathname === path)}
                className="flex-1 flex flex-col items-center justify-start relative group"
                aria-label={label}
              >
                {({ isActive }) => (
                  <div className="flex flex-col items-center justify-center -translate-y-3">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 active:scale-90 border-4 border-surface bg-primary ${
                      isActive 
                        ? 'text-white scale-105' 
                        : 'text-white/80 hover:scale-105'
                    }`}>
                      <Icon size={26} aria-hidden="true" />
                    </div>
                  </div>
                )}
              </NavLink>
            )
          }

          return (
            <NavLink
              key={path}
              to={path}
              onClick={(e) => handleNavClick(e, window.location.pathname === path)}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 relative ${
                  isActive ? 'text-primary' : 'text-muted'
                }`
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="admin-nav-indicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                    />
                  )}
                  <Icon size={20} aria-hidden="true" />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Botón Flotante de Notificaciones en Mobile (esquina superior derecha, hidden en desktop) */}
      <div className="md:hidden fixed top-4 right-4 z-40">
        <button
          onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          className="w-11 h-11 rounded-2xl bg-primary text-white shadow-xl flex items-center justify-center relative active:scale-90 transition-all hover:opacity-90"
          aria-label="Notificaciones Mobile"
        >
          <motion.div
            animate={isRinging ? { rotate: [0, -20, 18, -14, 10, -6, 4, 0] } : {}}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            <Bell size={18} />
          </motion.div>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-surface">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
