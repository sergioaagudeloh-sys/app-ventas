import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Search, DollarSign, History, CheckCircle, ChevronDown, Plus } from 'lucide-react'
import { useCredits, useAddPayment } from '../../hooks/useCredits'
import { paymentSchema } from '../../schemas/creditSchemas'
import { formatCurrency } from '../../utils/formatters'

export default function AdminCredits() {
  const [activeTab, setActiveTab] = useState('activo') // activo | pagado
  const { data: credits = [], isLoading } = useCredits(activeTab)
  const { mutate: addPayment, isPending } = useAddPayment()

  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  
  // Modal de abono
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState(null)
  const [paymentMonto, setPaymentMonto] = useState('')
  const [paymentNota, setPaymentNota] = useState('')
  const [paymentError, setPaymentError] = useState('')

  const filteredCredits = credits.filter(c => 
    c.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.clienteCelular?.includes(searchTerm)
  )

  const openPaymentModal = (credit, e) => {
    e.stopPropagation()
    setSelectedCredit(credit)
    setPaymentMonto('')
    setPaymentNota('')
    setPaymentError('')
    setIsPaymentModalOpen(true)
  }

  const handleAddPayment = (e) => {
    e.preventDefault()
    
    const dataToValidate = {
      monto: Number(paymentMonto),
      nota: paymentNota.trim(),
    }

    const result = paymentSchema.safeParse(dataToValidate)
    if (!result.success) {
      setPaymentError(result.error.issues[0].message)
      return
    }

    if (dataToValidate.monto > selectedCredit.saldoPendiente) {
      setPaymentError('El abono no puede ser mayor al saldo pendiente')
      return
    }

    addPayment({ id: selectedCredit.id, paymentData: dataToValidate }, {
      onSuccess: () => {
        setIsPaymentModalOpen(false)
        setSelectedCredit(null)
      }
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-6xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
          <CreditCard size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-app">Créditos y Fiados</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        {/* Buscador */}
        <div className="relative max-w-md flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar cliente o #pedido..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 gap-1 bg-surface-2 rounded-2xl sm:w-64">
          <button
            onClick={() => setActiveTab('activo')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'activo' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-app'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setActiveTab('pagado')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'pagado' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-app'
            }`}
          >
            Pagados
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted">Cargando créditos...</div>
      ) : filteredCredits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-surface rounded-3xl border border-app">
          <CreditCard size={48} className="text-muted mb-4 opacity-30" />
          <h3 className="text-lg font-bold text-app mb-1">No hay créditos {activeTab}s</h3>
          <p className="text-muted text-sm">
            {activeTab === 'activo' ? 'Todos tus clientes están al día.' : 'Aún no hay créditos pagados en su totalidad.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {filteredCredits.map(credit => {
              const isExpanded = expandedId === credit.id
              const isPaid = credit.estado === 'pagado'

              return (
                <motion.div
                  key={credit.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surface rounded-3xl border border-app shadow-sm overflow-hidden"
                >
                  {/* Tarjeta Resumen */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : credit.id)}
                    className="p-4 sm:p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between cursor-pointer hover:bg-surface-2/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                        isPaid ? 'bg-success/10 border-success/30 text-success' : 'bg-warning/10 border-warning/30 text-warning'
                      }`}>
                        {isPaid ? <CheckCircle size={24} /> : <DollarSign size={24} />}
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-app text-lg leading-tight">
                          {credit.clienteNombre}
                        </h3>
                        <p className="text-sm text-muted font-medium">
                          Cel: {credit.clienteCelular} • Ref: {credit.orderNumber}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 border-t border-app md:border-0 pt-4 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-xs text-muted mb-0.5">Monto Original: {formatCurrency(credit.montoTotal)}</p>
                        {isPaid ? (
                          <p className="font-black text-success text-xl">PAGADO</p>
                        ) : (
                          <p className="font-black text-warning text-xl">
                            Debe {formatCurrency(credit.saldoPendiente)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {!isPaid && (
                          <button
                            onClick={(e) => openPaymentModal(credit, e)}
                            className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors"
                            title="Añadir Abono"
                          >
                            <Plus size={20} />
                          </button>
                        )}
                        <ChevronDown size={20} className={`text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Historial Expandido */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-app bg-surface-2/30"
                      >
                        <div className="p-6">
                          <h4 className="text-sm font-bold text-app mb-4 flex items-center gap-2">
                            <History size={16} className="text-primary" /> Historial de Abonos
                          </h4>
                          
                          {(!credit.abonos || credit.abonos.length === 0) ? (
                            <p className="text-sm text-muted italic">Aún no se han registrado abonos a esta deuda.</p>
                          ) : (
                            <div className="space-y-3">
                              {credit.abonos.map((abono, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-surface p-3 rounded-xl border border-app/50">
                                  <div>
                                    <p className="text-sm font-bold text-success">+{formatCurrency(abono.monto)}</p>
                                    {abono.nota && <p className="text-xs text-muted mt-0.5">Nota: {abono.nota}</p>}
                                  </div>
                                  <p className="text-xs text-muted">
                                    {new Date(abono.fecha).toLocaleDateString()} {new Date(abono.fecha).toLocaleTimeString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* MODAL PARA AGREGAR ABONO */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedCredit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-surface rounded-3xl shadow-2xl p-6 border border-app"
            >
              <h2 className="text-xl font-bold text-app mb-1">Registrar Abono</h2>
              <p className="text-sm text-muted mb-6">
                Cliente: <span className="font-bold text-app">{selectedCredit.clienteNombre}</span>
              </p>

              <form onSubmit={handleAddPayment} className="space-y-4">
                <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex justify-between items-center">
                  <span className="text-sm font-semibold text-warning">Saldo Actual:</span>
                  <span className="text-xl font-black text-warning">
                    {formatCurrency(selectedCredit.saldoPendiente)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app mb-1">Monto a abonar *</label>
                  <input
                    type="number"
                    value={paymentMonto}
                    onChange={(e) => setPaymentMonto(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary text-lg font-bold"
                    placeholder="Ej: 50000"
                  />
                  {paymentError && <p className="text-xs text-error mt-1">{paymentError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-app mb-1">Nota (Opcional)</label>
                  <input
                    type="text"
                    value={paymentNota}
                    onChange={(e) => setPaymentNota(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary text-sm"
                    placeholder="Ej: Pago en efectivo en el local"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 h-12 bg-surface-2 text-app rounded-xl font-bold transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !paymentMonto}
                    className="flex-1 h-12 bg-primary text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                  >
                    {isPending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Guardar Abono'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
