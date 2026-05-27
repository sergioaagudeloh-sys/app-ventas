import { Outlet, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, Heart, Package, CreditCard, User, Tag } from 'lucide-react'
import useAppConfigStore from '../store/appConfigStore'
import useCartStore from '../store/cartStore'
import useAuthStore from '../store/authStore'
import useFavoritesStore from '../store/favoritesStore'
import { useEffect, useState } from 'react'
import useInactivityTimer from '../hooks/useInactivityTimer'
import SmartHint from '../components/client/guided/SmartHint'
import ClientCouponsModal from '../components/client/coupons/ClientCouponsModal'

const NAV_ITEMS_LEFT = [
  { path: '/tienda/catalogo', icon: ShoppingBag, label: 'Catálogo' },
  { path: '/tienda/favoritos', icon: Heart, label: 'Favoritos' },
]

const NAV_ITEMS_RIGHT = [
  { path: '/tienda/pedidos', icon: Package, label: 'Pedidos' },
  { path: '/tienda/creditos', icon: CreditCard, label: 'Créditos' },
]

const ALL_NAV_ITEMS = [
  { path: '/tienda/catalogo', icon: ShoppingBag, label: 'Catálogo' },
  { path: '/tienda/favoritos', icon: Heart, label: 'Favoritos' },
  { path: '/tienda/pedidos', icon: Package, label: 'Pedidos' },
  { path: '/tienda/creditos', icon: CreditCard, label: 'Créditos' },
  { path: '/tienda/perfil', icon: User, label: 'Perfil' },
]

/**
 * Layout principal del Cliente.
 * Desktop: sidebar izquierdo fijo.
 * Mobile: barra de navegación inferior con botón central circular para cupones.
 * Incluye el CartDrawer global accesible desde cualquier página.
 */
export default function ClientLayout() {
  const { appName, appIcon } = useAppConfigStore()
  const { getCount, openCart, isOpen: isCartOpen } = useCartStore()
  const { user } = useAuthStore()
  const { subscribe, unsubscribe } = useFavoritesStore()
  
  const [isCouponsOpen, setIsCouponsOpen] = useState(false)
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
              className="w-[54px] h-[54px] rounded-2xl object-cover"
            />
          ) : (
            <div className="w-[54px] h-[54px] rounded-2xl bg-primary flex items-center justify-center">
              <ShoppingBag size={26} className="text-white" aria-hidden="true" />
            </div>
          )}
          <p className="font-bold text-sm text-app">{appName}</p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Secciones del cliente">
          {ALL_NAV_ITEMS.map(({ path, icon: Icon, label }) => (
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

          {/* Botón Cupones en Desktop Sidebar */}
          <button
            onClick={() => setIsCouponsOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-app hover:bg-surface-2 transition-all duration-300 border border-dashed border-primary/20 hover:border-primary/40 mt-4 bg-primary/5 text-primary"
            aria-label="Ver cupones y ofertas"
          >
            <Tag size={18} className="text-primary" aria-hidden="true" />
            <span className="font-bold text-primary">Ofertas Flash</span>
          </button>
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

      {/* ─── HEADER MOBILE ────────────────────────────── */}
      <header
        className="flex md:hidden fixed top-0 left-0 right-0 h-14 z-40 items-center justify-between px-4 bg-surface/70 backdrop-blur-xl border-b border-app"
        aria-label="Encabezado"
      >
        <div className="flex items-center gap-2">
          {appIcon ? (
            <img
              src={appIcon}
              alt={`Logo ${appName}`}
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <ShoppingBag size={22} className="text-white" aria-hidden="true" />
            </div>
          )}
          <p className="font-bold text-sm text-app">{appName}</p>
        </div>
        
        {/* Carrito e Icono Perfil en Header para Mobile */}
        <div className="flex items-center gap-2 relative">
          <NavLink
            to="/tienda/perfil"
            className={({ isActive }) =>
              `w-10 h-10 flex items-center justify-center rounded-xl bg-surface-2 transition-all duration-300 active:scale-95 ${
                isActive ? 'text-primary' : 'text-muted'
              }`
            }
            aria-label="Ver perfil"
          >
            <User size={20} />
          </NavLink>

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

      {/* ─── NAVBOTTOM MOBILE con botón circular central destacando Cupones ─── */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-app z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] items-center justify-around px-2"
        aria-label="Navegación inferior cliente"
      >
        {/* Lado izquierdo */}
        {NAV_ITEMS_LEFT.map(({ path, icon: Icon, label }) => (
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
                    className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                  />
                )}
                <Icon size={20} aria-hidden="true" />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Botón Central Circular (Cupones / Ofertas) con animación magnética premium, sacudida de icono y barrido de brillo */}
        <div className="flex-1 flex flex-col items-center justify-start relative group">
          <button
            onClick={() => setIsCouponsOpen(true)}
            className="flex flex-col items-center justify-center -translate-y-2.5 relative"
            aria-label="Ver ofertas y cupones"
          >
            {/* Ondas de pulso más notorias de fondo */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1.5],
                opacity: [0.8, 0.4, 0]
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeOut"
              }}
              className="absolute w-16 h-16 rounded-full bg-primary/30 z-0"
              style={{ pointerEvents: 'none' }}
            />
            
            <motion.div
              animate={{
                scale: [1, 1.2, 1.35],
                opacity: [0.6, 0.2, 0]
              }}
              transition={{
                duration: 2.2,
                delay: 1.1,
                repeat: Infinity,
                ease: "easeOut"
              }}
              className="absolute w-16 h-16 rounded-full bg-primary/20 z-0"
              style={{ pointerEvents: 'none' }}
            />

            {/* Botón Circular Principal con overflow-hidden para contener el barrido de brillo */}
            <motion.div 
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:shadow-primary/40 transition-shadow duration-300 border-4 border-surface bg-primary text-white z-10 overflow-hidden relative"
            >
              {/* Barrido de brillo (Reflejo metálico diagonal cruzando cada 3s) */}
              <motion.div
                animate={{
                  x: ['-100%', '200%']
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 1,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-[-25deg] z-10 pointer-events-none"
              />

              {/* Icono con animación de sacudida (Shaking/Campana) cada 4 segundos */}
              <motion.div
                animate={{
                  rotate: [0, -15, 12, -10, 8, -4, 0]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  repeatDelay: 3.5,
                  ease: "easeInOut"
                }}
                whileHover={{ rotate: 360, scale: 1.1 }}
                className="z-20 flex items-center justify-center"
              >
                <Tag size={26} aria-hidden="true" />
              </motion.div>
            </motion.div>
            
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider text-muted hover:text-primary transition-colors duration-300 z-10">
              Ofertas
            </span>
          </button>
        </div>

        {/* Lado derecho */}
        {NAV_ITEMS_RIGHT.map(({ path, icon: Icon, label }) => (
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
                    className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                  />
                )}
                <Icon size={20} aria-hidden="true" />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Modal global de cupones */}
      <ClientCouponsModal
        isOpen={isCouponsOpen}
        onClose={() => setIsCouponsOpen(false)}
      />
    </div>
  )
}
