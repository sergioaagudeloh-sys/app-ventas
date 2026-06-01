/**
 * PortalMensajero.jsx — v2
 * Portal del Mensajero / Domiciliario.
 *
 * Mejoras sobre v1:
 * - Estados completos: pendiente · asignado · listo · en_camino · entregado · fallido · reprogramado
 * - Acciones: Aceptar, En Ruta, Entregado, Fallido (con nota obligatoria), Reprogramar
 * - Botones de contacto al cliente (WhatsApp + Llamada)
 * - Stepper visual del flujo de entrega
 * - Modal de nota para estados negativos
 * - Sincronización bidireccional con /orders mediante updateDeliveryStatus
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck, MapPin, Phone, CheckCircle2, Clock, Loader2, Navigation,
  AlertCircle, Package, MessageCircle, AlertTriangle, X, RefreshCw,
  ChevronRight, ChevronDown, Bike, User,
} from 'lucide-react'
import { subscribeToDeliveries, updateDeliveryStatus } from '../../services/deliveryService'
import usePortalStore from '../../store/portalStore'
import { DELIVERY_STATES, DELIVERY_STATE_LABELS } from '../../constants'

// ─── Configuración de estados ─────────────────────────────────────────────────
const ESTADO_CFG = {
  [DELIVERY_STATES.PENDING]: {
    color: '#fbbf24',
    icon:  Clock,
    nextStates: [DELIVERY_STATES.ASSIGNED],
    nextLabel:  'Aceptar Pedido',
  },
  [DELIVERY_STATES.ASSIGNED]: {
    color: '#38bdf8',
    icon:  User,
    nextStates: [DELIVERY_STATES.READY, DELIVERY_STATES.ON_ROUTE],
    nextLabel:  'Listo para Salir',
  },
  [DELIVERY_STATES.READY]: {
    color: '#818cf8',
    icon:  Package,
    nextStates: [DELIVERY_STATES.ON_ROUTE],
    nextLabel:  'Salir a Entregar',
  },
  [DELIVERY_STATES.ON_ROUTE]: {
    color: '#a78bfa',
    icon:  Truck,
    nextStates: [DELIVERY_STATES.DELIVERED],
    nextLabel:  'Marcar Entregado ✓',
  },
  [DELIVERY_STATES.DELIVERED]: {
    color: '#34d399',
    icon:  CheckCircle2,
    nextStates: [],
    nextLabel:  null,
  },
  [DELIVERY_STATES.FAILED]: {
    color: '#f87171',
    icon:  AlertCircle,
    nextStates: [DELIVERY_STATES.RESCHEDULED, DELIVERY_STATES.ON_ROUTE],
    nextLabel:  'Reintentar Entrega',
  },
  [DELIVERY_STATES.RESCHEDULED]: {
    color: '#fb923c',
    icon:  Clock,
    nextStates: [DELIVERY_STATES.ON_ROUTE],
    nextLabel:  'Salir a Entregar',
  },
}

const ACTIVE_STATES = [
  DELIVERY_STATES.PENDING,
  DELIVERY_STATES.ASSIGNED,
  DELIVERY_STATES.READY,
  DELIVERY_STATES.ON_ROUTE,
  DELIVERY_STATES.RESCHEDULED,
]

const STEPPER_FLOW = [
  DELIVERY_STATES.PENDING,
  DELIVERY_STATES.ASSIGNED,
  DELIVERY_STATES.READY,
  DELIVERY_STATES.ON_ROUTE,
  DELIVERY_STATES.DELIVERED,
]

// ─── Stepper visual ───────────────────────────────────────────────────────────
function DeliverySteps({ estado }) {
  const idx = STEPPER_FLOW.indexOf(estado)
  return (
    <div className="flex items-center gap-1 mt-3 mb-1">
      {STEPPER_FLOW.map((step, i) => {
        const done    = i <= idx
        const current = i === idx
        return (
          <div key={step} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold transition-all ${
              done
                ? 'bg-primary text-white shadow-sm shadow-primary/40'
                : 'bg-surface-2 text-muted border border-app'
            } ${current ? 'ring-2 ring-primary/40 ring-offset-1 ring-offset-transparent' : ''}`}>
              {i + 1}
            </div>
            {i < STEPPER_FLOW.length - 1 && (
              <div className={`flex-1 h-0.5 mx-0.5 rounded-full transition-all ${done ? 'bg-primary' : 'bg-surface-2'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Modal de nota obligatoria ────────────────────────────────────────────────
function NoteModal({ targetState, onConfirm, onClose }) {
  const [nota, setNota] = useState('')
  const isFailed = targetState === DELIVERY_STATES.FAILED
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-surface w-full max-w-lg rounded-t-3xl border-t border-x border-app shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-app text-base">
            {isFailed ? '🚫 Entrega Fallida' : '📅 Reprogramar Entrega'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-app/10 text-muted transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-muted">Explica el motivo. Esto quedará registrado en el historial del pedido.</p>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={isFailed
            ? 'Ej. No había nadie en la dirección, número de celular errado...'
            : 'Ej. Cliente solicitó nuevo horario, dirección incorrecta...'}
          rows={3}
          autoFocus
          className="w-full px-4 py-3 rounded-2xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors resize-none"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-12 rounded-2xl border border-app text-sm text-muted hover:bg-app/10 transition-colors font-semibold">
            Cancelar
          </button>
          <button
            onClick={() => nota.trim() && onConfirm(nota.trim())}
            disabled={!nota.trim()}
            className={`flex-1 h-12 rounded-2xl text-white text-sm font-bold disabled:opacity-40 transition-opacity hover:opacity-90 ${isFailed ? 'bg-rose-500' : 'bg-amber-500'}`}
          >
            {isFailed ? 'Confirmar Falla' : 'Reprogramar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Tarjeta de entrega ───────────────────────────────────────────────────────
function DeliveryCard({ delivery, onAdvance, onFail, onReschedule, updating }) {
  const cfg        = ESTADO_CFG[delivery.estado] || ESTADO_CFG[DELIVERY_STATES.PENDING]
  const isUpdating = updating === delivery.id
  const isActive   = ACTIVE_STATES.includes(delivery.estado)
  const [expanded, setExpanded] = useState(true)

  const callClient = () => {
    if (delivery.phone) window.open(`tel:${delivery.phone}`, '_self')
  }

  const waClient = () => {
    if (delivery.phone) {
      let phone = delivery.phone.replace(/\D/g, '')
      if (phone.length === 10) {
        phone = '57' + phone
      }
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(`Hola ${delivery.clientName}, soy el domiciliario y estoy camino a tu pedido #${delivery.orderNumber}.`)}`, '_blank')
    }
  }

  const openMaps = () => {
    if (delivery.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.address)}`, '_blank')
    }
  }

  const Icon = cfg.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`rounded-3xl overflow-hidden border transition-all ${
        delivery.estado === DELIVERY_STATES.DELIVERED
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : delivery.estado === DELIVERY_STATES.FAILED
          ? 'border-rose-500/30 bg-rose-500/5'
          : 'border-app bg-surface'
      }`}
    >
      {/* ── Cabecera ─ */}
      <button
        className="w-full flex items-center gap-3 px-4 pt-4 pb-3 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: cfg.color + '22' }}>
          <Icon size={18} style={{ color: cfg.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-app">Pedido #{delivery.orderNumber || delivery.orderId?.slice(-4)}</p>
          <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5"
            style={{ background: cfg.color + '22', color: cfg.color }}>
            {DELIVERY_STATE_LABELS[delivery.estado] || delivery.estado}
          </span>
        </div>

        <ChevronDown size={16} className={`text-muted transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* ── Stepper ─ */}
      <div className="px-4">
        <DeliverySteps estado={delivery.estado} />
      </div>

      {/* ── Contenido expandible ─ */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 pt-3">
              {/* Info del cliente */}
              <div className="space-y-2">
                {delivery.address && (
                  <button onClick={openMaps} className="w-full flex items-center gap-2 text-left hover:text-primary transition-colors group">
                    <MapPin size={14} className="text-muted group-hover:text-primary shrink-0" />
                    <span className="text-sm text-app">{delivery.address}</span>
                    <Navigation size={12} className="text-muted group-hover:text-primary ml-auto shrink-0" />
                  </button>
                )}
                {delivery.clientName && (
                  <p className="text-sm text-muted flex items-center gap-1.5">
                    <User size={13} /> {delivery.clientName}
                  </p>
                )}
                {delivery.notas && (
                  <p className="text-xs text-amber-400 italic bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                    📝 {delivery.notas}
                  </p>
                )}
              </div>

              {/* Items del pedido */}
              {delivery.items?.length > 0 && (
                <div className="space-y-1">
                  {delivery.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        ×{item.cantidad}
                      </span>
                      <span className="text-app">{item.nombre}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Botones de contacto al cliente */}
              {delivery.phone && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={callClient}
                    className="flex items-center justify-center gap-2 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold hover:bg-blue-500/20 transition-colors active:scale-95">
                    <Phone size={15} /> Llamar
                  </button>
                  <button onClick={waClient}
                    className="flex items-center justify-center gap-2 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors active:scale-95">
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                </div>
              )}

              {/* Acciones de estado */}
              {isActive && (
                <div className="space-y-2">
                  {/* Avanzar estado principal */}
                  {cfg.nextLabel && cfg.nextStates.length > 0 && (
                    <button
                      onClick={() => onAdvance(delivery.id, cfg.nextStates[0])}
                      disabled={isUpdating}
                      className="w-full h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                      style={{ background: cfg.color }}
                    >
                      {isUpdating
                        ? <Loader2 size={16} className="animate-spin" />
                        : <><Navigation size={15} /> {cfg.nextLabel}</>
                      }
                    </button>
                  )}

                  {/* Botones secundarios */}
                  {delivery.estado !== DELIVERY_STATES.FAILED && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onFail(delivery.id)}
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-1.5 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-colors active:scale-95 disabled:opacity-40"
                      >
                        <AlertCircle size={13} /> Fallida
                      </button>
                      <button
                        onClick={() => onReschedule(delivery.id)}
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-1.5 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors active:scale-95 disabled:opacity-40"
                      >
                        <Clock size={13} /> Reprogramar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {delivery.estado === DELIVERY_STATES.DELIVERED && (
                <div className="flex items-center justify-center gap-2 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 text-sm font-bold">
                  <CheckCircle2 size={16} /> Entregado exitosamente
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PortalMensajero() {
  const { portalEmployee } = usePortalStore()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading]       = useState(true)
  const [updating, setUpdating]     = useState(null)
  const [noteTarget, setNoteTarget] = useState(null) // { orderId, targetState }

  useEffect(() => {
    const unsub = subscribeToDeliveries(
      data => { setDeliveries(data); setLoading(false) },
      portalEmployee?.id,
    )
    return () => unsub()
  }, [portalEmployee?.id])

  // ─── Acciones ───────────────────────────────────────────────────────────────
  const handleAdvance = async (orderId, nextState) => {
    if (!nextState) return
    setUpdating(orderId)
    try {
      await updateDeliveryStatus(orderId, nextState, {
        actorName: portalEmployee?.nombre || 'mensajero',
      })
    } catch (e) { console.error(e) }
    finally { setUpdating(null) }
  }

  const handleFail = (orderId) => {
    setNoteTarget({ orderId, targetState: DELIVERY_STATES.FAILED })
  }

  const handleReschedule = (orderId) => {
    setNoteTarget({ orderId, targetState: DELIVERY_STATES.RESCHEDULED })
  }

  const handleNoteConfirm = async (nota) => {
    if (!noteTarget) return
    const { orderId, targetState } = noteTarget
    setUpdating(orderId)
    setNoteTarget(null)
    try {
      await updateDeliveryStatus(orderId, targetState, {
        actorName: portalEmployee?.nombre || 'mensajero',
        nota,
      })
    } catch (e) { console.error(e) }
    finally { setUpdating(null) }
  }

  const active    = deliveries.filter(d => ACTIVE_STATES.includes(d.estado))
  const completed = deliveries.filter(d => d.estado === DELIVERY_STATES.DELIVERED || d.estado === DELIVERY_STATES.FAILED)

  return (
    <div className="portal-mensajero">
      {/* ─── HEADER ─ */}
      <div className="portal-mensajero-header">
        <div className="portal-mensajero-icon"><Bike size={22} /></div>
        <div>
          <h1 className="portal-mensajero-title">
            {portalEmployee?.nombre ? `Hola, ${portalEmployee.nombre.split(' ')[0]}` : 'Domicilios'}
          </h1>
          <p className="portal-mensajero-sub">
            {active.length} activos · {completed.length} completados hoy
          </p>
        </div>
        {loading && <Loader2 size={18} className="animate-spin ml-auto text-primary" />}
      </div>

      {/* ─── LISTA ─ */}
      {!loading && deliveries.length === 0 ? (
        <div className="portal-mensajero-empty">
          <Bike size={48} />
          <p>Sin domicilios asignados</p>
          <small>Aquí aparecerán los domicilios pendientes y los asignados a ti.</small>
        </div>
      ) : (
        <div className="portal-mensajero-list">
          <AnimatePresence mode="popLayout">
            {/* Entregas activas */}
            {active.map(delivery => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                updating={updating}
                onAdvance={handleAdvance}
                onFail={handleFail}
                onReschedule={handleReschedule}
              />
            ))}

            {/* Completadas del día */}
            {completed.length > 0 && (
              <motion.div key="completed-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-1">
                  Completadas hoy ({completed.length})
                </p>
                <div className="space-y-2 opacity-70">
                  {completed.map(delivery => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      updating={updating}
                      onAdvance={handleAdvance}
                      onFail={handleFail}
                      onReschedule={handleReschedule}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Modal de nota obligatoria ─ */}
      <AnimatePresence>
        {noteTarget && (
          <NoteModal
            targetState={noteTarget.targetState}
            onClose={() => setNoteTarget(null)}
            onConfirm={handleNoteConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
