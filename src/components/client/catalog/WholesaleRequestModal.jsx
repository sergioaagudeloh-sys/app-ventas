import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, PackagePlus, Send } from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import { COLLECTIONS, WHOLESALE_STATES } from '../../../constants'
import useAuthStore from '../../../store/authStore'

export default function WholesaleRequestModal({ product, isOpen, onClose }) {
  const { user } = useAuthStore()
  const [cantidad, setCantidad] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cantidad || Number(cantidad) < 12) {
      alert('La cantidad mínima para venta al por mayor es de 12 unidades.')
      return
    }

    setIsSubmitting(true)
    try {
      await addDoc(collection(db, COLLECTIONS.WHOLESALE_ORDERS), {
        productoId: product.id,
        productoNombre: product.nombre,
        precioBase: product.precioBase,
        precioMayorista: product.precioMayorista || null,
        cantidad: Number(cantidad),
        observaciones: observaciones.trim(),
        clienteNombre: user?.nombre || 'Desconocido',
        clienteCelular: user?.celular || 'Desconocido',
        estado: WHOLESALE_STATES.PENDING,
        createdAt: serverTimestamp(),
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2500)
    } catch (error) {
      console.error('Error enviando solicitud:', error)
      alert('Ocurrió un error. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !product) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-surface rounded-3xl shadow-2xl p-6 border border-app overflow-hidden"
        >
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={32} />
              </div>
              <h2 className="text-xl font-bold text-app mb-2">¡Solicitud Enviada!</h2>
              <p className="text-muted text-sm">
                Hemos recibido tu solicitud para <strong>{product.nombre}</strong>. 
                El administrador la revisará y se comunicará contigo.
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <PackagePlus size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-app">Venta al por mayor</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-app"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-6 bg-surface-2 p-3 rounded-xl border border-app">
                <p className="text-sm font-semibold text-app line-clamp-1">{product.nombre}</p>
                {product.precioMayorista && (
                  <p className="text-xs text-primary font-bold mt-1">
                    Precio especial disponible
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app mb-1">
                    Cantidad deseada (Mín. 12) *
                  </label>
                  <input
                    type="number"
                    min="12"
                    required
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface border border-app text-app focus:outline-none focus:border-primary text-center font-bold text-lg"
                    placeholder="Ej: 50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-app mb-1">
                    Observaciones o requerimientos especiales
                  </label>
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-3 rounded-xl bg-surface border border-app text-app focus:outline-none focus:border-primary text-sm resize-none"
                    placeholder="Ej: Necesito tallas surtidas, priorizar color negro..."
                  />
                </div>

                <div className="bg-primary/5 p-3 rounded-xl mt-2">
                  <p className="text-xs text-primary leading-relaxed">
                    <strong>Nota:</strong> Esta solicitud es especial, no descontará inventario automáticamente y requiere validación manual por parte de la tienda.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-primary text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Enviar solicitud'
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
