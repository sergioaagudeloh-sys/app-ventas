import { Tag, Calendar, ShoppingBag, CreditCard, Copy, Check } from 'lucide-react'
import useCopyToClipboard from '../../../hooks/useCopyToClipboard'
import { useCoupons } from '../../../hooks/useCoupons'
import { formatCurrency } from '../../../utils/formatters'
import ModalTemplate from '../../common/ModalTemplate'

export default function ClientCouponsModal({ isOpen, onClose }) {
  const { data: coupons = [], isLoading } = useCoupons()
  const [isCopied, handleCopy, copiedCode] = useCopyToClipboard()

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

  return (
    <ModalTemplate
      isOpen={isOpen}
      onClose={onClose}
      title="Cupones y Ofertas Flash"
      icon={Tag}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
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
                <div
                  key={coupon.id}
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
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ModalTemplate>
  )
}

