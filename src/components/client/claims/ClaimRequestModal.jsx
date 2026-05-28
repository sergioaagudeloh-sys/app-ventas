import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldAlert, AlertTriangle, ArrowRight, CheckCircle2, MessageSquare, Package } from 'lucide-react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import { COLLECTIONS } from '../../../constants'

export default function ClaimRequestModal({ isOpen, onClose, order, onSuccess }) {
  const [selectedItems, setSelectedItems] = useState(
    order.items.map(item => ({ ...item, claimQty: 0 }))
  )
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const handleQtyChange = (productId, variantId, qty) => {
    setSelectedItems(prev =>
      prev.map(item => {
        if (item.productId === productId && item.variantId === variantId) {
          return { ...item, claimQty: Math.max(0, Math.min(item.cantidad, qty)) }
        }
        return item
      })
    )
  }

  const handleCheckItem = (productId, variantId) => {
    setSelectedItems(prev =>
      prev.map(item => {
        if (item.productId === productId && item.variantId === variantId) {
          const newQty = item.claimQty > 0 ? 0 : item.cantidad
          return { ...item, claimQty: newQty }
        }
        return item
      })
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const itemsToClaim = selectedItems.filter(item => item.claimQty > 0)
    if (itemsToClaim.length === 0) {
      setError('Por favor selecciona al menos un producto para reclamar.')
      return
    }

    if (!reason) {
      setError('Por favor selecciona el motivo de tu solicitud.')
      return
    }

    if (!description.trim()) {
      setError('Por favor describe brevemente el motivo del reclamo.')
      return
    }

    setLoading(true)
    try {
      const claimPayload = {
        orderId: order.id,
        orderNumber: order.orderNumber || order.id,
        clientId: order.cliente?.celular || '',
        clientName: order.cliente?.nombre || 'Cliente General',
        clientPhone: order.cliente?.celular || '',
        products: itemsToClaim.map(item => ({
          productId: item.productId,
          variantId: item.variantId || '',
          name: item.nombre,
          color: item.color || '',
          talla: item.talla || '',
          quantity: item.claimQty,
          price: item.precio
        })),
        reason,
        description: description.trim(),
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminNotes: ''
      }

      await addDoc(collection(db, COLLECTIONS.CLAIMS || 'claims'), claimPayload)
      setSubmitted(true)
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Error al enviar el reclamo:', err)
      setError('Hubo un problema al enviar tu reclamo. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Background Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-lg bg-surface border border-app rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 border-b border-app flex items-center justify-between bg-surface-2/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldAlert className="text-primary" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-app text-sm">Garantías y Reclamos</h3>
                  <p className="text-[11px] text-muted">Pedido {order.orderNumber || order.id}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-app transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 className="font-bold text-app text-base">¡Solicitud Enviada!</h4>
                  <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
                    Tu reclamo ha sido registrado con éxito. El administrador revisará tu caso y se pondrá en contacto contigo pronto.
                  </p>
                  <button
                    onClick={onClose}
                    className="h-11 px-6 bg-primary text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    Entendido <ArrowRight size={14} />
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Error Alert */}
                  {error && (
                    <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex gap-2.5 items-start">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{error}</p>
                    </div>
                  )}

                  {/* Step 1: Select Items */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-app uppercase tracking-wider">
                      1. Selecciona los productos a reclamar
                    </label>
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {selectedItems.map((item, idx) => {
                        const isChecked = item.claimQty > 0
                        return (
                          <div
                            key={`${item.productId}-${item.variantId}-${idx}`}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isChecked
                                ? 'bg-primary/[0.03] border-primary/30'
                                : 'bg-surface-2/40 border-app hover:bg-surface-2/70'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleCheckItem(item.productId, item.variantId)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                  isChecked
                                    ? 'bg-primary border-primary text-white'
                                    : 'border-app bg-surface'
                                }`}
                              >
                                {isChecked && <span className="text-[10px] font-bold">✓</span>}
                              </button>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-app truncate">{item.nombre}</p>
                                <p className="text-[10px] text-muted">
                                  {item.color && `Color: ${item.color}`} {item.talla && `| Talla: ${item.talla}`}
                                </p>
                              </div>
                            </div>

                            {/* Qty Selector */}
                            {isChecked && (
                              <div className="flex items-center gap-2 bg-surface border border-app rounded-xl p-1">
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(item.productId, item.variantId, item.claimQty - 1)}
                                  className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-xs font-bold text-app"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center text-xs font-bold text-app">{item.claimQty}</span>
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(item.productId, item.variantId, item.claimQty + 1)}
                                  className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-xs font-bold text-app"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Step 2: Reason */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-app uppercase tracking-wider">
                      2. Motivo del reclamo
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'defectuoso', label: 'Producto Defectuoso / Roto' },
                        { id: 'no_esperado', label: 'No era lo que esperaba' },
                        { id: 'talla_incorrecta', label: 'Talla o Color incorrecto' },
                        { id: 'otro', label: 'Otro motivo' }
                      ].map(opt => {
                        const isSelected = reason === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setReason(opt.id)}
                            className={`p-3 rounded-xl border text-xs text-left font-semibold transition-all ${
                              isSelected
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-surface-2/40 border-app text-app hover:bg-surface-2/80'
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Step 3: Description */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-app uppercase tracking-wider">
                      3. Describe el problema
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Explica detalladamente qué sucedió con el producto..."
                      className="w-full p-4.5 rounded-2xl bg-surface-2 border border-app text-xs text-app focus:outline-none focus:border-primary transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:scale-100"
                  >
                    {loading ? 'Enviando solicitud...' : 'Enviar Solicitud de Reclamo'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
