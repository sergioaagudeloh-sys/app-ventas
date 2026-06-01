/**
 * OrderDeliveryPanel
 * Panel de gestión de entrega embebido en la tarjeta expandida de cada pedido
 * en AdminOrders. Solo visible cuando:
 *   - order.tipoEntrega === 'domicilio'
 *   - deliverySettings.customDelivery.enabled === true
 *
 * Permite: asignar mensajero (empleado o externo), cambiar estado logístico,
 * enviar mensaje por WhatsApp con plantilla configurable, y retirar asignación.
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bike, User, Phone, MessageCircle, Copy, Check, ChevronDown,
  Loader2, AlertTriangle, X, Unlink, SendHorizonal, Clock,
  CheckCircle2, Truck, RefreshCw,
} from 'lucide-react'
import {
  getExternalMessengers,
  assignDelivery,
  unassignDelivery,
  updateDeliveryStatus,
  getDelivery,
  queueDelivery,
  buildMessengerMessage,
} from '../../../services/deliveryService'
import { getEmployeesByRole } from '../../../services/employeeService'
import { ROLES, DELIVERY_STATES, DELIVERY_STATE_LABELS, DEFAULT_MESSENGER_TEMPLATE } from '../../../constants'
import useAppConfigStore from '../../../store/appConfigStore'

// ─── Mapa de estados ──────────────────────────────────────────────────────────
const STATE_COLORS = {
  [DELIVERY_STATES.PENDING]:     'bg-amber-500/15   text-amber-400   border-amber-500/30',
  [DELIVERY_STATES.ASSIGNED]:    'bg-blue-500/15    text-blue-400    border-blue-500/30',
  [DELIVERY_STATES.READY]:       'bg-indigo-500/15  text-indigo-400  border-indigo-500/30',
  [DELIVERY_STATES.ON_ROUTE]:    'bg-purple-500/15  text-purple-400  border-purple-500/30',
  [DELIVERY_STATES.DELIVERED]:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  [DELIVERY_STATES.FAILED]:      'bg-rose-500/15    text-rose-400    border-rose-500/30',
  [DELIVERY_STATES.RESCHEDULED]: 'bg-orange-500/15  text-orange-400  border-orange-500/30',
}

const STATE_FLOW = [
  DELIVERY_STATES.PENDING,
  DELIVERY_STATES.ASSIGNED,
  DELIVERY_STATES.READY,
  DELIVERY_STATES.ON_ROUTE,
  DELIVERY_STATES.DELIVERED,
]

// ─── Modal de nota para fallido/reprogramado ──────────────────────────────────
function FailNoteModal({ onConfirm, onClose, estado }) {
  const [nota, setNota] = useState('')
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        className="bg-surface rounded-2xl shadow-2xl border border-app w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-app flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-400" />
            <h3 className="font-bold text-app text-sm">
              {estado === DELIVERY_STATES.FAILED ? 'Entrega Fallida' : 'Reprogramar Entrega'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-app/10 text-muted transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted">Ingresa una nota obligatoria explicando la razón.</p>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej. No había nadie en la dirección, número errado..."
            rows={3}
            autoFocus
            className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors resize-none"
          />
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-app text-xs text-muted hover:bg-app/10 transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => nota.trim() && onConfirm(nota.trim())}
              disabled={!nota.trim()}
              className="flex-1 h-9 rounded-xl bg-rose-500 text-white text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Confirmar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OrderDeliveryPanel({ order }) {
  const { deliverySettings } = useAppConfigStore()
  const cd = deliverySettings?.customDelivery || {}
  const template = cd.messengerTemplate || DEFAULT_MESSENGER_TEMPLATE

  const [delivery, setDelivery]           = useState(null)
  const [employees, setEmployees]         = useState([])
  const [externals, setExternals]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [busy, setBusy]                   = useState(false)
  const [copied, setCopied]               = useState(false)
  const [failModal, setFailModal]         = useState(null) // 'fallido' | 'reprogramado'
  const [showHistory, setShowHistory]     = useState(false)

  // Carga datos al montar
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [emp, ext, del] = await Promise.all([
          getEmployeesByRole(ROLES.MENSAJERO),
          getExternalMessengers(),
          getDelivery(order.id),
        ])
        if (!cancelled) {
          setEmployees(emp)
          setExternals(ext)
          setDelivery(del)
        }
      } catch (e) {
        console.error('[OrderDeliveryPanel]', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [order.id])

  // ─── Acción: asignar mensajero ─────────────────────────────────────────────
  const handleAssign = useCallback(async (type, id, name) => {
    setBusy(true)
    try {
      if (!delivery) {
        // Primera vez: crear documento en deliveries
        await queueDelivery({
          orderId:       order.id,
          orderNumber:   order.orderNumber,
          address:       order.cliente?.direccion || '',
          clientName:    order.cliente?.nombre || '',
          phone:         order.cliente?.celular || '',
          mensajeroId:    type === 'employee' ? id : null,
          mensajeroExtId: type === 'external' ? id : null,
          items: (order.items || []).map(i => ({ nombre: i.nombre, cantidad: i.cantidad })),
          notas: order.notas || '',
        })
      } else {
        await assignDelivery(order.id, {
          mensajeroId:    type === 'employee' ? id : null,
          mensajeroExtId: type === 'external' ? id : null,
          actorName: 'admin',
        })
      }
      const updated = await getDelivery(order.id)
      setDelivery(updated)
    } catch (e) {
      console.error('[OrderDeliveryPanel] assign error', e)
    } finally {
      setBusy(false)
    }
  }, [order, delivery])

  // ─── Acción: retirar asignación ────────────────────────────────────────────
  const handleUnassign = useCallback(async () => {
    if (!delivery) return
    setBusy(true)
    try {
      await unassignDelivery(order.id, 'admin')
      const updated = await getDelivery(order.id)
      setDelivery(updated)
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }, [order.id, delivery])

  // ─── Acción: cambiar estado ────────────────────────────────────────────────
  const handleStateChange = useCallback(async (estado, nota = '') => {
    if (!delivery && estado !== DELIVERY_STATES.PENDING) {
      alert('Primero asigna un mensajero para avanzar el estado.')
      return
    }
    setBusy(true)
    try {
      if (!delivery) {
        await queueDelivery({
          orderId:     order.id,
          orderNumber: order.orderNumber,
          address:     order.cliente?.direccion || '',
          clientName:  order.cliente?.nombre    || '',
          phone:       order.cliente?.celular   || '',
          items: (order.items || []).map(i => ({ nombre: i.nombre, cantidad: i.cantidad })),
          notas: order.notas || '',
        })
      }
      await updateDeliveryStatus(order.id, estado, { actorName: 'admin', nota })
      const updated = await getDelivery(order.id)
      setDelivery(updated)
      setFailModal(null)
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }, [order, delivery])

  // ─── Acciones de contacto ──────────────────────────────────────────────────
  const resolveMessenger = () => {
    if (!delivery) return null
    if (delivery.mensajeroId) {
      return employees.find(e => e.id === delivery.mensajeroId) || null
    }
    if (delivery.mensajeroExtId) {
      return externals.find(e => e.id === delivery.mensajeroExtId) || null
    }
    return null
  }

  const messenger = resolveMessenger()

  const callMessenger = () => {
    const phone = messenger?.telefono || messenger?.phone
    if (phone) window.open(`tel:${phone}`, '_self')
  }

  const waMessenger = () => {
    let phone = (messenger?.telefono || messenger?.phone || '').replace(/\D/g, '')
    if (phone) {
      if (phone.length === 10) {
        phone = '57' + phone
      }
      const msg = buildMessengerMessage(order, template)
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank')
    }
  }

  const copyMessage = () => {
    const msg = buildMessengerMessage(order, template)
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const currentState = delivery?.estado || DELIVERY_STATES.PENDING
  const nextState    = STATE_FLOW[STATE_FLOW.indexOf(currentState) + 1] || null

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-surface rounded-2xl border border-app flex items-center justify-center gap-2 text-muted text-xs">
        <Loader2 size={14} className="animate-spin" /> Cargando gestión de entrega...
      </div>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-2xl border bg-primary/5 overflow-hidden"
        style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
      >
        {/* Encabezado del panel */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderBottomColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bike size={14} className="text-primary" />
            </div>
            <span className="text-xs font-bold text-app">Gestión de Entrega</span>
          </div>
          {/* Badge de estado logístico */}
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATE_COLORS[currentState] || ''}`}>
            {DELIVERY_STATE_LABELS[currentState] || currentState}
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* ── Mensajero asignado ─ */}
          {messenger ? (
            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-app">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User size={15} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-app truncate">
                  {messenger.nombre || messenger.name}
                </p>
                <p className="text-xs text-muted truncate">
                  {delivery.mensajeroId ? 'Empleado' : 'Externo'} · {messenger.telefono || messenger.phone}
                </p>
              </div>
              {/* Contacto */}
              <div className="flex items-center gap-1">
                <button onClick={callMessenger} title="Llamar" className="p-2 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors">
                  <Phone size={14} />
                </button>
                <button onClick={waMessenger} title="WhatsApp" className="p-2 rounded-lg hover:bg-emerald-500/10 text-muted hover:text-emerald-400 transition-colors">
                  <MessageCircle size={14} />
                </button>
                <button onClick={copyMessage} title="Copiar mensaje" className="p-2 rounded-lg hover:bg-blue-500/10 text-muted hover:text-blue-400 transition-colors">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <button onClick={handleUnassign} disabled={busy} title="Retirar asignación" className="p-2 rounded-lg hover:bg-rose-500/10 text-muted hover:text-rose-400 transition-colors">
                  <Unlink size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* ── Selector de mensajero ─ */
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Asignar Domiciliario</p>

              {employees.length === 0 && externals.length === 0 && (
                <p className="text-xs text-muted italic text-center py-2">
                  No hay domiciliarios configurados. Agrega empleados con rol Mensajero o mensajeros externos en Ajustes.
                </p>
              )}

              {employees.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted uppercase font-bold mb-1.5">Empleados</p>
                  <div className="space-y-1">
                    {employees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => handleAssign('employee', emp.id, emp.nombre)}
                        disabled={busy}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-app hover:border-primary/40 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                      >
                        <User size={13} className="text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-app truncate">{emp.nombre}</p>
                          {emp.telefono && <p className="text-[10px] text-muted">{emp.telefono}</p>}
                        </div>
                        <Bike size={12} className="text-muted" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {externals.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted uppercase font-bold mb-1.5">Mensajeros Externos</p>
                  <div className="space-y-1">
                    {externals.map(ext => (
                      <button
                        key={ext.id}
                        onClick={() => handleAssign('external', ext.id, ext.name)}
                        disabled={busy || ext.status === 'fuera_servicio'}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-app hover:border-primary/40 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                      >
                        <Bike size={13} className="text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-app truncate">{ext.name}</p>
                          <p className="text-[10px] text-muted">{ext.phone}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          ext.status === 'disponible'     ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          ext.status === 'ocupado'        ? 'bg-amber-500/10   text-amber-400   border-amber-500/20'   :
                                                           'bg-rose-500/10    text-rose-400    border-rose-500/20'
                        }`}>
                          {ext.status === 'disponible' ? 'Libre' : ext.status === 'ocupado' ? 'Ocupado' : 'N/D'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Acciones de estado ─ */}
          {delivery && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Cambiar Estado</p>
              <div className="flex flex-wrap gap-2">
                {nextState && (
                  <button
                    onClick={() => handleStateChange(nextState)}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <Truck size={12} />}
                    {DELIVERY_STATE_LABELS[nextState]}
                  </button>
                )}
                <button
                  onClick={() => setFailModal(DELIVERY_STATES.FAILED)}
                  disabled={busy || currentState === DELIVERY_STATES.DELIVERED}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                >
                  <AlertTriangle size={12} /> Fallida
                </button>
                <button
                  onClick={() => setFailModal(DELIVERY_STATES.RESCHEDULED)}
                  disabled={busy || currentState === DELIVERY_STATES.DELIVERED}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                >
                  <Clock size={12} /> Reprogramar
                </button>
              </div>
            </div>
          )}

          {/* ── Enviar pedido por WhatsApp ─ */}
          {messenger && (
            <button
              onClick={waMessenger}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
            >
              <SendHorizonal size={14} /> Enviar Pedido al Mensajero
            </button>
          )}

          {/* ── Historial de eventos ─ */}
          {delivery?.history?.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(v => !v)}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-app transition-colors"
              >
                <ChevronDown size={12} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                Historial ({delivery.history.length} eventos)
              </button>
              <AnimatePresence>
                {showHistory && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-2 space-y-1.5 border-l-2 border-app pl-3">
                      {[...delivery.history].reverse().map((h, i) => (
                        <div key={i} className="text-[11px]">
                          <span className="font-semibold text-app">{DELIVERY_STATE_LABELS[h.estado] || h.estado}</span>
                          <span className="text-muted"> · {h.actor} · {new Date(h.timestamp).toLocaleString()}</span>
                          {h.nota && <p className="text-muted italic">{h.nota}</p>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal de nota obligatoria */}
      <AnimatePresence>
        {failModal && (
          <FailNoteModal
            estado={failModal}
            onClose={() => setFailModal(null)}
            onConfirm={(nota) => handleStateChange(failModal, nota)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
