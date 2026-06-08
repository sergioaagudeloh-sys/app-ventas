import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChefHat, Clock, CheckCircle2, Loader2, Package, ArrowRight, Bell, History } from 'lucide-react'
import { subscribeToProductionOrders, updateProductionStatus, subscribeToCompletedProductionOrders } from '../../services/productionService'
import { formatCurrency } from '../../utils/formatters'

const ESTADO_CONFIG = {
  alistamiento: { label: 'En Preparación', color: '#fb923c', next: 'listo', nextLabel: 'Marcar Listo' },
  listo:        { label: 'Listo',          color: '#34d399', next: 'entregado', nextLabel: 'Entregar' },
  entregado:    { label: 'Entregado',      color: '#6b7280', next: null, nextLabel: null },
}

export default function PortalCocina() {
  const [orders, setOrders] = useState([])
  const [completedOrders, setCompletedOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingCompleted, setLoadingCompleted] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'history'

  useEffect(() => {
    const unsubActive = subscribeToProductionOrders((data) => {
      setOrders(data)
      setLoading(false)
    })
    const unsubCompleted = subscribeToCompletedProductionOrders((data) => {
      setCompletedOrders(data)
      setLoadingCompleted(false)
    })
    return () => {
      unsubActive()
      unsubCompleted()
    }
  }, [])

  const handleAdvance = async (orderId, nextState) => {
    if (!nextState) return
    setUpdating(orderId)
    try { await updateProductionStatus(orderId, nextState) }
    catch (e) { console.error(e) }
    finally { setUpdating(null) }
  }

  const pending   = orders.filter(o => o.estado === 'alistamiento')
  const ready     = orders.filter(o => o.estado === 'listo')

  return (
    <div className="portal-cocina">
      {/* ─── CABECERA ─────────────────────────────────────────────────── */}
      <div className="portal-cocina-header flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="portal-cocina-icon"><ChefHat size={24} /></div>
          <div>
            <h1 className="portal-cocina-title">Cocina</h1>
            <p className="portal-cocina-sub">{pending.length} en preparación · {ready.length} listos</p>
          </div>
        </div>

        {/* TABS DE VISTA */}
        <div className="flex border border-app p-1 bg-surface-2 rounded-xl shrink-0 gap-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
              activeTab === 'active'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-app bg-transparent'
            }`}
          >
            <Clock size={14} /> Activos ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
              activeTab === 'history'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-app bg-transparent'
            }`}
          >
            <History size={14} /> Historial ({completedOrders.length})
          </button>
        </div>

        {(loading || loadingCompleted) && <Loader2 size={20} className="animate-spin" />}
      </div>

      {activeTab === 'active' ? (
        /* ─── COLUMNAS ACTIVOS ───────────────────────────────────────────── */
        <div className="portal-cocina-columns">
          {/* EN PREPARACIÓN */}
          <div className="portal-cocina-col">
            <div className="portal-col-header portal-col-header--orange">
              <Clock size={16} /> En Preparación ({pending.length})
            </div>
            {pending.length === 0 ? (
              <div className="portal-col-empty"><Package size={32} /><p>Sin pedidos en cola</p></div>
            ) : (
              <div className="portal-col-orders">
                <AnimatePresence>
                  {pending.map(order => (
                    <OrderCard key={order.id} order={order} updating={updating} onAdvance={handleAdvance} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* LISTOS */}
          <div className="portal-cocina-col">
            <div className="portal-col-header portal-col-header--green">
              <CheckCircle2 size={16} /> Listos ({ready.length})
            </div>
            {ready.length === 0 ? (
              <div className="portal-col-empty"><Package size={32} /><p>Nada listo aún</p></div>
            ) : (
              <div className="portal-col-orders">
                <AnimatePresence>
                  {ready.map(order => (
                    <OrderCard key={order.id} order={order} updating={updating} onAdvance={handleAdvance} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── HISTORIAL / PEDIDOS ENTREGADOS ───────────────────────────────── */
        <div className="flex-1 overflow-y-auto space-y-2.5 max-w-4xl mx-auto w-full text-left">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-1">
            Últimos despachados de hoy ({completedOrders.length})
          </p>
          {completedOrders.length === 0 ? (
            <div className="portal-col-empty py-16 flex flex-col items-center justify-center">
              <History size={36} className="text-muted/40 mb-2" />
              <p className="text-sm text-muted">No hay pedidos entregados en esta sesión</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-6">
              {completedOrders.map(order => {
                const dateStr = order.updatedAt?.toDate
                  ? order.updatedAt.toDate().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                  : order.updatedAt?.seconds
                  ? new Date(order.updatedAt.seconds * 1000).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                  : '—'
                return (
                  <div key={order.id} className="p-4 bg-surface border border-app rounded-2xl space-y-2.5 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-app font-mono">Pedido #{order.orderNumber || order.orderId?.slice(-4)}</span>
                        <span className="text-[10px] text-muted font-bold bg-surface-2 px-2 py-0.5 rounded-full flex items-center gap-1">
                          Entregado {dateStr}
                        </span>
                      </div>
                      
                      {order.tableName && (
                        <div className="mt-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full inline-block">
                          🛎️ {order.tableName}
                        </div>
                      )}

                      <div className="space-y-1 bg-surface-2/40 p-2 rounded-xl border border-app mt-2">
                        {order.items?.map((it, i) => (
                          <div key={i} className="flex justify-between text-xs text-app">
                            <span>{it.nombre}{it.talla ? ` / ${it.talla}` : ''}{it.color ? ` / ${it.color}` : ''}</span>
                            <span className="font-bold">×{it.cantidad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {order.notas && (
                      <p className="text-[11px] text-muted italic bg-surface-2 p-1.5 rounded-lg border border-app">
                        Nota: {order.notas}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, updating, onAdvance }) {
  const config = ESTADO_CONFIG[order.estado] || ESTADO_CONFIG.alistamiento
  const isUpdating = updating === order.id

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
      className="portal-order-card">
      <div className="portal-order-card-header">
        <span className="portal-order-number">#{order.orderNumber || order.orderId?.slice(-4)}</span>
        {order.tipoEntrega === 'mesa' && order.tableName && (
          <span className="portal-order-badge bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/30 font-black px-2 py-0.5 rounded-full text-[10px]">
            🛎️ {order.tableName}
          </span>
        )}
        <span className="portal-order-badge" style={{ background: config.color + '22', color: config.color, border: `1px solid ${config.color}44` }}>
          {config.label}
        </span>
      </div>
      <div className="portal-order-items">
        {order.items?.map((item, i) => (
          <div key={i} className="portal-order-item-row">
            <span className="portal-order-item-qty">×{item.cantidad}</span>
            <span className="portal-order-item-name">{item.nombre}{item.talla ? ` (${item.talla})` : ''}{item.color ? ` / ${item.color}` : ''}</span>
          </div>
        ))}
      </div>
      {order.notas && <p className="portal-order-notes">📝 {order.notas}</p>}
      {config.next && (
        <button className="portal-advance-btn" disabled={isUpdating} onClick={() => onAdvance(order.id, config.next)}>
          {isUpdating ? <Loader2 size={15} className="animate-spin" /> : <><ArrowRight size={15} /> {config.nextLabel}</>}
        </button>
      )}
    </motion.div>
  )
}
