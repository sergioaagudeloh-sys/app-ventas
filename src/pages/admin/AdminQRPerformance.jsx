import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { QrCode, TrendingUp, ShoppingCart, Percent, AlertCircle, ShoppingBag, Eye, HelpCircle } from 'lucide-react'
import { useProducts } from '../../hooks/useInventory'
import { useOrders } from '../../hooks/useOrders'
import { getQRAnalyticsData } from '../../services/qrAnalyticsService'
import { formatCurrency } from '../../utils/formatters'
import AppLoader from '../../components/ui/AppLoader'

export default function AdminQRPerformance() {
  const { data: products = [], isLoading: isLoadingProducts } = useProducts()
  const { data: orders = [], isLoading: isLoadingOrders } = useOrders()
  
  const [analyticsData, setAnalyticsData] = useState([])
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)

  useEffect(() => {
    getQRAnalyticsData().then(data => {
      setAnalyticsData(data)
      setIsLoadingAnalytics(false)
    }).catch(err => {
      console.error(err)
      setIsLoadingAnalytics(false)
    })
  }, [])

  // Consolidar analíticas
  const stats = useMemo(() => {
    const totalScans = analyticsData.filter(d => d.eventType === 'scan').length
    const totalCartAdds = analyticsData.filter(d => d.eventType === 'cart_add').length
    
    // Obtener pedidos creados que tengan origen QR
    const qrOrders = orders.filter(o => o.couponCode === 'QR' || o.notas?.toLowerCase().includes('qr') || o.items?.some(i => i.productId))
    const totalSales = qrOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    
    const conversionRate = totalScans > 0 ? ((qrOrders.length / totalScans) * 100).toFixed(1) : '0.0'
    const cartAbandonment = totalCartAdds > 0 ? (((totalCartAdds - qrOrders.length) / totalCartAdds) * 100).toFixed(1) : '0.0'

    return {
      totalScans,
      totalCartAdds,
      totalOrders: qrOrders.length,
      totalSales,
      conversionRate,
      cartAbandonment: Number(cartAbandonment) < 0 ? '0.0' : cartAbandonment
    }
  }, [analyticsData, orders])

  // Ranking de productos más escaneados
  const topProducts = useMemo(() => {
    const counts = {}
    analyticsData.forEach(event => {
      if (event.productId) {
        counts[event.productId] = (counts[event.productId] || 0) + 1
      }
    })

    return Object.entries(counts)
      .map(([id, scans]) => {
        const prod = products.find(p => p.id === id)
        return {
          id,
          nombre: prod?.nombre || 'Producto Desconocido',
          categoria: prod?.categoria || 'Sin Categoría',
          scans,
          precio: prod?.precioBase || 0
        }
      })
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 10)
  }, [analyticsData, products])

  if (isLoadingProducts || isLoadingOrders || isLoadingAnalytics) {
    return <AppLoader />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white">
          <QrCode size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-app">Rendimiento y Analítica QR</h1>
          <p className="text-xs text-muted">Conversión de puntos de venta físicos a compras digitales en tiempo real.</p>
        </div>
      </div>

      {/* Grid de Métricas Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Escaneos */}
        <div className="p-4 rounded-3xl bg-surface border border-app shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Eye size={22} />
          </div>
          <div>
            <span className="block text-xs font-bold text-muted uppercase tracking-wider">Escaneos Totales</span>
            <span className="block text-2xl font-black text-app mt-0.5">{stats.totalScans}</span>
          </div>
        </div>

        {/* Conversión */}
        <div className="p-4 rounded-3xl bg-surface border border-app shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center shrink-0">
            <Percent size={22} />
          </div>
          <div>
            <span className="block text-xs font-bold text-muted uppercase tracking-wider">Tasa de Conversión</span>
            <span className="block text-2xl font-black text-app mt-0.5">{stats.conversionRate}%</span>
          </div>
        </div>

        {/* Agregados a Carrito */}
        <div className="p-4 rounded-3xl bg-surface border border-app shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
            <ShoppingCart size={22} />
          </div>
          <div>
            <span className="block text-xs font-bold text-muted uppercase tracking-wider">Carros Abandonados</span>
            <span className="block text-2xl font-black text-app mt-0.5">{stats.cartAbandonment}%</span>
          </div>
        </div>

        {/* Ingresos por QR */}
        <div className="p-4 rounded-3xl bg-surface border border-app shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="block text-xs font-bold text-muted uppercase tracking-wider">Ingresos por QR</span>
            <span className="block text-2xl font-black text-app mt-0.5">{formatCurrency(stats.totalSales)}</span>
          </div>
        </div>
      </div>

      {/* Grid de Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Más Escaneados */}
        <div className="lg:col-span-2 bg-surface rounded-3xl p-6 border border-app shadow-sm space-y-4">
          <h3 className="text-sm font-black text-app uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag size={16} className="text-primary" /> Productos Más Escaneados por QR
          </h3>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-2/50 text-muted text-xs uppercase tracking-wider">
                  <th className="font-semibold p-3 rounded-l-xl">Producto</th>
                  <th className="font-semibold p-3">Categoría</th>
                  <th className="font-semibold p-3">Precio</th>
                  <th className="font-semibold p-3 text-right rounded-r-xl">Escaneos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-xs text-muted">
                      No hay registros de escaneos QR aún.
                    </td>
                  </tr>
                ) : (
                  topProducts.map(p => (
                    <tr key={p.id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="p-3 font-bold text-sm text-app">{p.nombre}</td>
                      <td className="p-3 text-xs text-muted">{p.categoria}</td>
                      <td className="p-3 text-sm font-semibold text-app">{formatCurrency(p.price || p.precio)}</td>
                      <td className="p-3 text-right font-black text-primary text-sm">{p.scans}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de Aprendizaje / Ayuda */}
        <div className="bg-surface rounded-3xl p-6 border border-app shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-app uppercase tracking-wider flex items-center gap-2">
              <HelpCircle size={16} className="text-primary" /> ¿Cómo Funciona la Conversión?
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Cada vez que un cliente escanea un código QR impreso en tus empaques, etiquetas o mesas, ingresa directamente a tu <strong>Portal Público de Compra</strong>.
            </p>
            <p className="text-xs text-muted leading-relaxed">
              El sistema registra automáticamente la visita de manera anónima y la asocia a su carrito de compras. Al completar el pedido en WhatsApp, la venta se atribuye directamente al QR de origen para darte métricas exactas.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-primary-soft border border-primary-soft flex items-start gap-2.5">
            <AlertCircle size={16} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-primary leading-normal font-semibold">
              Tip: Coloca códigos QR visibles en tus productos más vendidos para incentivar la compra recurrente a domicilio de forma directa.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
