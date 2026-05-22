import { Outlet, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, Heart, Package, CreditCard, User } from 'lucide-react'
import useAppConfigStore from '../store/appConfigStore'
import useCartStore from '../store/cartStore'
import useAuthStore from '../store/authStore'
import useFavoritesStore from '../store/favoritesStore'
import { useEffect } from 'react'
import useInactivityTimer from '../hooks/useInactivityTimer'
import SmartHint from '../components/client/guided/SmartHint'

const NAV_ITEMS = [
  { path: '/tienda/catalogo', icon: ShoppingBag, label: 'Catálogo' },
  { path: '/tienda/favoritos', icon: Heart, label: 'Favoritos' },
  { path: '/tienda/pedidos', icon: Package, label: 'Pedidos' },
  { path: '/tienda/creditos', icon: CreditCard, label: 'Créditos' },
  { path: '/tienda/perfil', icon: User, label: 'Perfil' },
]

/**
 * Layout principal del Cliente.
 * Desktop: sidebar izquierdo fijo.
 * Mobile: barra de navegación inferior.
 * Incluye el CartDrawer global accesible desde cualquier página.
 */
export default function ClientLayout() {
  const { appName, appIcon } = useAppConfigStore()
  const { getCount, openCart, isOpen: isCartOpen } = useCartStore()
  const { user } = useAuthStore()
  const { subscribe, unsubscribe } = useFavoritesStore()
  
  const cartCount = getCount()
  const userId = user?.celular || user?.uid

  // Inactividad: 10s si hay items pero el carrito está cerrado
  const { isInactive: isCartInactive } = useInactivityTimer(10000, cartCount > 0 && !isCartOpen)

  useEffect(() => {
    if (userId) {
      subscribe(userId)
    } else {
      unsubscribe()
    }
    // No limpiamos aquí para no desuscribirnos si el usuario solo cambia de ruta
  }, [userId, subscribe, unsubscribe])

  return (
    <div className="min-h-screen bg-app flex w-full max-w-[100vw] overflow-x-hidden">

      {/* ─── SIDEBAR DESKTOP ────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-surface border-r border-app z-40 shadow-sm"
        aria-label="Navegación del cliente"
      >
        {/* Header del sidebar */}
        <div className="flex items-center gap-3 p-6 border-b border-app">
          {appIcon ? (
            <img
              src={appIcon}
              alt={`Logo ${appName}`}
              className="w-9 h-9 rounded-xl object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <ShoppingBag size={18} className="text-white" aria-hidden="true" />
            </div>
          )}
          <p className="font-bold text-sm text-app">{appName}</p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Secciones del cliente">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
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
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Botón carrito en sidebar */}
        <div className="p-3 border-t border-app relative">
          {/* Asistencia Guiada: Carrito Inactivo */}
          <SmartHint 
            stepId="cart_inactivity" 
            message="Ahora puedes revisar tu carrito." 
            position="top" 
            inactivityTrigger={true}
            isInactive={isCartInactive}
            className="mb-14"
          />

          <button
            onClick={openCart}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold transition-all duration-300 active:scale-95 hover:opacity-90 ${isCartInactive ? 'animate-pulse ring-4 ring-primary/30' : ''}`}
            aria-label={`Ver carrito con ${cartCount} productos`}
          >
            <ShoppingBag size={18} aria-hidden="true" />
            <span>Mi carrito</span>
            {cartCount > 0 && (
              <span className="ml-auto bg-white text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ─── HEADER MOBILE con botón carrito ────────────────────────────── */}
      <header
        className="flex md:hidden fixed top-0 left-0 right-0 h-14 z-40 items-center justify-between px-4 bg-surface/70 backdrop-blur-xl"
        aria-label="Encabezado"
      >
        <p className="font-bold text-sm text-app">{appName}</p>
        <div className="relative flex items-center">
          <button
            onClick={openCart}
            className={`relative w-10 h-10 flex items-center justify-center rounded-xl bg-surface-2 transition-all duration-300 active:scale-95 ${isCartInactive ? 'animate-pulse ring-4 ring-primary/30' : ''}`}
            aria-label={`Abrir carrito con ${cartCount} productos`}
          >
            <ShoppingBag size={20} className="text-primary" aria-hidden="true" />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
              >
                {cartCount}
              </motion.span>
            )}
          </button>
          
          <SmartHint 
            stepId="cart_inactivity" 
            message="Revisa tu carrito." 
            position="bottom" 
            inactivityTrigger={true}
            isInactive={isCartInactive}
            className="right-0 mt-12 w-48"
          />
        </div>
      </header>

      {/* ─── CONTENIDO PRINCIPAL ────────────────────────────────────────── */}
      <main
        className="flex-1 md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen w-full max-w-[100vw] md:max-w-none overflow-x-hidden"
        id="main-content"
      >
        <Outlet />
      </main>

      {/* ─── NAVBOTTOM MOBILE ───────────────────────────────────────────── */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-app z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        aria-label="Navegación inferior cliente"
      >
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 relative outline-none focus:outline-none ${
                isActive ? 'text-primary' : 'text-muted'
              }`
            }
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label={label}
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
    </div>
  )
}
