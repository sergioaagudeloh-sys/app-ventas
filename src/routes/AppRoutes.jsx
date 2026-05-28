import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import useAuthStore from '../store/authStore'
import { ROLES } from '../constants'
import AppLoader from '../components/ui/AppLoader'

// ─── Lazy loading de páginas (Guía Maestra §11.3) ────────────────────────────
const WelcomePage = lazy(() => import('../pages/WelcomePage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const AdminLayout = lazy(() => import('../layouts/AdminLayout'))
const ClientLayout = lazy(() => import('../layouts/ClientLayout'))

// Páginas Admin
const AdminHome = lazy(() => import('../pages/admin/AdminHome'))
const AdminInventory = lazy(() => import('../pages/admin/AdminInventory'))
const AdminSales = lazy(() => import('../pages/admin/AdminSales'))
const AdminSalesDetail = lazy(() => import('../pages/admin/AdminSalesDetail'))
const AdminStockAlerts = lazy(() => import('../pages/admin/AdminStockAlerts'))
const AdminOrders = lazy(() => import('../pages/admin/AdminOrders'))
const AdminCredits = lazy(() => import('../pages/admin/AdminCredits'))
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'))
const AdminClaims = lazy(() => import('../pages/admin/AdminClaims'))

// Páginas Cliente
const ClientCatalog = lazy(() => import('../pages/client/ClientCatalog'))
const ClientFavorites = lazy(() => import('../pages/client/ClientFavorites'))
const ClientOrders = lazy(() => import('../pages/client/ClientOrders'))
const ClientCredits = lazy(() => import('../pages/client/ClientCredits'))
const ClientProfile = lazy(() => import('../pages/client/ClientProfile'))
const OrderTracking = lazy(() => import('../pages/client/OrderTracking'))

// ─── Guard de rutas por rol ───────────────────────────────────────────────────
function RequireAuth({ children, allowedRole }) {
  const { user, role, isLoading } = useAuthStore()

  if (isLoading) return <AppLoader />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        {/* ─── Ruta pública: Login ─────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ─── Rutas del Administrador ─────────────────────────────────── */}
        <Route
          path="/admin"
          element={
            <RequireAuth allowedRole={ROLES.ADMIN}>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="inicio" replace />} />
          <Route path="inicio" element={<AdminHome />} />
          <Route path="inicio/detalle-ventas" element={<AdminSalesDetail />} />
          <Route path="inicio/alertas-stock" element={<AdminStockAlerts />} />
          <Route path="inventario" element={<AdminInventory />} />
          <Route path="ventas" element={<AdminSales />} />
          <Route path="pedidos" element={<AdminOrders />} />
          <Route path="credito" element={<AdminCredits />} />
          <Route path="configuracion" element={<AdminSettings />} />
          <Route path="reclamos" element={<AdminClaims />} />
        </Route>

        {/* ─── Rutas del Cliente ───────────────────────────────────────── */}
        <Route
          path="/tienda"
          element={
            <RequireAuth allowedRole={ROLES.CLIENT}>
              <ClientLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="catalogo" replace />} />
          <Route path="catalogo" element={<ClientCatalog />} />
          <Route path="favoritos" element={<ClientFavorites />} />
          <Route path="pedidos" element={<ClientOrders />} />
          <Route path="creditos" element={<ClientCredits />} />
          <Route path="perfil" element={<ClientProfile />} />
        </Route>

        {/* ─── Ruta raíz: Bienvenida y Seguimiento Público ────────────────── */}
        <Route path="/pedido/status" element={<OrderTracking />} />
        <Route path="/" element={<WelcomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
