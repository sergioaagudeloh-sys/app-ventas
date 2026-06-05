import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, DollarSign, AlertTriangle,
  Package, ShoppingBag, CreditCard, Settings, ChevronRight,
  BarChart3, Banknote, ArrowRight, X, Wallet, Percent, QrCode, Megaphone, Loader2
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
import { useEffect } from 'react'
import { getTrackingMetrics } from '../../services/trackingAnalyticsService'

export default function AdminHome() {
  const { user } = useAuthStore()
  const { sellerName, appIcon, appName, creditsEnabled } = useAppConfigStore()
  const navigate = useNavigate()
  const { data: orders = [] } = useOrders()
  const { data: credits = [] } = useCredits('activo')
  const { data: products = [] } = useProducts()
  const { metrics: billingMetrics, isLoading: billingLoading } = useBilling()
  const [showBillingModal, setShowBillingModal] = useState(false)

  // Estados para telemetría de conversión de seguimiento
  const [trackingMetrics, setTrackingMetrics] = useState(null)
  const [trackingLoading, setTrackingLoading] = useState(true)

  useEffect(() => {
    getTrackingMetrics().then(data => {
      setTrackingMetrics(data)
      setTrackingLoading(false)
    }).catch(err => {
      console.error(err)
      setTrackingLoading(false)
    })
  }, [])

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

      {/* Tarjeta de Bienvenida Centrada Premium */}
      <motion.div
        variants={itemVariants}
        className="bg-surface rounded-3xl py-1.5 px-6 md:py-2 md:px-8 border border-app shadow-sm flex flex-col items-center text-center gap-1.5 mb-8 relative overflow-hidden"
      >
        <div className="absolute -right-16 -top-16 w-36 h-36 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Logotipo de la tienda */}
        {appIcon ? (
          <img 
            src={appIcon} 
            alt={appName || 'Logo'} 
            className="h-48 w-auto max-w-[360px] object-contain shrink-0 hover:scale-105 transition-all duration-300 select-none"
            style={{ marginTop: '0.5rem', marginBottom: '-1.5rem' }}
          />
        ) : (
          <div 
            className="w-24 h-24 rounded-3xl text-white font-black text-4xl flex items-center justify-center shrink-0 select-none shadow-lg my-0"
            style={{ 
              background: 'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 85%, #000000))',
              textShadow: '0 1px 2px rgba(0,0,0,0.15)'
            }}
          >
            {(appName || 'V').charAt(0).toUpperCase()}
          </div>
        )}

        {/* Insignia del Panel */}
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-4 py-1 rounded-full border border-primary/20">
          Panel de Administración
        </span>

        {/* Saludo y Nombre */}
        <h1 className="text-xl md:text-2xl font-black text-app tracking-tight leading-tight mt-1">
          {(() => {
            const hour = new Date().getHours()
            if (hour < 12) return 'Buenos días'
            if (hour < 18) return 'Buenas tardes'
            return 'Buenas noches'
          })()}, <span className="text-primary font-black">{sellerName || 'Mónica Henao'}</span>
        </h1>

        {/* Línea Divisoria Sutil */}
        <div className="w-full max-w-md h-[1px] bg-app/10 my-0.5" />

        {/* Fecha y Subtítulo */}
        <div className="flex flex-col items-center">
          <p className="text-xs font-black text-app uppercase tracking-widest text-primary/95">
            {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()}
          </p>
          <p className="text-[10px] text-muted mt-0.5 leading-relaxed">Monitoreo y resumen de tu negocio</p>
        </div>
      </motion.div>

      {/* ─── TARJETAS DE MÉTRICAS ──────────────────────────────────────────── */}
      <div className={`grid grid-cols-2 ${creditsEnabled ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 md:gap-4 mb-8`}>

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

        {/* Por Cobrar (Solo si créditos están activos) */}
        {creditsEnabled && (
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
        )}

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
        <div className={`grid grid-cols-2 ${creditsEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-2.5`}>
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
          {creditsEnabled && (
            <motion.div whileHover={{ scale: 1.025, y: -1.5 }} whileTap={{ scale: 0.975 }}>
              <Link to="/admin/credito" className="flex items-center gap-3 p-2.5 bg-surface rounded-xl border border-app hover:border-primary/50 transition-all hover:bg-surface-2 group h-full">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CreditCard size={16} />
                </div>
                <span className="font-bold text-app text-xs tracking-tight">Créditos</span>
              </Link>
            </motion.div>
          )}
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
                  {creditsEnabled && metricas.creditTotal > 0 && (
                    <div 
                      className="h-full bg-violet-500 transition-all" 
                      style={{ width: `${(metricas.creditTotal / metricas.cajaTotal) * 100}%` }}
                      title={`Crédito: ${((metricas.creditTotal / metricas.cajaTotal) * 100).toFixed(0)}%`}
                    />
                  )}
                </div>

                <div className={`grid grid-cols-1 ${creditsEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
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
                  {creditsEnabled && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
                        <span className="text-xs font-bold text-app">Crédito (Fiado)</span>
                      </div>
                      <span className="font-extrabold text-xs text-app">{formatCurrency(metricas.creditTotal)}</span>
                    </div>
                  )}
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
              const total = bp.efectivo + bp.transferencia + (creditsEnabled ? bp.credito : 0)
              if (total === 0) return (
                <p className="text-xs text-muted text-center py-2">Sin datos históricos aún.</p>
              )
              const methods = [
                { label: 'Efectivo', val: bp.efectivo, color: '#10b981', bg: 'bg-emerald-500', enabled: true },
                { label: 'Transferencia', val: bp.transferencia, color: '#3b82f6', bg: 'bg-blue-500', enabled: true },
                { label: 'Crédito', val: bp.credito, color: '#8b5cf6', bg: 'bg-violet-500', enabled: creditsEnabled },
              ].filter(m => m.enabled).sort((a, b) => b.val - a.val)

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

      {/* ─── TELEMETRÍA Y CONVERSIÓN DE SEGUIMIENTO (NUEVO PANEL) ───────────────── */}
      <motion.div variants={itemVariants} className="mt-8">
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4 border-b border-app pb-3">
            <Megaphone size={18} className="text-primary animate-pulse" />
            <div>
              <h2 className="text-sm font-bold text-app uppercase tracking-wider">
                Conversión desde Seguimiento de Pedidos
              </h2>
              <p className="text-[10px] text-muted">Métricas de interacción, recompra y fidelización comercial en caliente</p>
            </div>
          </div>

          {trackingLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'QRs Generados', value: trackingMetrics?.qrGenerados || 0, desc: 'Compartidos en local', emoji: '🎫' },
                { label: 'Accesos por QR', value: trackingMetrics?.accesosQR || 0, desc: 'Escaneos en vivo', emoji: '📱' },
                { label: 'Accesos por Enlace', value: trackingMetrics?.accesosEnlace || 0, desc: 'Clicks en chat/web', emoji: '🔗' },
                { label: 'Compartidos WA', value: trackingMetrics?.sharesWa || 0, desc: 'Mensajes enviados', emoji: '💬' },
                { label: 'Retornos a Tienda', value: trackingMetrics?.clicsTienda || 0, desc: 'Recompra generada', emoji: '🛍️' },
                { label: 'Descargas de App', value: trackingMetrics?.clicsApp || 0, desc: 'Instalaciones móviles', emoji: '📲' },
              ].map((item, idx) => (
                <div key={idx} className="p-4 bg-surface-2 rounded-2xl border border-app shadow-xs flex flex-col justify-between min-h-[100px]">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-muted leading-tight">{item.label}</span>
                    <span className="text-lg leading-none">{item.emoji}</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-black text-app leading-none">{item.value}</p>
                    <p className="text-[9px] text-muted mt-1 leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

    </motion.div>
  )
}
