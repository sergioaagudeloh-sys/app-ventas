import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import useAuthStore from '../store/authStore'
import { ROLES } from '../constants'
import AppLoader from '../components/ui/AppLoader'
import RequirePortalAuth from '../components/portal/RequirePortalAuth'

// ─── Lazy loading de páginas (Guía Maestra §11.3) ────────────────────────────
const WelcomePage = lazy(() => import('../pages/WelcomePage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const AdminLayout = lazy(() => import('../layouts/AdminLayout'))
const ClientLayout = lazy(() => import('../layouts/ClientLayout'))
const PortalLayout = lazy(() => import('../layouts/PortalLayout'))

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
const AdminPortalQR = lazy(() => import('../pages/admin/AdminPortalQR'))
const AdminQRPerformance = lazy(() => import('../pages/admin/AdminQRPerformance'))
const AdminDeliveryPerformance = lazy(() => import('../pages/admin/AdminDeliveryPerformance'))
const AdminNotificationAnalytics = lazy(() => import('../pages/admin/AdminNotificationAnalytics'))

// Páginas Cliente
const ClientCatalog = lazy(() => import('../pages/client/ClientCatalog'))
const ClientFavorites = lazy(() => import('../pages/client/ClientFavorites'))
const ClientOrders = lazy(() => import('../pages/client/ClientOrders'))
const ClientCredits = lazy(() => import('../pages/client/ClientCredits'))
const ClientProfile = lazy(() => import('../pages/client/ClientProfile'))
const OrderTracking = lazy(() => import('../pages/client/OrderTracking'))
const ProductPublicDetail = lazy(() => import('../pages/client/ProductPublicDetail'))
const ProductDetailPage = lazy(() => import('../pages/client/ProductDetailPage'))

// Páginas Portal Operativo
const PortalAuth = lazy(() => import('../pages/portal/PortalAuth'))
const PortalVendedor = lazy(() => import('../pages/portal/PortalVendedor'))
const PortalCocina = lazy(() => import('../pages/portal/PortalCocina'))
const PortalBodega = lazy(() => import('../pages/portal/PortalBodega'))
const PortalMesero = lazy(() => import('../pages/portal/PortalMesero'))
const PortalMensajero = lazy(() => import('../pages/portal/PortalMensajero'))

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
          <Route path="portales-qr" element={<AdminPortalQR />} />
          <Route path="rendimiento-qr" element={<AdminQRPerformance />} />
          <Route path="rendimiento-entregas" element={<AdminDeliveryPerformance />} />
          <Route path="notificaciones" element={<AdminNotificationAnalytics />} />
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

        <Route
          path="/producto/:id"
          element={
            <RequireAuth allowedRole={ROLES.CLIENT}>
              <ProductDetailPage />
            </RequireAuth>
          }
        />

        {/* ─── Portal Operativo: Autenticación por PIN ─────────────────── */}
        <Route path="/portal/auth" element={<PortalAuth />} />

        {/* ─── Portal Operativo: Portales por Rol ──────────────────────── */}
        <Route
          path="/portal"
          element={
            <RequirePortalAuth>
              <PortalLayout />
            </RequirePortalAuth>
          }
        >
          <Route path="vendedor" element={
            <RequirePortalAuth allowedRole={ROLES.VENDEDOR}>
              <PortalVendedor />
            </RequirePortalAuth>
          } />
          <Route path="cocina" element={
            <RequirePortalAuth allowedRole={ROLES.COCINERO}>
              <PortalCocina />
            </RequirePortalAuth>
          } />
          <Route path="bodega" element={
            <RequirePortalAuth allowedRole={ROLES.BODEGUERO}>
              <PortalBodega />
            </RequirePortalAuth>
          } />
          <Route path="mesero" element={
            <RequirePortalAuth allowedRole={ROLES.MESERO}>
              <PortalMesero />
            </RequirePortalAuth>
          } />
          <Route path="mensajero" element={
            <RequirePortalAuth allowedRole={ROLES.MENSAJERO}>
              <PortalMensajero />
            </RequirePortalAuth>
          } />
        </Route>

        {/* ─── Ruta raíz: Bienvenida y Seguimiento Público ────────────────── */}
        <Route path="/pedido/status" element={<OrderTracking />} />
        <Route path="/compra-qr/:productId" element={<ProductPublicDetail />} />
        <Route path="/" element={<WelcomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
