import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, TrendingUp, DollarSign, AlertTriangle, Package, Users, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useOrders } from '../../hooks/useOrders'
import { useCredits } from '../../hooks/useCredits'
import { useProducts } from '../../hooks/useInventory'
import { ORDER_STATES } from '../../constants'
import { formatCurrency } from '../../utils/formatters'
import useAuthStore from '../../store/authStore'
import useAppConfigStore from '../../store/appConfigStore'

export default function AdminHome() {
  const { user } = useAuthStore()
  const { sellerName } = useAppConfigStore()
  const { data: orders = [] } = useOrders()
  const { data: credits = [] } = useCredits('activo')
  const { data: products = [] } = useProducts()

  // ─── CÁLCULO DE MÉTRICAS ──────────────────────────────────────────

  const metricas = useMemo(() => {
    // 1. Ventas Completadas (Solo lo que realmente se vendió)
    const completedOrders = orders.filter(o => o.estado === ORDER_STATES.COMPLETADO)
    const totalVentas = completedOrders.reduce((sum, o) => sum + o.total, 0)
    
    // 2. Pedidos pendientes (Para la alerta)
    const pendingOrders = orders.filter(o => o.estado === ORDER_STATES.PENDIENTE).length

    // 3. Dinero en la calle (Total de saldo pendiente en fiados)
    const totalFiado = credits.reduce((sum, c) => sum + c.saldoPendiente, 0)

    // 4. Productos con stock bajo (Suma total de variantes <= umbral)
    const productosStockBajo = products.filter(p => {
      const stockTotal = p.variantes.reduce((sum, v) => sum + v.stock, 0)
      return stockTotal <= p.umbralAlerta
    })

    return {
      ventas: totalVentas,
      pedidosPendientes: pendingOrders,
      fiado: totalFiado,
      stockBajo: productosStockBajo
    }
  }, [orders, credits, products])

  // ─── ANIMACIONES ──────────────────────────────────────────────────
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-8 max-w-7xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
          <LayoutDashboard size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-app">Hola {sellerName || 'Vendedor'}, 👋</h1>
          <p className="text-sm text-muted">Resumen de tu negocio al día de hoy.</p>
        </div>
      </div>

      {/* ─── TARJETAS DE MÉTRICAS ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        
        {/* Ventas */}
        <motion.div variants={itemVariants} className="bg-surface rounded-3xl p-6 border border-app shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-success/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/20 text-success flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-bold text-app">Ventas (Completadas)</h3>
          </div>
          <p className="text-3xl font-black text-app mt-4">{formatCurrency(metricas.ventas)}</p>
          <p className="text-xs text-muted mt-2">Monto total de pedidos finalizados.</p>
        </motion.div>

        {/* Fiados */}
        <motion.div variants={itemVariants} className="bg-surface rounded-3xl p-6 border border-app shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-warning/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/20 text-warning flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <h3 className="font-bold text-app">Dinero por Cobrar</h3>
          </div>
          <p className="text-3xl font-black text-app mt-4">{formatCurrency(metricas.fiado)}</p>
          <p className="text-xs text-muted mt-2">Saldo pendiente en créditos activos.</p>
        </motion.div>

        {/* Pedidos */}
        <motion.div variants={itemVariants} className="bg-surface rounded-3xl p-6 border border-app shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <Package size={20} />
            </div>
            <h3 className="font-bold text-app">Nuevos Pedidos</h3>
          </div>
          <p className="text-3xl font-black text-app mt-4">
            {metricas.pedidosPendientes} <span className="text-lg text-muted font-medium">pendientes</span>
          </p>
          {metricas.pedidosPendientes > 0 && (
            <Link to="/admin/orders" className="text-xs text-primary font-bold mt-2 flex items-center gap-1 hover:underline">
              Ir a revisarlos <ArrowRight size={12} />
            </Link>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ─── ALERTAS DE STOCK BAJO ────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="bg-surface rounded-3xl p-6 border border-app shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-app flex items-center gap-2">
              <AlertTriangle size={20} className="text-warning" /> Alertas de Inventario
            </h2>
            <span className="px-3 py-1 bg-warning/10 text-warning rounded-lg text-xs font-bold">
              {metricas.stockBajo.length}
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {metricas.stockBajo.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">
                Todo está bien. Ningún producto está por debajo del umbral de alerta.
              </p>
            ) : (
              metricas.stockBajo.map(prod => {
                const totalStock = prod.variantes.reduce((sum, v) => sum + v.stock, 0)
                return (
                  <div key={prod.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-app/50">
                    <div>
                      <p className="font-bold text-app text-sm leading-tight">{prod.nombre}</p>
                      <p className="text-xs text-muted">Umbral: {prod.umbralAlerta} unds</p>
                    </div>
                    <div className="text-right">
                      <p className="text-warning font-black text-lg">{totalStock}</p>
                      <p className="text-[10px] text-muted font-semibold uppercase">Restantes</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>

        {/* ─── ACCESOS RÁPIDOS ──────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <h2 className="text-lg font-bold text-app mb-6 flex items-center gap-2">
            🚀 Accesos Rápidos
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/admin/inventory" className="flex flex-col items-center justify-center p-6 bg-surface rounded-3xl border border-app hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Package size={24} />
              </div>
              <span className="font-bold text-app">Inventario</span>
            </Link>
            
            <Link to="/admin/orders" className="flex flex-col items-center justify-center p-6 bg-surface rounded-3xl border border-app hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={24} />
              </div>
              <span className="font-bold text-app">Pedidos</span>
            </Link>

            <Link to="/admin/credits" className="flex flex-col items-center justify-center p-6 bg-surface rounded-3xl border border-app hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <DollarSign size={24} />
              </div>
              <span className="font-bold text-app">Créditos</span>
            </Link>

            <Link to="/admin/settings" className="flex flex-col items-center justify-center p-6 bg-surface rounded-3xl border border-app hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={24} /> {/* Placeholder icono */}
              </div>
              <span className="font-bold text-app">Configuración</span>
            </Link>
          </div>
        </motion.div>

      </div>
    </motion.div>
  )
}
