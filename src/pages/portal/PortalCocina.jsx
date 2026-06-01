/**
 * PortalCocina.jsx
 * Portal en tiempo real para el Cocinero.
 * Muestra las órdenes en cola de producción con acciones de avance de estado.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChefHat, Clock, CheckCircle2, Loader2, Package, ArrowRight, Bell } from 'lucide-react'
import { subscribeToProductionOrders, updateProductionStatus } from '../../services/productionService'
import { formatCurrency } from '../../utils/formatters'

const ESTADO_CONFIG = {
  alistamiento: { label: 'En Preparación', color: '#fb923c', next: 'listo', nextLabel: 'Marcar Listo' },
  listo:        { label: 'Listo',          color: '#34d399', next: 'entregado', nextLabel: 'Entregar' },
  entregado:    { label: 'Entregado',      color: '#6b7280', next: null, nextLabel: null },
}

export default function PortalCocina() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    const unsub = subscribeToProductionOrders((data) => {
      setOrders(data)
      setLoading(false)
    })
    return () => unsub()
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
      <div className="portal-cocina-header">
        <div className="portal-cocina-icon"><ChefHat size={24} /></div>
        <div>
          <h1 className="portal-cocina-title">Cocina</h1>
          <p className="portal-cocina-sub">{pending.length} en preparación · {ready.length} listos</p>
        </div>
        {loading && <Loader2 size={20} className="animate-spin ml-auto" />}
      </div>

      {/* ─── COLUMNAS ─────────────────────────────────────────────────── */}
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
