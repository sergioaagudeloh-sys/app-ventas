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
                  className="relative p-5 rounded-2xl border border-app bg-surface-2 overflow-hidden flex flex-col gap-3 group shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* Círculos calados para simular ticket rasgable */}
                  <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 rounded-full bg-surface border border-app z-10 shrink-0" />
                  <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-surface border border-app z-10 shrink-0" />
                  
                  {/* Borde decorativo superior estilo dash / troquelado */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_bottom,_var(--color-primary)_4px,_transparent_5px)] bg-[size:12px_8px] opacity-80" />

                  {/* Borde decorativo lateral izquierdo de marca */}
                  <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-primary" />
                  
                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-primary/10 text-primary uppercase tracking-wider">
                        🎫 {isPercent ? 'Porcentaje' : 'Valor Fijo'} · {displayDiscount}
                      </span>
                      <h3 className="font-mono text-lg font-black text-app mt-2 uppercase select-all tracking-widest bg-surface px-3 py-1.5 rounded-xl border border-app border-dashed w-fit shadow-xs">
                        {coupon.codigo}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleCopy(coupon.codigo)}
                      className={`p-2 h-9 rounded-xl border transition-all active:scale-95 flex items-center gap-1 text-[11px] font-extrabold cursor-pointer shrink-0 ${
                        copiedCode === coupon.codigo
                          ? 'bg-success/15 border-success text-success'
                          : 'bg-surface border-app text-muted hover:text-app hover:border-primary/50'
                      }`}
                    >
                      {copiedCode === coupon.codigo ? (
                        <>
                          <Check size={13} className="shrink-0" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy size={13} className="shrink-0" /> Copiar
                        </>
                      )}
                    </button>
                  </div>

                  {/* Detalles del Cupón */}
                  <div className="grid grid-cols-2 gap-2.5 pt-3.5 border-t border-app border-dashed pl-2 text-xs text-muted">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ShoppingBag size={13} className="text-primary shrink-0" />
                      <span className="truncate">Compra Mín: {formatCurrency(coupon.minimoCompra || 0)}</span>
                    </div>
                    {coupon.fechaExpiracion && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Calendar size={13} className="text-primary shrink-0" />
                        <span className="truncate">Vence: {new Date(coupon.fechaExpiracion).toLocaleDateString()}</span>
                      </div>
                    )}
                    {coupon.metodosPago && coupon.metodosPago.length > 0 && (
                      <div className="flex items-center gap-1.5 col-span-2 mt-0.5">
                        <CreditCard size={13} className="text-primary shrink-0" />
                        <span className="truncate">Pagos: {coupon.metodosPago.map(m => m === 'efectivo' ? 'Efectivo' : m === 'transferencia' ? 'Transferencia' : 'Crédito').join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Botón para aplicar en próxima compra */}
                  <button
                    onClick={() => {
                      handleCopy(coupon.codigo)
                      alert(`¡Código "${coupon.codigo}" copiado con éxito! Puedes aplicarlo directamente ingresándolo en el checkout de tu pedido.`)
                      onClose()
                    }}
                    className="mt-2 w-full h-10 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl font-bold text-xs transition-all active:scale-[0.98] border border-primary/20 hover:border-primary cursor-pointer flex items-center justify-center gap-1.5 pl-2"
                  >
                    🚀 Aplicar en Próxima Compra
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ModalTemplate>
  )
}

