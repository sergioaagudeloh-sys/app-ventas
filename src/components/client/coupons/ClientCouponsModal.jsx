import { motion, AnimatePresence } from 'framer-motion'
import { X, Tag, Calendar, ShoppingBag, CreditCard, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useCoupons } from '../../../hooks/useCoupons'
import { formatCurrency } from '../../../utils/formatters'

export default function ClientCouponsModal({ isOpen, onClose }) {
  const { data: coupons = [], isLoading } = useCoupons()
  const [copiedCode, setCopiedCode] = useState(null)

  // Filtrar cupones activos y no expirados
  const now = new Date()
  const activeCoupons = coupons.filter(coupon => {
    if (!coupon.activo) return false
    if (coupon.fechaExpiracion) {
      const expirationDate = new Date(coupon.fechaExpiracion)
      if (expirationDate < now) return false
    }
    return true
  })

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] border border-app"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-app bg-surface shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tag size={16} className="text-primary" />
              </div>
              <h2 className="text-lg font-bold text-app">Cupones y Ofertas Flash</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-app transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted">Buscando las mejores ofertas...</p>
              </div>
            ) : activeCoupons.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-4 border border-app">
                  <Tag size={28} className="text-muted" />
                </div>
                <h3 className="text-base font-bold text-app mb-1">Sin promociones activas</h3>
                <p className="text-sm text-muted">Vuelve pronto para descubrir nuevos cupones y ofertas especiales.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">
                  Cupones Disponibles ({activeCoupons.length})
                </p>
                {activeCoupons.map((coupon) => {
                  const isPercent = coupon.tipoDescuento === 'porcentaje'
                  const displayDiscount = isPercent ? `${coupon.valorDescuento}%` : formatCurrency(coupon.valorDescuento)
                  
                  return (
                    <motion.div
                      key={coupon.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative p-5 rounded-2xl border border-app bg-surface-2 overflow-hidden flex flex-col gap-3 group"
                    >
                      {/* Borde decorativo de cupón */}
                      <div className="absolute top-0 bottom-0 left-0 w-2 bg-gradient-to-b from-primary to-primary-focus" />
                      
                      <div className="flex justify-between items-start pl-2">
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary uppercase">
                            Descuento de {displayDiscount}
                          </span>
                          <h3 className="font-mono text-base font-black text-app mt-2 uppercase select-all tracking-wider">
                            {coupon.codigo}
                          </h3>
                        </div>

                        <button
                          onClick={() => handleCopy(coupon.codigo)}
                          className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 text-xs font-semibold ${
                            copiedCode === coupon.codigo
                              ? 'bg-success/10 border-success text-success'
                              : 'bg-surface border-app text-muted hover:text-app'
                          }`}
                        >
                          {copiedCode === coupon.codigo ? (
                            <>
                              <Check size={14} /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy size={14} /> Copiar
                            </>
                          )}
                        </button>
                      </div>

                      {/* Detalles del Cupón */}
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-app pl-2 text-xs text-muted">
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag size={12} className="text-primary" />
                          <span>Mínimo: {formatCurrency(coupon.minimoCompra || 0)}</span>
                        </div>
                        {coupon.fechaExpiracion && (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-primary" />
                            <span>Vence: {new Date(coupon.fechaExpiracion).toLocaleDateString()}</span>
                          </div>
                        )}
                        {coupon.metodosPago && coupon.metodosPago.length > 0 && (
                          <div className="flex items-center gap-1.5 col-span-2 mt-1">
                            <CreditCard size={12} className="text-primary" />
                            <span>Solo para: {coupon.metodosPago.map(m => m === 'efectivo' ? 'Efectivo' : m === 'transferencia' ? 'Transferencia' : 'Crédito').join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
