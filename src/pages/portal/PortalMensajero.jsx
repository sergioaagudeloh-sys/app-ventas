/**
 * PortalMensajero.jsx
 * Portal del Mensajero / Domiciliario.
 * Muestra los domicilios asignados en tiempo real y permite actualizar su estado.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Truck, MapPin, Phone, CheckCircle2, Clock, Loader2, Navigation, AlertCircle, Package } from 'lucide-react'
import { subscribeToDeliveries, updateDeliveryStatus } from '../../services/deliveryService'
import usePortalStore from '../../store/portalStore'

const ESTADO_CONFIG = {
  pendiente:  { label: 'Pendiente',   color: '#fbbf24', nextLabel: 'Salir a entregar', next: 'en_camino' },
  asignado:   { label: 'Asignado',    color: '#38bdf8', nextLabel: 'Salir a entregar', next: 'en_camino' },
  en_camino:  { label: 'En Camino',   color: '#a78bfa', nextLabel: 'Marcar Entregado', next: 'entregado' },
  entregado:  { label: 'Entregado',   color: '#34d399', nextLabel: null,                next: null },
  fallido:    { label: 'Fallido',     color: '#f87171', nextLabel: null,                next: null },
}

export default function PortalMensajero() {
  const { portalEmployee } = usePortalStore()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    const unsub = subscribeToDeliveries(data => { setDeliveries(data); setLoading(false) }, portalEmployee?.id)
    return () => unsub()
  }, [portalEmployee?.id])

  const handleAdvance = async (orderId, nextState) => {
    if (!nextState) return
    setUpdating(orderId)
    try { await updateDeliveryStatus(orderId, nextState) }
    catch (e) { console.error(e) }
    finally { setUpdating(null) }
  }

  const markFailed = async (orderId) => {
    setUpdating(orderId)
    try { await updateDeliveryStatus(orderId, 'fallido') }
    catch (e) { console.error(e) }
    finally { setUpdating(null) }
  }

  const active   = deliveries.filter(d => ['asignado','en_camino'].includes(d.estado))
  const pending  = deliveries.filter(d => d.estado === 'pendiente')

  return (
    <div className="portal-mensajero">
      {/* ─── HEADER ───────────────────────────────────────────────────── */}
      <div className="portal-mensajero-header">
        <div className="portal-mensajero-icon"><Truck size={22} /></div>
        <div>
          <h1 className="portal-mensajero-title">Domicilios</h1>
          <p className="portal-mensajero-sub">{active.length} activos · {pending.length} en espera</p>
        </div>
        {loading && <Loader2 size={18} className="animate-spin ml-auto" />}
      </div>

      {/* ─── TABS ─────────────────────────────────────────────────────── */}
      {deliveries.length === 0 && !loading ? (
        <div className="portal-mensajero-empty">
          <Truck size={48} />
          <p>Sin domicilios asignados</p>
          <small>Aquí aparecerán los domicilios pendientes y los asignados a ti.</small>
        </div>
      ) : (
        <div className="portal-mensajero-list">
          {deliveries.map(delivery => {
            const cfg = ESTADO_CONFIG[delivery.estado] || ESTADO_CONFIG.pendiente
            const isUpdating = updating === delivery.id
            return (
              <motion.div key={delivery.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="portal-delivery-card">
                {/* Cabecera */}
                <div className="portal-delivery-header">
                  <div>
                    <span className="portal-delivery-number">Pedido #{delivery.orderNumber || delivery.orderId?.slice(-4)}</span>
                    <span className="portal-delivery-badge" style={{ background: cfg.color + '22', color: cfg.color, border: `1px solid ${cfg.color}44` }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Info cliente */}
                <div className="portal-delivery-info">
                  <div className="portal-delivery-row">
                    <MapPin size={14} />
                    <span>{delivery.address || 'Sin dirección especificada'}</span>
                  </div>
                  {delivery.clientName && (
                    <div className="portal-delivery-row">
                      <span className="portal-delivery-label">Cliente:</span>
                      <span>{delivery.clientName}</span>
                    </div>
                  )}
                  {delivery.phone && (
                    <a href={`tel:${delivery.phone}`} className="portal-delivery-row portal-delivery-row--phone">
                      <Phone size={14} />
                      <span>{delivery.phone}</span>
                    </a>
                  )}
                </div>

                {/* Items */}
                {delivery.items?.length > 0 && (
                  <div className="portal-delivery-items">
                    {delivery.items.map((item, i) => (
                      <div key={i} className="portal-order-item-row">
                        <span className="portal-order-item-qty">×{item.cantidad}</span>
                        <span className="portal-order-item-name">{item.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Acciones */}
                <div className="portal-delivery-actions">
                  {cfg.next && (
                    <button className="portal-advance-btn" disabled={isUpdating}
                      onClick={() => handleAdvance(delivery.id, cfg.next)}>
                      {isUpdating ? <Loader2 size={15} className="animate-spin" /> : <><Navigation size={15} /> {cfg.nextLabel}</>}
                    </button>
                  )}
                  {['pendiente','asignado','en_camino'].includes(delivery.estado) && (
                    <button className="portal-advance-btn portal-advance-btn--danger" disabled={isUpdating}
                      onClick={() => markFailed(delivery.id)}>
                      <AlertCircle size={15} /> No entregado
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
