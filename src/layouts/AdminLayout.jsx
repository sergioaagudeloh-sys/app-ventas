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
  ShieldAlert
} from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebaseConfig'
import useAppConfigStore from '../store/appConfigStore'
import useAuthStore from '../store/authStore'
import { useEffect, useState, useMemo } from 'react'
import { subscribeToOrders } from '../services/orderService'
import { subscribeToNotifications } from '../services/creditService'
import { subscribeToClaims } from '../services/claimsService'
import { subscribeToWholesaleRequests } from '../services/wholesaleService'
import { formatCurrency } from '../utils/formatters'
import { playAdminSound } from '../utils/audio'
import { ORDER_STATES } from '../constants'

const NAV_ITEMS = [
  { path: '/admin/inicio', icon: LayoutDashboard, label: 'Inicio' },
  { path: '/admin/inventario', icon: Package, label: 'Inventario' },
  { path: '/admin/ventas', icon: ShoppingCart, label: 'Venta' },
  { path: '/admin/pedidos', icon: ShoppingBag, label: 'Pedidos' },
  { path: '/admin/configuracion', icon: Settings, label: 'Config.' },
]

/**
 * Layout principal del Administrador.
 * Desktop: sidebar izquierdo fijo.
 * Mobile: barra de navegación inferior.
 * Exclusión mutua garantizada (Guía Maestra §3.6).
 */
