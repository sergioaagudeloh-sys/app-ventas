import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  Settings,
  LogOut,
  Store,
} from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebaseConfig'
import useAppConfigStore from '../store/appConfigStore'
import useAuthStore from '../store/authStore'

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
  const { appName, appIcon } = useAppConfigStore()
  const { logout } = useAuthStore()
  const navigate = useNavigate()

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
        <div className="flex items-center gap-3 p-6 border-b border-app">
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

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Secciones">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
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
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
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
    </div>
  )
}
