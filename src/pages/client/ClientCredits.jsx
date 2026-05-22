import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, History, DollarSign, CheckCircle } from 'lucide-react'
import { useClientCredits } from '../../hooks/useCredits'
import useAuthStore from '../../store/authStore'
import { formatCurrency } from '../../utils/formatters'
import { SUPPORT_WHATSAPP } from '../../constants'

export default function ClientCredits() {
  const { user } = useAuthStore()
  const { data: credits = [], isLoading } = useClientCredits(user?.celular)

  // Separar activos y pagados
  const activos = credits.filter(c => c.estado === 'activo')
  const pagados = credits.filter(c => c.estado === 'pagado')

  const totalDeuda = activos.reduce((sum, c) => sum + c.saldoPendiente, 0)

  const handleContactStore = () => {
    const text = `Hola, quiero consultar el estado de mis créditos/fiados. Mi número es ${user?.celular}.`
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="pb-6">
      <div className="bg-primary/5 pt-8 pb-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <CreditCard size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-app">Tus Créditos</h1>
              <p className="text-muted text-sm font-medium">Estado de cuenta</p>
            </div>
          </div>

          <div className="bg-surface rounded-3xl p-6 border border-app shadow-lg">
            <p className="text-sm font-semibold text-muted uppercase tracking-widest mb-2">Total Pendiente</p>
            <p className={`text-4xl font-black ${totalDeuda > 0 ? 'text-warning' : 'text-success'}`}>
              {formatCurrency(totalDeuda)}
            </p>
            {totalDeuda > 0 && (
              <button
                onClick={handleContactStore}
                className="mt-6 w-full sm:w-auto px-6 py-3 bg-surface-2 border border-app text-app rounded-xl font-bold transition-all active:scale-95 hover:border-primary/50"
              >
                Acordar Pago por WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 -mt-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted bg-surface rounded-3xl border border-app">Cargando tu estado de cuenta...</div>
        ) : credits.length === 0 ? (
          <div className="bg-surface rounded-3xl p-10 border border-app text-center shadow-sm">
            <CheckCircle size={48} className="text-success mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-app mb-2">Todo al día</h3>
            <p className="text-muted">No tienes créditos activos ni historial de deudas con nosotros.</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Créditos Activos */}
            {activos.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-app mb-4 ml-2">Créditos Activos</h3>
                <div className="grid gap-4">
                  {activos.map(credit => (
                    <CreditCardItem key={credit.id} credit={credit} />
                  ))}
                </div>
              </section>
            )}

            {/* Créditos Pagados */}
            {pagados.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-app mb-4 ml-2">Historial Pagado</h3>
                <div className="grid gap-4 opacity-80">
                  {pagados.map(credit => (
                    <CreditCardItem key={credit.id} credit={credit} isPaid />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

function CreditCardItem({ credit, isPaid }) {
  return (
    <div className="bg-surface rounded-3xl p-5 sm:p-6 border border-app shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-app text-lg">#{credit.orderNumber}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
              isPaid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            }`}>
              {isPaid ? 'PAGADO' : 'ACTIVO'}
            </span>
          </div>
          <p className="text-sm text-muted font-medium">
            Monto Original: {formatCurrency(credit.montoTotal)}
          </p>
        </div>

        {!isPaid && (
          <div className="text-left sm:text-right bg-warning/5 p-3 rounded-2xl border border-warning/20">
            <p className="text-xs font-semibold text-warning uppercase tracking-wider mb-0.5">Saldo Pendiente</p>
            <p className="text-2xl font-black text-warning leading-none">{formatCurrency(credit.saldoPendiente)}</p>
          </div>
        )}
      </div>

      <div className="border-t border-app pt-4">
        <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <History size={14} /> Historial de Pagos
        </h4>
        
        {(!credit.abonos || credit.abonos.length === 0) ? (
          <p className="text-sm text-muted italic ml-5">No se han registrado abonos aún.</p>
        ) : (
          <div className="space-y-3">
            {credit.abonos.map((abono, idx) => (
              <div key={idx} className="flex justify-between items-center bg-surface-2 p-3 rounded-xl border border-app/50 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-success/50" />
                <div className="pl-3">
                  <p className="text-sm font-bold text-app">
                    Abono de <span className="text-success">{formatCurrency(abono.monto)}</span>
                  </p>
                  {abono.nota && <p className="text-xs text-muted mt-0.5">{abono.nota}</p>}
                </div>
                <p className="text-xs font-medium text-muted">
                  {new Date(abono.fecha).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
