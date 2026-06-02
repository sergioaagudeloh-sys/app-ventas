import { Tag, Calendar, ShoppingBag, CreditCard, Copy, Check } from 'lucide-react'
import useCopyToClipboard from '../../../hooks/useCopyToClipboard'
import { useCoupons } from '../../../hooks/useCoupons'
import { formatCurrency } from '../../../utils/formatters'
import ModalTemplate from '../../common/ModalTemplate'

const shimmerStyle = `
  @keyframes coupon-shine {
    0%   { transform: translateX(-100%) skewX(-20deg); }
    100% { transform: translateX(250%)  skewX(-20deg); }
  }
  .coupon-card-shine::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255,255,255,0.18) 45%,
      rgba(255,255,255,0.32) 50%,
      rgba(255,255,255,0.18) 55%,
      transparent 100%
    );
    transform: translateX(-100%) skewX(-20deg);
    animation: coupon-shine 3.5s ease-in-out infinite;
    pointer-events: none;
  }
  .coupon-card-shine:hover::after {
    animation-duration: 1.2s;
  }
`

export default function ClientCouponsModal({ isOpen, onClose }) {
  const { data: coupons = [], isLoading } = useCoupons()
  const [isCopied, handleCopy, copiedCode] = useCopyToClipboard()

  const now = new Date()
  const activeCoupons = coupons.filter(coupon => {
    if (!coupon.activo) return false
    if (coupon.fechaExpiracion) {
      if (new Date(coupon.fechaExpiracion) < now) return false
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
      <style>{shimmerStyle}</style>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted">Buscando ofertas...</p>
          </div>
        ) : activeCoupons.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-3">
              <Tag size={22} className="text-muted" />
            </div>
            <h3 className="text-sm font-bold text-app mb-1">Sin promociones activas</h3>
            <p className="text-xs text-muted">Vuelve pronto para descubrir nuevos cupones.</p>
          </div>
        ) : (
          <>
            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider pb-0.5">
              {activeCoupons.length} cupón{activeCoupons.length !== 1 ? 'es' : ''} disponible{activeCoupons.length !== 1 ? 's' : ''}
            </p>

            {activeCoupons.map((coupon, index) => {
              const isPercent = coupon.tipoDescuento === 'porcentaje'
              const displayDiscount = isPercent ? `${coupon.valorDescuento}%` : formatCurrency(coupon.valorDescuento)
              const copied = copiedCode === coupon.codigo

              // Paletas de gradiente rotativas para variedad visual
              const gradients = [
                'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #6d28d9 100%)',
                'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #0284c7 100%)',
                'linear-gradient(135deg, #059669 0%, #34d399 50%, #047857 100%)',
                'linear-gradient(135deg, #dc2626 0%, #f87171 50%, #b91c1c 100%)',
              ]
              const gradient = gradients[index % gradients.length]

              return (
                <div
                  key={coupon.id}
                  className="coupon-card-shine relative flex items-stretch rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                  style={{ background: gradient }}
                >
                  {/* Capa de glassmorphism superior */}
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 60%)',
                    }}
                  />

                  {/* Columna izquierda: descuento */}
                  <div className="relative flex flex-col items-center justify-center px-4 py-4 min-w-[80px] shrink-0 gap-0.5">
                    <span
                      className="font-black leading-none text-white"
                      style={{ fontSize: isPercent ? '1.6rem' : '1.1rem', textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
                    >
                      {displayDiscount}
                    </span>
                    <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest mt-0.5">
                      {isPercent ? 'descuento' : 'de ahorro'}
                    </span>
                  </div>

                  {/* Separador vertical con muescas arriba y abajo */}
                  <div className="relative flex flex-col items-center justify-center shrink-0">
                    <div
                      className="absolute -top-2 w-4 h-4 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.18)' }}
                    />
                    <div
                      className="w-px h-full"
                      style={{
                        background: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 5px, transparent 5px, transparent 10px)',
                      }}
                    />
                    <div
                      className="absolute -bottom-2 w-4 h-4 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.18)' }}
                    />
                  </div>

                  {/* Columna derecha: info */}
                  <div className="relative flex-1 flex flex-col justify-center px-3.5 py-3.5 gap-2 min-w-0">
                    {/* Código + botón */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-mono font-black text-white uppercase tracking-widest truncate"
                        style={{ fontSize: '0.82rem', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
                      >
                        {coupon.codigo}
                      </span>
                      <button
                        onClick={() => handleCopy(coupon.codigo)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                        style={{
                          background: copied ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.18)',
                          backdropFilter: 'blur(8px)',
                          color: copied ? '#6ee7b7' : 'white',
                          border: copied ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(255,255,255,0.3)',
                        }}
                      >
                        {copied ? <><Check size={11} />Copiado</> : <><Copy size={11} />Copiar</>}
                      </button>
                    </div>

                    {/* Detalles */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-white/70 font-medium">
                        <ShoppingBag size={10} className="shrink-0" />
                        Mín. {formatCurrency(coupon.minimoCompra || 0)}
                      </span>
                      {coupon.fechaExpiracion && (
                        <span className="flex items-center gap-1 text-[10px] text-white/70 font-medium">
                          <Calendar size={10} className="shrink-0" />
                          Vence {new Date(coupon.fechaExpiracion).toLocaleDateString()}
                        </span>
                      )}
                      {coupon.metodosPago?.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-white/70 font-medium">
                          <CreditCard size={10} className="shrink-0" />
                          {coupon.metodosPago.map(m =>
                            m === 'efectivo' ? 'Efectivo' : m === 'transferencia' ? 'Transf.' : 'Crédito'
                          ).join(', ')}
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
