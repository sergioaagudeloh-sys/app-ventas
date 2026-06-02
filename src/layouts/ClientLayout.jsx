import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Heart, Package, CreditCard, User, Tag, X, Bell } from 'lucide-react'
import useAppConfigStore from '../store/appConfigStore'
import useCartStore from '../store/cartStore'
import useAuthStore from '../store/authStore'
import useFavoritesStore from '../store/favoritesStore'
import { useEffect, useState, useRef, useMemo } from 'react'
import useInactivityTimer from '../hooks/useInactivityTimer'
import SmartHint from '../components/client/guided/SmartHint'
import ClientCouponsModal from '../components/client/coupons/ClientCouponsModal'
import { useCoupons } from '../hooks/useCoupons'

import useNotificationCenter from '../hooks/useNotificationCenter'
import useFCMPermission from '../hooks/useFCMPermission'
import NotificationHistoryTray from '../components/common/NotificationHistoryTray'
import NCToastContainer from '../components/common/NCToastContainer'

const NAV_ITEMS_LEFT = [
  { path: '/tienda/catalogo', icon: ShoppingCart, label: 'Catálogo' },
  { path: '/tienda/favoritos', icon: Heart, label: 'Favoritos' },
]

const NAV_ITEMS_RIGHT = [
  { path: '/tienda/pedidos', icon: Package, label: 'Pedidos' },
  { path: '/tienda/creditos', icon: CreditCard, label: 'Créditos' },
]

const ALL_NAV_ITEMS = [
  { path: '/tienda/catalogo', icon: ShoppingCart, label: 'Catálogo' },
  { path: '/tienda/favoritos', icon: Heart, label: 'Favoritos' },
  { path: '/tienda/pedidos', icon: Package, label: 'Pedidos' },
  { path: '/tienda/creditos', icon: CreditCard, label: 'Créditos' },
  { path: '/tienda/perfil', icon: User, label: 'Perfil' },
]