export default function AdminLayout() {
  const { appName, appIcon, creditsEnabled } = useAppConfigStore()
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  // Navegación adaptativa según feature flags de módulos
  const filteredNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
      // Si la ruta contiene credito y creditsEnabled es falso, la removemos
      if (item.path.includes('credito') && !creditsEnabled) return false
      return true
    })
  }, [creditsEnabled])

  // Notificaciones Globales del Administrador
  const [notifications, setNotifications] = useState([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [isRinging, setIsRinging] = useState(false)

  // Persistir IDs de pedidos ya notificados en localStorage para sobrevivir recargas/HMR
  const getSeenOrders = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem('admin_seen_orders') || '[]'))
    } catch { return new Set() }
  }
  const markOrderSeen = (id) => {
    try {
      const seen = getSeenOrders()
      seen.add(id)
      const arr = Array.from(seen).slice(-500)
      localStorage.setItem('admin_seen_orders', JSON.stringify(arr))
    } catch {}
  }

  // Persistir IDs de solicitudes especiales (wholesale)
  const getSeenWholesale = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem('admin_seen_wholesale') || '[]'))
    } catch { return new Set() }
  }
  const markWholesaleSeen = (id) => {
    try {
      const seen = getSeenWholesale()
      seen.add(id)
      const arr = Array.from(seen).slice(-500)
      localStorage.setItem('admin_seen_wholesale', JSON.stringify(arr))
    } catch {}
  }

  // Persistir estados previos de mayorista/encargo para detectar cambios
  const getWholesaleStates = () => {
    try {
      return JSON.parse(localStorage.getItem('admin_wholesale_states') || '{}')
    } catch { return {} }
  }
  const updateWholesaleStateCache = (id, state) => {
    try {
      const states = getWholesaleStates()
      states[id] = state
      localStorage.setItem('admin_wholesale_states', JSON.stringify(states))
    } catch {}
  }

  const triggerToast = (message, path = '/admin/pedidos') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, path }])
    playAdminSound()
    setIsRinging(true)
    setTimeout(() => setIsRinging(false), 2000)
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  useEffect(() => {
    const seenOnMount = getSeenOrders()
    let initialized = false

    const unsubscribe = subscribeToOrders((orders) => {
      if (!initialized) {
        orders.forEach(o => {
          if (!seenOnMount.has(o.id)) {
            markOrderSeen(o.id)
          }
        })
        initialized = true
        return
      }

      const currentSeen = getSeenOrders()
      orders.forEach(o => {
        if (!currentSeen.has(o.id)) {
          const isWholesale = o.tipo === 'wholesale' || o.items?.some(item => item.wholesale)
          const isCustomOrder = o.tipo === 'custom_order' || o.customOrder || o.items?.some(item => item.custom)
          
          if (o.estado === ORDER_STATES.PENDING) {
            const typeLabel = isWholesale ? 'Al por mayor' : isCustomOrder ? 'Por encargo' : 'Normal'
            const msg = `Pedido ${typeLabel} recibido de ${o.cliente?.nombre || 'Cliente'}.`
            setNotifications(prev => [
              {
                id: o.id,
                orderNumber: o.orderNumber,
                message: msg,
              },
              ...prev
            ])
            triggerToast(msg, '/admin/pedidos')
          }
          markOrderSeen(o.id)
        }
      })
    })

    // Suscribirse a solicitudes al por mayor y encargos (especiales)
    const mountTime = Date.now()
    console.log("[AdminLayout] Montando suscripción de solicitudes especiales en tiempo real. MountTime:", mountTime)

    const unsubscribeWholesale = subscribeToWholesaleRequests((requests) => {
      console.log("[AdminLayout] Snapshot de solicitudes recibido. Cantidad:", requests.length)
      
      requests.forEach(r => {
        const concept = r.tipo === 'encargo' ? 'por encargo' : 'al por mayor'
        
        // Obtener la fecha de creación en milisegundos
        let createdMs = 0
        if (r.createdAt) {
          createdMs = r.createdAt.toDate ? r.createdAt.toDate().getTime() : new Date(r.createdAt).getTime()
        }

        // Si la solicitud se creó después de montar la aplicación (es nueva)
        // y su estado es pendiente, y no la hemos notificado en esta sesión
        const seenWholesale = getSeenWholesale()
        
        if (createdMs > mountTime - 10000) { // Tolerancia de 10s por diferencias de reloj del servidor
          if (!seenWholesale.has(r.id)) {
            console.log("[AdminLayout] ¡Nueva solicitud especial detectada en tiempo real!", r.id, r.productoNombre)
            
            if (r.estado === 'pendiente') {
              const msg = `Nueva solicitud ${concept} de "${r.productoNombre}" recibida de ${r.clienteNombre || 'Cliente'}.`
              setNotifications(prev => [
                {
                  id: r.id,
                  concept,
                  message: msg,
                  isWholesaleRequest: true,
                },
                ...prev
              ])
              triggerToast(msg, '/admin/pedidos')
            }
            markWholesaleSeen(r.id)
            updateWholesaleStateCache(r.id, r.estado)
          }
        }

        // Actualizar caché de estados silenciosamente para pedidos existentes (sin disparar alertas redundantes al admin)
        if (r.estado) {
          updateWholesaleStateCache(r.id, r.estado)
        }
      })
    })

    // Suscribirse a las notificaciones de créditos en tiempo real
    const seenNotificationsOnMount = new Set()
    let notifInitialized = false

    const unsubscribeNotifications = subscribeToNotifications((notifs) => {
      if (!notifInitialized) {
        notifs.forEach(n => seenNotificationsOnMount.add(n.id))
        notifInitialized = true
        return
      }

      notifs.forEach(n => {
        if (!seenNotificationsOnMount.has(n.id)) {
          seenNotificationsOnMount.add(n.id)
          
          const label = n.type === 'pago_total' ? 'Pago Total de Crédito' : 'Abono a Crédito'
          const msg = `${n.clienteNombre} (${n.clienteCelular}) reportó un ${n.type === 'pago_total' ? 'pago total' : 'abono'} de ${formatCurrency(n.monto)} para el pedido #${n.orderNumber}.`
          
          setNotifications(prev => [
            {
              id: n.id,
              orderNumber: n.orderNumber,
              message: msg,
              isCreditNotification: true,
            },
            ...prev
          ])
          
          triggerToast(msg, '/admin/credito')
        }
      })
    })

    // Suscribirse a los reclamos en tiempo real
    const seenClaimsOnMount = new Set()
    let claimsInitialized = false

    const unsubscribeClaims = subscribeToClaims((claimsList) => {
      if (!claimsInitialized) {
        claimsList.forEach(c => seenClaimsOnMount.add(c.id))
        claimsInitialized = true
        return
      }

      claimsList.forEach(c => {
        if (!seenClaimsOnMount.has(c.id)) {
          seenClaimsOnMount.add(c.id)
          
          if (c.status === 'PENDING') {
            const msg = `Nuevo reclamo de ${c.clientName} para el pedido #${c.orderNumber}.`
            
            setNotifications(prev => [
              {
                id: c.id,
                orderNumber: c.orderNumber,
                message: msg,
                isClaimNotification: true,
              },
              ...prev
            ])
            
            triggerToast(msg, '/admin/reclamos')
          }
        }
      })
    })

    return () => {
      unsubscribe()
      unsubscribeWholesale()
      unsubscribeNotifications()
      unsubscribeClaims()
    }
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      logout()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  return (
    <div className="min-h-screen bg-app flex w-full max-w-[100vw] overflow-x-hidden">

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
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>
            {/* Popover */}
            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  {/* Backdrop para cerrar haciendo clic en cualquier lado fuera de la ventana */}
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute left-0 mt-2 w-64 bg-surface border border-app rounded-2xl shadow-xl z-50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-app pb-2">
                      <p className="text-xs font-bold text-app">Notificaciones ({notifications.length})</p>
                      {notifications.length > 0 && (
                        <button onClick={() => setNotifications([])} className="text-[10px] text-primary font-bold hover:underline">
                          Limpiar
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-[11px] text-muted text-center py-4">No hay nuevas notificaciones</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              setIsNotificationsOpen(false)
                              navigate(n.isCreditNotification ? '/admin/credito' : '/admin/pedidos')
                            }}
                            className="p-2.5 rounded-xl bg-surface-2 border border-app text-[11px] text-app space-y-1 cursor-pointer hover:border-primary/50 transition-colors"
                          >
                            <div className="flex justify-between font-bold">
                              <span className="text-primary">{n.isCreditNotification ? 'Crédito' : 'Nuevo Pedido'}</span>
                              <span className="text-[9px] text-muted">{n.orderNumber}</span>
                            </div>
                            <p className="text-muted leading-tight">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
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
              // Despachar evento personalizado para retornar al menú de configuración principal
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
      <div className="md:hidden fixed top-4 right-4 z-50">
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
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-surface">
              {notifications.length}
            </span>
          )}
        </button>
        
        {/* Popover Mobile (se abre hacia abajo) */}
        <AnimatePresence>
          {isNotificationsOpen && (
            <>
              {/* Backdrop para cerrar haciendo clic en cualquier lado fuera de la ventana */}
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setIsNotificationsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                className="absolute right-0 top-13 mt-1 w-72 bg-surface border border-app rounded-2xl shadow-2xl p-4 space-y-3 z-50"
              >
                <div className="flex items-center justify-between border-b border-app pb-2">
                  <p className="text-xs font-bold text-app">Notificaciones ({notifications.length})</p>
                  {notifications.length > 0 && (
                    <button onClick={() => setNotifications([])} className="text-[10px] text-primary font-bold hover:underline">
                      Limpiar
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-[11px] text-muted text-center py-4">No hay nuevas notificaciones</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => {
                          setIsNotificationsOpen(false)
                          navigate(n.isCreditNotification ? '/admin/credito' : '/admin/pedidos')
                        }}
                        className="p-2.5 rounded-xl bg-surface-2 border border-app text-[11px] text-app space-y-1 cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <div className="flex justify-between font-bold">
                          <span className="text-primary">{n.isCreditNotification ? 'Crédito' : 'Nuevo Pedido'}</span>
                          <span className="text-[9px] text-muted">{n.orderNumber}</span>
                        </div>
                        <p className="text-muted leading-tight">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Contenedor de Toasts de Notificaciones del Administrador */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              onClick={() => {
                setToasts(prev => prev.filter(item => item.id !== t.id))
                navigate(t.path || '/admin/pedidos')
              }}
              className="bg-white border border-slate-200 shadow-xl rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Bell size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-app">
                  {t.path === '/admin/credito' ? 'Crédito' : 'Nuevo Pedido'}
                </p>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{t.message}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setToasts(prev => prev.filter(item => item.id !== t.id))
                }}
                className="text-muted hover:text-app transition-colors p-1"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
