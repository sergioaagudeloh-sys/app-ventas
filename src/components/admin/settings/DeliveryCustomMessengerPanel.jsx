/**
 * DeliveryCustomMessengerPanel
 * Panel de configuración de Mensajero Propio dentro de AdminSettings.
 * Gestiona: activación del módulo, tipo de costo, plantilla de mensaje
 * y el CRUD de mensajeros externos almacenados en Firestore.
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bike, Plus, Trash2, Edit3, Check, X, Phone, MessageCircle,
  Copy, ChevronDown, ChevronUp, Info, ToggleLeft, ToggleRight,
  DollarSign, Clock, MessageSquare, User, RefreshCw,
} from 'lucide-react'
import {
  getExternalMessengers,
  addExternalMessenger,
  updateExternalMessenger,
  deleteExternalMessenger,
  setMessengerStatus,
} from '../../../services/deliveryService'
import { MESSENGER_STATUS_LABELS, DEFAULT_MESSENGER_TEMPLATE } from '../../../constants'
import NumberInput from '../../ui/NumberInput'

const STATUS_COLORS = {
  disponible:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  ocupado:       'bg-amber-500/15   text-amber-400   border-amber-500/30',
  fuera_servicio:'bg-rose-500/15    text-rose-400    border-rose-500/30',
}

// ─── Sub-componente: Fila de mensajero externo ────────────────────────────────
function MessengerRow({ messenger, onStatusChange, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleStatus = async (newStatus) => {
    setBusy(true)
    await onStatusChange(messenger.id, newStatus)
    setBusy(false)
  }

  const call = () => window.open(`tel:${messenger.phone}`, '_self')
  const wa   = () => {
    const phone = (messenger.whatsapp || messenger.phone).replace(/\D/g, '')
    window.open(`https://wa.me/57${phone}`, '_blank')
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-surface border border-app rounded-xl overflow-hidden"
    >
      {/* Encabezado */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bike size={16} className="text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-app truncate">{messenger.name}</p>
          <p className="text-xs text-muted truncate">{messenger.phone}</p>
        </div>

        {/* Badge de estado */}
        <select
          value={messenger.status || 'disponible'}
          disabled={busy}
          onChange={(e) => handleStatus(e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded-lg border cursor-pointer appearance-none focus:outline-none ${STATUS_COLORS[messenger.status || 'disponible']}`}
        >
          {Object.entries(MESSENGER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-1">
          <button onClick={call} title="Llamar" className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors">
            <Phone size={14} />
          </button>
          <button onClick={wa} title="WhatsApp" className="p-1.5 rounded-lg text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
            <MessageCircle size={14} />
          </button>
          <button onClick={() => onEdit(messenger)} title="Editar" className="p-1.5 rounded-lg text-muted hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
            <Edit3 size={14} />
          </button>
          <button onClick={() => onDelete(messenger.id)} title="Eliminar" className="p-1.5 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {messenger.notes && (
        <div className="px-3 pb-3">
          <p className="text-xs text-muted italic">{messenger.notes}</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── Sub-componente: Modal para agregar/editar mensajero externo ──────────────
function MessengerFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    name:     initial?.name     || '',
    phone:    initial?.phone    || '',
    whatsapp: initial?.whatsapp || '',
    notes:    initial?.notes    || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('El nombre y el teléfono son obligatorios.')
      return
    }
    setLoading(true)
    try {
      await onSave(form, initial?.id || null)
      onClose()
    } catch (e) {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

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
        className="bg-surface rounded-2xl shadow-2xl border border-app w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-app">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bike size={16} className="text-primary" />
            </div>
            <h3 className="font-bold text-app text-sm">
              {initial ? 'Editar Mensajero' : 'Agregar Mensajero Externo'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-app/10 text-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {[
            { field: 'name',     label: 'Nombre completo',   placeholder: 'Ej. Carlos Ramírez',    icon: User },
            { field: 'phone',    label: 'Teléfono',           placeholder: '3001234567',             icon: Phone },
            { field: 'whatsapp', label: 'WhatsApp (opcional)', placeholder: 'Si es diferente al tel', icon: MessageCircle },
          ].map(({ field, label, placeholder, icon: Icon }) => (
            <div key={field}>
              <label className="block text-xs font-semibold text-muted mb-1">{label}</label>
              <div className="relative">
                <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={form[field]}
                  onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Observaciones</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Zona de cobertura, horario, vehículo..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-app text-sm text-muted hover:bg-app/10 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {initial ? 'Guardar Cambios' : 'Agregar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DeliveryCustomMessengerPanel({ formData, setFormData }) {
  const cd = formData.deliverySettings?.customDelivery || {}
  const isEnabled = cd.enabled ?? false

  const [messengers, setMessengers]   = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [showModal, setShowModal]     = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [showTemplate, setShowTemplate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Helpers para actualizar customDelivery dentro del formData sin mutar deliverySettings
  const updateCd = useCallback((patch) => {
    setFormData(prev => ({
      ...prev,
      deliverySettings: {
        ...prev.deliverySettings,
        customDelivery: {
          ...(prev.deliverySettings?.customDelivery || {}),
          ...patch,
        },
      },
    }))
  }, [setFormData])

  // Cargar mensajeros externos de Firestore al activar el módulo
  useEffect(() => {
    if (!isEnabled) return
    setLoadingList(true)
    getExternalMessengers()
      .then(setMessengers)
      .catch(console.error)
      .finally(() => setLoadingList(false))
  }, [isEnabled])

  const handleSaveMessenger = async (form, id) => {
    if (id) {
      await updateExternalMessenger(id, form)
    } else {
      await addExternalMessenger(form)
    }
    const updated = await getExternalMessengers()
    setMessengers(updated)
  }

  const handleDelete = async (id) => {
    await deleteExternalMessenger(id)
    setMessengers(prev => prev.filter(m => m.id !== id))
    setDeleteConfirm(null)
  }

  const handleStatusChange = async (id, status) => {
    await setMessengerStatus(id, status)
    setMessengers(prev => prev.map(m => m.id === id ? { ...m, status } : m))
  }

  const handleEdit = (messenger) => {
    setEditTarget(messenger)
    setShowModal(true)
  }

  const effectiveTemplate = cd.messengerTemplate || DEFAULT_MESSENGER_TEMPLATE

  return (
    <>
      <div className="p-4 bg-surface-2/60 rounded-2xl border border-app space-y-3">
        {/* Encabezado con toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bike size={16} className="text-primary" />
              <p className="text-sm font-bold text-app">Mensajero Propio</p>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Gestiona entregas con domiciliarios propios o externos
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isEnabled}
              onChange={(e) => updateCd({ enabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner" />
          </label>
        </div>

        <AnimatePresence>
          {isEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-2 overflow-hidden"
            >
              {/* ── Nombre del servicio ─ */}
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Nombre del Servicio</label>
                <input
                  type="text"
                  value={cd.serviceLabel || ''}
                  onChange={(e) => updateCd({ serviceLabel: e.target.value })}
                  placeholder="Ej. Domicilios Propios"
                  className="w-full h-10 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* ── Configuración de costo ─ */}
              <div className="p-3 rounded-xl bg-surface border border-app space-y-3">
                <p className="text-xs font-bold text-muted uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign size={12} /> Costo del Domicilio
                </p>

                <div className="flex gap-2">
                  {[
                    { val: 'fijo', label: 'Tarifa Fija' },
                    { val: 'personalizado', label: 'Personalizado por Pedido' },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      onClick={() => updateCd({ costType: val })}
                      className={`flex-1 h-9 rounded-xl text-xs font-semibold border transition-all ${
                        (cd.costType || 'fijo') === val
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-surface border-app text-muted hover:border-primary/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {(cd.costType || 'fijo') === 'fijo' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <label className="block text-xs font-semibold text-muted mb-1">Tarifa Fija (COP)</label>
                    <NumberInput
                      min={0}
                      value={cd.fixedCost}
                      onChange={(val) => updateCd({ fixedCost: val })}
                      placeholder="Ej. 5000"
                      className="w-full h-10 px-4 rounded-xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                    />
                  </motion.div>
                )}

                {(cd.costType || 'fijo') === 'personalizado' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={cd.allowCustomCost ?? false}
                        onChange={(e) => updateCd({ allowCustomCost: e.target.checked })}
                      />
                      <div className="w-9 h-5 bg-app/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner" />
                    </label>
                    <span className="text-xs text-muted">Permitir editar el costo desde cada pedido</span>
                  </motion.div>
                )}
              </div>

              {/* ── Tiempo estimado ─ */}
              <div>
                <label className="block text-xs font-semibold text-muted mb-1 flex items-center gap-1">
                  <Clock size={11} /> Tiempo Estimado de Entrega
                </label>
                <input
                  type="text"
                  value={cd.estimatedTime || ''}
                  onChange={(e) => updateCd({ estimatedTime: e.target.value })}
                  placeholder="Ej. 20 a 40 min"
                  className="w-full h-10 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* ── Plantilla de mensaje ─ */}
              <div className="rounded-xl border border-app overflow-hidden">
                <button
                  onClick={() => setShowTemplate(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-surface text-xs font-bold text-muted hover:bg-surface-2 transition-colors"
                >
                  <span className="flex items-center gap-1.5"><MessageSquare size={12} /> Plantilla de Mensaje al Mensajero</span>
                  {showTemplate ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <AnimatePresence>
                  {showTemplate && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 space-y-2 bg-surface-2/40">
                        <div className="flex items-start gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                          <Info size={11} className="shrink-0 mt-0.5" />
                          <span>Variables disponibles: <code className="font-mono">{'{pedido}'}</code>, <code className="font-mono">{'{cliente}'}</code>, <code className="font-mono">{'{direccion}'}</code>, <code className="font-mono">{'{telefono}'}</code>, <code className="font-mono">{'{total}'}</code>, <code className="font-mono">{'{metodo_pago}'}</code>, <code className="font-mono">{'{notas}'}</code></span>
                        </div>
                        <textarea
                          value={cd.messengerTemplate || ''}
                          onChange={(e) => updateCd({ messengerTemplate: e.target.value })}
                          placeholder={DEFAULT_MESSENGER_TEMPLATE}
                          rows={8}
                          className="w-full px-3 py-2 rounded-xl bg-surface border border-app text-xs text-app font-mono focus:outline-none focus:border-primary transition-colors resize-none"
                        />
                        <button
                          onClick={() => updateCd({ messengerTemplate: '' })}
                          className="text-xs text-muted hover:text-rose-400 transition-colors flex items-center gap-1"
                        >
                          <RefreshCw size={11} /> Restaurar plantilla por defecto
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Mensajeros externos ─ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted uppercase tracking-wide flex items-center gap-1.5">
                    <User size={12} /> Mensajeros Externos
                  </p>
                  <button
                    onClick={() => { setEditTarget(null); setShowModal(true) }}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
                  >
                    <Plus size={13} /> Agregar
                  </button>
                </div>

                {loadingList ? (
                  <div className="text-xs text-muted text-center py-3">Cargando...</div>
                ) : messengers.length === 0 ? (
                  <div className="text-xs text-muted text-center py-4 border border-dashed border-app rounded-xl">
                    No hay mensajeros externos configurados
                  </div>
                ) : (
                  <AnimatePresence>
                    {messengers.map((m) => (
                      <MessengerRow
                        key={m.id}
                        messenger={m}
                        onStatusChange={handleStatusChange}
                        onEdit={handleEdit}
                        onDelete={(id) => setDeleteConfirm(id)}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* ── Confirmación de eliminación ─ */}
              <AnimatePresence>
                {deleteConfirm && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                  >
                    <div className="bg-surface border border-app rounded-2xl p-5 w-full max-w-xs text-center space-y-4">
                      <Trash2 size={28} className="mx-auto text-rose-400" />
                      <p className="text-sm font-semibold text-app">¿Eliminar este mensajero?</p>
                      <p className="text-xs text-muted">Esta acción no se puede deshacer.</p>
                      <div className="flex gap-3">
                        <button onClick={() => setDeleteConfirm(null)} className="flex-1 h-9 rounded-xl border border-app text-xs text-muted hover:bg-app/10 transition-colors">
                          Cancelar
                        </button>
                        <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 h-9 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de agregar/editar mensajero */}
      <AnimatePresence>
        {showModal && (
          <MessengerFormModal
            initial={editTarget}
            onClose={() => { setShowModal(false); setEditTarget(null) }}
            onSave={handleSaveMessenger}
          />
        )}
      </AnimatePresence>
    </>
  )
}