export default function ClientLayout() {
  const { appName, appIcon, creditsEnabled, couponsEnabled } = useAppConfigStore()
  const { getCount, openCart, isOpen: isCartOpen } = useCartStore()
  const { user } = useAuthStore()
  const { subscribe, unsubscribe } = useFavoritesStore()
  const navigate = useNavigate()

  const navItemsRight = useMemo(() => {
    return NAV_ITEMS_RIGHT.filter(item => item.path !== '/tienda/creditos' || creditsEnabled)
  }, [creditsEnabled])

  const allNavItems = useMemo(() => {
    return ALL_NAV_ITEMS.filter(item => item.path !== '/tienda/creditos' || creditsEnabled)
  }, [creditsEnabled])

  const [isCouponsOpen, setIsCouponsOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const cartCount = getCount()
  const userId = user?.celular || user?.uid

  // Sincronizar el permiso y tokens de FCM para Cliente
  const { requestPermission } = useFCMPermission(user?.celular || 'client', 'client')

  useEffect(() => {
    if (user?.celular) {
      requestPermission()
    }
  }, [user?.celular, requestPermission])

  // Hook central del Notification Center para Clientes
  const [soundEnabled, setSoundEnabled] = useState(true)
  const {
    notifications,
    unreadCount,
    isRinging,
    markRead,
    markAllRead,
    clearAll
  } = useNotificationCenter({
    recipientId: user?.celular || 'client',
    recipientRole: 'client',
    soundEnabled
  })

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

  // Conteo de cupones activos
  const { data: allCoupons = [] } = useCoupons()
  const activeCouponsCount = useMemo(() => {
    const now = new Date()
    return allCoupons.filter(c => {
      if (!c.activo && !c.active) return false
      const expDate = c.fechaExpiracion || c.endDate
      if (expDate) {
        const d = new Date(expDate)
        if (!isNaN(d) && d < now) return false
      }
      return true
    }).length
  }, [allCoupons])

  // Inactividad: 10s si hay items pero el carrito está cerrado
  const { isInactive: isCartInactive } = useInactivityTimer(10000, cartCount > 0 && !isCartOpen)

  useEffect(() => {
    if (userId) {
      subscribe(userId)
    } else {
      unsubscribe()
    }
  }, [userId, subscribe, unsubscribe])

  const handleToastClick = (toast) => {
    setToasts(prev => prev.filter(t => t.id !== toast.id))
    if (toast.clickAction) {
      navigate(toast.clickAction)
    }
  }

  return (
    <div className="min-h-screen bg-app flex w-full max-w-[100vw] overflow-x-hidden">
      {/* Contenedor de Toasts Unificado del NC */}
      <NCToastContainer
        toasts={toasts}
        onCloseToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
        onToastClick={handleToastClick}
      />

      {/* ─── SIDEBAR DESKTOP ────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-surface border-r border-app z-30 shadow-sm"
        aria-label="Navegación del cliente"
      >
        {/* Header del sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-app gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {appIcon ? (
              <img
                src={appIcon}
                alt={`Logo ${appName}`}
                className="w-10 h-10 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <ShoppingCart size={18} className="text-white" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-sm text-app truncate leading-tight">{appName}</p>
              <p className="text-[10px] text-muted truncate">Tienda Virtual</p>
            </div>
          </div>

          {/* Carrito y Campana de notificaciones (Desktop Sidebar) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Carrito de Compras Permanente */}
            <button
              onClick={openCart}
              className="relative w-8 h-8 rounded-lg bg-surface-2 border border-app flex items-center justify-center text-muted hover:text-app transition-all hover:scale-105 active:scale-95"
              aria-label="Carrito de compras"
            >
              <ShoppingCart size={14} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Campana de notificaciones */}
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
        </div>

        {/* Navegación Sidebar */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {allNavItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive ? 'bg-primary text-white shadow-sm' : 'text-app hover:bg-surface-2'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} />
                  <span>{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="client-active-pill"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Popover / Cajón Lateral de Notificaciones Responsivo al 100% */}
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
              className="fixed right-0 top-0 h-screen w-full md:w-96 z-50 shadow-2xl"
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
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen w-full max-w-[100vw] md:max-w-none overflow-x-hidden relative flex flex-col">
        {/* Cabecera superior móvil premium */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md z-30 sticky top-0 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] shrink-0">
          <div className="flex items-center gap-2.5">
            {appIcon ? (
              <img
                src={appIcon}
                alt={`Logo ${appName}`}
                className="w-9 h-9 rounded-xl object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <ShoppingCart size={18} className="text-white" />
              </div>
            )}
            <span className="font-black text-sm text-app tracking-tight">{appName}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Carrito de Compras Permanente en Header Móvil */}
            <button
              onClick={openCart}
              className="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-muted hover:text-app transition-all hover:scale-105 active:scale-95"
              aria-label="Carrito de compras"
            >
              <ShoppingCart size={16} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center border-2 border-white animate-bounce [animation-duration:3s]">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Campana de Notificaciones en Header Móvil */}
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-muted hover:text-app transition-all hover:scale-105 active:scale-95"
              aria-label="Campana de Notificaciones"
            >
              <motion.div
                animate={isRinging ? { rotate: [0, -20, 18, -14, 10, -6, 4, 0] } : {}}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                <Bell size={16} />
              </motion.div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Avatar de Perfil en Header Móvil */}
            <NavLink
              to="/tienda/perfil"
              className={({ isActive }) =>
                `w-9 h-9 rounded-xl border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                  isActive 
                    ? 'bg-primary text-white border-primary shadow-sm ring-1 ring-white/20 ring-inset' 
                    : 'bg-slate-50 border-slate-100 text-muted hover:text-app'
                }`
              }
              aria-label="Mi Perfil"
            >
              <User size={16} />
            </NavLink>
          </div>
        </header>

        <div className="flex-1 w-full relative">
          <Outlet />
        </div>
      </main>

      {/* ─── BARRA DE NAVEGACIÓN INFERIOR (MOBILE) ───────────────────────── */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-app z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2">
        {NAV_ITEMS_LEFT.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 relative ${
                isActive ? 'text-primary' : 'text-muted hover:text-app'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="client-nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                  />
                )}
                <Icon size={20} aria-hidden="true" />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Botón Central Ofertas / Cupones Rediseñado */}
        {couponsEnabled && (
          <div className="flex-1 flex flex-col items-center justify-start relative">
            <div className="flex flex-col items-center justify-center -translate-y-3">
              <motion.button
                onClick={() => setIsCouponsOpen(true)}
                animate={{
                  scale: [1, 1.04, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                whileTap={{ scale: 0.94 }}
                className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border-4 border-surface relative overflow-visible select-none shrink-0"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="Ofertas y Cupones"
              >
                {/* Shimmer de brillo diagonal flotante infinito */}
                <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-infinite pointer-events-none" />
                </div>

                {/* Icono de Tag a 28px con animación de wiggle infinito */}
                <div className="animate-wiggle-infinite flex items-center justify-center pointer-events-none z-10">
                  <Tag size={28} className="text-white" />
                </div>

                {/* Badge de contador duplicado (w-7 h-7) con fuente 14px posicionado en top-[-6px] y right-[-6px] */}
                {activeCouponsCount > 0 && (
                  <span className="absolute -top-[6px] -right-[6px] bg-red-500 text-white text-[14px] font-black rounded-full w-7 h-7 flex items-center justify-center border-2 border-surface animate-bounce shadow-md z-20">
                    {activeCouponsCount}
                  </span>
                )}
              </motion.button>
            </div>
          </div>
        )}

        {navItemsRight.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 relative ${
                isActive ? 'text-primary' : 'text-muted hover:text-app'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="client-nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                  />
                )}
                <Icon size={20} aria-hidden="true" />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Modal de Cupones */}
      {couponsEnabled && (
        <ClientCouponsModal isOpen={isCouponsOpen} onClose={() => setIsCouponsOpen(false)} />
      )}

      {/* Insinuación Inteligente del Carrito Flotante (Inactividad) */}
      {cartCount > 0 && (
        <SmartHint
          isInactive={isCartInactive}
          cartCount={cartCount}
          onOpenCart={openCart}
        />
      )}
    </div>
  )
}
