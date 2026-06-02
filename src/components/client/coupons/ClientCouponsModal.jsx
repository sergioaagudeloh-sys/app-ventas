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
      title="Cupones disponibles"
      icon={Tag}
      maxWidth="max-w-sm"
    >
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted">Buscando ofertas...</p>
          </div>
        ) : activeCoupons.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-3 border border-app">
              <Tag size={22} className="text-muted" />
            </div>
            <h3 className="text-sm font-bold text-app mb-1">Sin promociones activas</h3>
            <p className="text-xs text-muted">Vuelve pronto para descubrir nuevos cupones.</p>
          </div>
        ) : (
          <>
            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider pb-1">
              {activeCoupons.length} cupón{activeCoupons.length !== 1 ? 'es' : ''} disponible{activeCoupons.length !== 1 ? 's' : ''}
            </p>
            {activeCoupons.map((coupon) => {
              const isPercent = coupon.tipoDescuento === 'porcentaje'
              const displayDiscount = isPercent ? `${coupon.valorDescuento}%` : formatCurrency(coupon.valorDescuento)
              const copied = copiedCode === coupon.codigo

              return (
                <div
                  key={coupon.id}
                  className="relative flex items-stretch rounded-xl border border-app bg-surface-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  {/* Columna izquierda: descuento */}
                  <div className="flex flex-col items-center justify-center bg-primary/10 border-r border-dashed border-primary/30 px-3 py-3 min-w-[72px] shrink-0 gap-0.5">
                    <span className="text-xl font-black text-primary leading-none">{displayDiscount}</span>
                    <span className="text-[9px] font-bold text-primary/70 uppercase tracking-wide">
                      {isPercent ? 'descuento' : 'de ahorro'}
                    </span>
                  </div>

                  {/* Círculos de ticket */}
                  <div className="absolute top-1/2 left-[68px] -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-surface border border-app/60 z-10" />

                  {/* Columna derecha: info + acciones */}
                  <div className="flex-1 flex flex-col justify-between px-3 py-2.5 gap-1.5 min-w-0">
                    {/* Código */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-black text-app uppercase tracking-widest truncate">
                        {coupon.codigo}
                      </span>
                      <button
                        onClick={() => handleCopy(coupon.codigo)}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
                          copied
                            ? 'bg-success/15 border-success text-success'
                            : 'bg-surface border-app text-muted hover:text-primary hover:border-primary/50'
                        }`}
                      >
                        {copied ? <><Check size={11} />Copiado</> : <><Copy size={11} />Copiar</>}
                      </button>
                    </div>

                    {/* Detalles */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted">
                      <span className="flex items-center gap-1">
                        <ShoppingBag size={10} className="text-primary shrink-0" />
                        Mín. {formatCurrency(coupon.minimoCompra || 0)}
                      </span>
                      {coupon.fechaExpiracion && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} className="text-primary shrink-0" />
                          Vence {new Date(coupon.fechaExpiracion).toLocaleDateString()}
                        </span>
                      )}
                      {coupon.metodosPago?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CreditCard size={10} className="text-primary shrink-0" />
                          {coupon.metodosPago.map(m => m === 'efectivo' ? 'Efectivo' : m === 'transferencia' ? 'Transf.' : 'Crédito').join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </ModalTemplate>
  )
}

