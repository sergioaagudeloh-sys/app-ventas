import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, DollarSign, AlertTriangle,
  Package, ShoppingBag, CreditCard, Settings, ChevronRight,
  BarChart3, Banknote, ArrowRight, X, Wallet, Percent
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useOrders } from '../../hooks/useOrders'
import { useCredits } from '../../hooks/useCredits'
import { useProducts } from '../../hooks/useInventory'
import { useBilling } from '../../hooks/useBilling'
import { ORDER_STATES, PAYMENT_METHODS } from '../../constants'
import { formatCurrency } from '../../utils/formatters'
import useAuthStore from '../../store/authStore'
import useAppConfigStore from '../../store/appConfigStore'

export default function AdminHome() {
  const { user } = useAuthStore()
  const { sellerName, appIcon, appName } = useAppConfigStore()
  const navigate = useNavigate()
  const { data: orders = [] } = useOrders()
  const { data: credits = [] } = useCredits('activo')
  const { data: products = [] } = useProducts()
  const { metrics: billingMetrics, isLoading: billingLoading } = useBilling()
  const [showBillingModal, setShowBillingModal] = useState(false)

  // ─── CÁLCULO DE MÉTRICAS GENERALES ────────────────────────────────────────
  const metricas = useMemo(() => {
    const completedOrders = orders.filter(o => o.estado === ORDER_STATES.COMPLETED)
    const totalVentas = completedOrders.reduce((sum, o) => sum + o.total, 0)
    const pendingOrders = orders.filter(o => o.estado === ORDER_STATES.PENDING).length
    const totalFiado = credits.reduce((sum, c) => sum + c.saldoPendiente, 0)
    
    // Contar todas las variantes individuales bajo el umbral de alerta
    const alerts = []
    products.forEach(p => {
      (p.variantes || []).forEach(v => {
        if (v.stock <= p.umbralAlerta) {
          alerts.push({ productId: p.id, variantId: v.id })
        }
      })
    })

    // Función auxiliar para determinar si la fecha es hoy
    const isToday = (dateObj) => {
      if (!dateObj) return false
      const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj)
      const today = new Date()
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear()
    }

    // Filtrar pedidos completados hoy
    const todayOrders = orders.filter(o => o.estado === ORDER_STATES.COMPLETED && isToday(o.createdAt))
    
    let cashTotal = 0
    let transferTotal = 0
    let creditTotal = 0

    todayOrders.forEach(o => {
      if (o.metodoPago === PAYMENT_METHODS.CASH) {
        cashTotal += o.total
      } else if (o.metodoPago === PAYMENT_METHODS.TRANSFER) {
        transferTotal += o.total
      } else if (o.metodoPago === PAYMENT_METHODS.CREDIT) {
        creditTotal += o.total
      }
    })

    const cajaTotal = cashTotal + transferTotal + creditTotal
    
    return { 
      ventas: totalVentas, 
      pedidosPendientes: pendingOrders, 
      fiado: totalFiado, 
      stockBajo: alerts,
      cajaTotal,
      cashTotal,
      transferTotal,
      creditTotal
    }
  }, [orders, credits, products])

  // ─── ANIMACIONES ──────────────────────────────────────────────────────────
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
      {/* Estilos CSS para el resplandor premium en alertas */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-purple {
          0%, 100% { box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-color: rgba(124, 58, 237, 0.1); transform: scale(1); }
          50% { box-shadow: 0 0 15px rgba(124, 58, 237, 0.35); border-color: rgba(124, 58, 237, 0.55); transform: scale(1.018); }
        }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-color: rgba(239, 68, 68, 0.1); transform: scale(1); }
          50% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.35); border-color: rgba(239, 68, 68, 0.55); transform: scale(1.018); }
        }
        .pulse-purple-alert { animation: pulse-purple 2.2s infinite ease-in-out !important; }
        .pulse-red-alert { animation: pulse-red 2.2s infinite ease-in-out !important; }
      `}} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-app">
        <div className="flex items-center gap-3.5">
          <div 
            className="w-11 h-11 rounded-2xl text-white font-black text-lg flex items-center justify-center shrink-0 select-none shadow-md"
            style={{ 
              background: 'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 85%, #000000))',
              textShadow: '0 1px 2px rgba(0,0,0,0.15)'
            }}
          >
            {(appName || 'V').charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/10">
              Panel de Administración
            </span>
            <h1 className="text-xl md:text-2xl font-black text-app mt-1 tracking-tight leading-tight">
              {(() => {
                const hour = new Date().getHours()
                if (hour < 12) return 'Buenos días'
                if (hour < 18) return 'Buenas tardes'
                return 'Buenas noches'
              })()}, <span className="text-primary">{sellerName || 'Mónica Henao'}</span>
            </h1>
          </div>
        </div>
        <div className="text-left sm:text-right shrink-0 flex flex-col justify-center sm:items-end">
          <p className="text-xs font-bold text-app uppercase tracking-wider">
            {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Monitoreo y resumen de tu negocio</p>
        </div>
      </div>

      {/* ─── TARJETAS DE MÉTRICAS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">

        {/* Ventas */}
        <motion.div
          variants={itemVariants}
          onClick={() => navigate('/admin/inicio/detalle-ventas')}
          className="bg-surface rounded-2xl md:rounded-3xl p-3.5 md:p-5 border border-app shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px] md:min-h-[140px] cursor-pointer hover:border-success/50 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-success/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-success/15 text-success flex items-center justify-center shrink-0">
                <TrendingUp size={16} />
              </div>
              <h3 className="font-bold text-app text-xs md:text-sm truncate">Ventas</h3>
            </div>
            <p className="text-lg md:text-2xl font-black text-app mt-2">{formatCurrency(metricas.ventas)}</p>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] md:text-xs text-muted">Ver análisis y top de productos.</p>
            <ChevronRight size={14} className="text-muted shrink-0" />
          </div>
        </motion.div>

        {/* Por Cobrar */}
        <motion.div
          variants={itemVariants}
          onClick={() => navigate('/admin/credito')}
          className="bg-surface rounded-2xl md:rounded-3xl p-3.5 md:p-5 border border-app shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px] md:min-h-[140px] cursor-pointer hover:border-warning/50 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-warning/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center shrink-0">
                <DollarSign size={16} />
              </div>
              <h3 className="font-bold text-app text-xs md:text-sm truncate">Por Cobrar</h3>
            </div>
            <p className="text-lg md:text-2xl font-black text-app mt-2">{formatCurrency(metricas.fiado)}</p>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] md:text-xs text-muted">Saldo en créditos activos.</p>
            <ChevronRight size={14} className="text-muted shrink-0" />
          </div>
        </motion.div>

        {/* Nuevos Pedidos */}
        <motion.div
          variants={itemVariants}
          onClick={() => navigate('/admin/pedidos')}
          className={`bg-surface rounded-2xl md:rounded-3xl p-3.5 md:p-5 border border-app shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px] md:min-h-[140px] cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98] ${
            metricas.pedidosPendientes > 0 ? 'pulse-purple-alert' : ''
          }`}
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Package size={16} />
              </div>
              <h3 className="font-bold text-app text-xs md:text-sm truncate">Nuevos Pedidos</h3>
            </div>
            <p className="text-lg md:text-2xl font-black text-app mt-2">
              {metricas.pedidosPendientes} <span className="text-xs text-muted font-normal">pend.</span>
            </p>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] md:text-xs text-muted">Pedidos por preparar.</p>
            <ChevronRight size={14} className="text-muted shrink-0" />
          </div>
        </motion.div>

        {/* Alertas de Inventario — Clickable a Reabastecer Inventario */}
        <motion.div
          variants={itemVariants}
          onClick={() => navigate('/admin/inicio/alertas-stock')}
          className={`bg-surface rounded-2xl md:rounded-3xl p-3.5 md:p-5 border border-app shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px] md:min-h-[140px] cursor-pointer hover:border-red-500/50 hover:shadow-md transition-all duration-200 active:scale-[0.98] ${
            metricas.stockBajo.length > 0 ? 'pulse-red-alert' : ''
          }`}
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} />
              </div>
              <h3 className="font-bold text-app text-xs md:text-sm truncate">Alertas Stock</h3>
            </div>
            <p className="text-lg md:text-2xl font-black text-app mt-2">
              {metricas.stockBajo.length} <span className="text-xs text-muted font-normal">alerta(s)</span>
            </p>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] md:text-xs text-muted">Reabastecer inventario bajo.</p>
            <ChevronRight size={14} className="text-muted shrink-0" />
          </div>
        </motion.div>
      </div>

      {/* ─── ACCESOS RÁPIDOS COMPLETO (Symmetrical horizontal grid) ────────── */}
      <motion.div variants={itemVariants} className="mt-5">
        <h2 className="text-[11px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5 opacity-80">
          🚀 Accesos Rápidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <motion.div whileHover={{ scale: 1.025, y: -1.5 }} whileTap={{ scale: 0.975 }}>
            <Link to="/admin/inventario" className="flex items-center gap-3 p-2.5 bg-surface rounded-xl border border-app hover:border-primary/50 transition-all hover:bg-surface-2 group h-full">
              <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Package size={16} />
              </div>
              <span className="font-bold text-app text-xs tracking-tight">Inventario</span>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.025, y: -1.5 }} whileTap={{ scale: 0.975 }}>
            <Link to="/admin/pedidos" className="flex items-center gap-3 p-2.5 bg-surface rounded-xl border border-app hover:border-primary/50 transition-all hover:bg-surface-2 group h-full">
              <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ShoppingBag size={16} />
              </div>
              <span className="font-bold text-app text-xs tracking-tight">Pedidos</span>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.025, y: -1.5 }} whileTap={{ scale: 0.975 }}>
            <Link to="/admin/credito" className="flex items-center gap-3 p-2.5 bg-surface rounded-xl border border-app hover:border-primary/50 transition-all hover:bg-surface-2 group h-full">
              <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CreditCard size={16} />
              </div>
              <span className="font-bold text-app text-xs tracking-tight">Créditos</span>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.025, y: -1.5 }} whileTap={{ scale: 0.975 }}>
            <Link to="/admin/configuracion" className="flex items-center gap-3 p-2.5 bg-surface rounded-xl border border-app hover:border-primary/50 transition-all hover:bg-surface-2 group h-full">
              <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Settings size={16} />
              </div>
              <span className="font-bold text-app text-xs tracking-tight">Configuración</span>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* ─── RESUMEN DE CAJA DE HOY ────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="mt-8">
        <div className="bg-surface rounded-2xl border border-app shadow-sm relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          {/* Header de la caja */}
          <div className="p-5 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-app flex items-center gap-2">
                  💵 Resumen de Caja (Hoy)
                </h2>
                <p className="text-xs text-muted mt-0.5">Distribución de ingresos según métodos de pago</p>
              </div>
              <div className="bg-primary/10 text-primary font-black px-4 py-2 rounded-xl text-base w-max self-start sm:self-auto shadow-sm border border-primary/10">
                Total: {formatCurrency(metricas.cajaTotal)}
              </div>
            </div>

            {/* Barra de distribución hoy */}
            {metricas.cajaTotal > 0 ? (
              <div className="space-y-4">
                <div className="w-full h-3 rounded-full bg-surface-2 overflow-hidden flex">
                  {metricas.cashTotal > 0 && (
                    <div 
                      className="h-full bg-emerald-500 transition-all" 
                      style={{ width: `${(metricas.cashTotal / metricas.cajaTotal) * 100}%` }}
                      title={`Efectivo: ${((metricas.cashTotal / metricas.cajaTotal) * 100).toFixed(0)}%`}
                    />
                  )}
                  {metricas.transferTotal > 0 && (
                    <div 
                      className="h-full bg-blue-500 transition-all" 
                      style={{ width: `${(metricas.transferTotal / metricas.cajaTotal) * 100}%` }}
                      title={`Transferencia: ${((metricas.transferTotal / metricas.cajaTotal) * 100).toFixed(0)}%`}
                    />
                  )}
                  {metricas.creditTotal > 0 && (
                    <div 
                      className="h-full bg-violet-500 transition-all" 
                      style={{ width: `${(metricas.creditTotal / metricas.cajaTotal) * 100}%` }}
                      title={`Crédito: ${((metricas.creditTotal / metricas.cajaTotal) * 100).toFixed(0)}%`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-app">Efectivo</span>
                    </div>
                    <span className="font-extrabold text-xs text-app">{formatCurrency(metricas.cashTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-xs font-bold text-app">Transferencia</span>
                    </div>
                    <span className="font-extrabold text-xs text-app">{formatCurrency(metricas.transferTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
                      <span className="text-xs font-bold text-app">Crédito (Fiado)</span>
                    </div>
                    <span className="font-extrabold text-xs text-app">{formatCurrency(metricas.creditTotal)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center bg-surface-2 rounded-xl border border-dashed border-app">
                <p className="text-2xl mb-1.5">📭</p>
                <p className="text-xs text-muted font-medium">Aún no se registran ventas el día de hoy.</p>
              </div>
            )}
          </div>

          {/* ─── Métodos de pago históricos más usados ─── */}
          <div className="border-t border-app px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-primary" />
                <p className="text-xs font-black text-app uppercase tracking-wider">Histórico — Métodos Más Usados</p>
              </div>
            </div>

            {billingLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 rounded-lg bg-surface-2 animate-pulse" />
                ))}
              </div>
            ) : billingMetrics?.pagoBreakdown && (() => {
              const bp = billingMetrics.pagoBreakdown
              const total = bp.efectivo + bp.transferencia + bp.credito
              if (total === 0) return (
                <p className="text-xs text-muted text-center py-2">Sin datos históricos aún.</p>
              )
              const methods = [
                { label: 'Efectivo', val: bp.efectivo, color: '#10b981', bg: 'bg-emerald-500' },
                { label: 'Transferencia', val: bp.transferencia, color: '#3b82f6', bg: 'bg-blue-500' },
                { label: 'Crédito', val: bp.credito, color: '#8b5cf6', bg: 'bg-violet-500' },
              ].sort((a, b) => b.val - a.val)

              return (
                <div className="space-y-2.5">
                  {methods.map((m, i) => {
                    const pct = total > 0 ? (m.val / total) * 100 : 0
                    const isBest = i === 0
                    return (
                      <div key={m.label}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-app">{m.label}</span>
                            {isBest && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: m.color + '20', color: m.color }}>⭐ Más usado</span>
                            )}
                          </div>
                          <span className="text-xs font-black text-app">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${m.bg}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      </motion.div>

    </motion.div>
  )
}
