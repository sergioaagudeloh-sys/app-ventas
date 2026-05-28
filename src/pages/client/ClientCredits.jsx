import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, History, DollarSign, CheckCircle, ChevronDown } from 'lucide-react'
import { useClientCredits } from '../../hooks/useCredits'
import useAuthStore from '../../store/authStore'
import useAppConfigStore from '../../store/appConfigStore'
import { formatCurrency } from '../../utils/formatters'
import { SUPPORT_WHATSAPP } from '../../constants'

import { createCreditNotification } from '../../services/creditService'

export default function ClientCredits() {
  const { user } = useAuthStore()
  const { whatsappAdmin } = useAppConfigStore()
  const { data: credits = [], isLoading } = useClientCredits(user?.celular)

  const [selectedCredit, setSelectedCredit] = useState(null)
  const [abonoMonto, setAbonoMonto] = useState('')
  const [abonoError, setAbonoError] = useState('')
  
  // Rastrear IDs de créditos archivados en localStorage
  const storageKey = user ? `pwa-client-archived-credits-${user.celular}` : 'pwa-client-archived-credits-guest'
  const [archivedIds, setArchivedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [showArchived, setShowArchived] = useState(false)

  const handleArchiveToggle = (creditId) => {
    const nextArchived = archivedIds.includes(creditId)
      ? archivedIds.filter(id => id !== creditId)
      : [...archivedIds, creditId]
    setArchivedIds(nextArchived)
    localStorage.setItem(storageKey, JSON.stringify(nextArchived))
  }

  // Separar activos, pagados y archivados
  const activos = credits.filter(c => c.estado === 'activo')
  
  // Créditos pagados visibles (no archivados)
  const pagadosNoArchivados = credits.filter(c => c.estado === 'pagado' && !archivedIds.includes(c.id))
  
  // Créditos pagados archivados limitados a los 5 más recientes para el cliente
  const pagadosArchivados = credits
    .filter(c => c.estado === 'pagado' && archivedIds.includes(c.id))
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
      return dateB - dateA
    })
    .slice(0, 5)

  const pagadosAMostrar = showArchived ? pagadosArchivados : pagadosNoArchivados

  const totalDeuda = activos.reduce((sum, c) => sum + c.saldoPendiente, 0)

  const handleSendPagoTotalWhatsApp = async (credit) => {
    const cleanPhone = whatsappAdmin?.replace(/\D/g, '') || SUPPORT_WHATSAPP?.replace(/\D/g, '') || ''
    const mensaje = `Hola, deseo realizar el pago total de mi crédito correspondiente al pedido *#${credit.orderNumber}* por un valor de *${formatCurrency(credit.saldoPendiente)}*. Mi número de celular es ${user?.celular}.`
    
    await createCreditNotification({
      type: 'pago_total',
      clienteNombre: user?.nombre || 'Cliente',
      clienteCelular: user?.celular || '',
      monto: credit.saldoPendiente,
      orderNumber: credit.orderNumber
    })

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const handleOpenAbonar = (credit) => {
    setSelectedCredit(credit)
    setAbonoMonto('')
    setAbonoError('')
  }

  const handleSendAbonoWhatsApp = async (e) => {
    e.preventDefault()
    const monto = Number(abonoMonto)
    
    if (!abonoMonto || isNaN(monto) || monto <= 0) {
      setAbonoError('Ingresa un monto válido mayor a 0')
      return
    }

    if (monto > selectedCredit.saldoPendiente) {
      setAbonoError('El monto no puede superar el saldo pendiente')
      return
    }

    const cleanPhone = whatsappAdmin?.replace(/\D/g, '') || SUPPORT_WHATSAPP?.replace(/\D/g, '') || ''
    const mensaje = `Hola, deseo registrar un abono de *${formatCurrency(monto)}* a mi crédito activo correspondiente al pedido *#${selectedCredit.orderNumber}* (el cual tiene un saldo pendiente de ${formatCurrency(selectedCredit.saldoPendiente)}). Mi número de celular es ${user?.celular}.`
    
    await createCreditNotification({
      type: 'abono',
      clienteNombre: user?.nombre || 'Cliente',
      clienteCelular: user?.celular || '',
      monto: monto,
      orderNumber: selectedCredit.orderNumber
    })

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank')
    setSelectedCredit(null)
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

          <div className="bg-surface rounded-3xl p-6 border border-app shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-muted uppercase tracking-widest mb-2">Total Pendiente</p>
              <p className={`text-4xl font-black ${totalDeuda > 0 ? 'text-warning' : 'text-success'}`}>
                {formatCurrency(totalDeuda)}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {pagadosNoArchivados.length > 0 && (
                <button
                  onClick={() => {
                    const idsToArchive = pagadosNoArchivados.map(c => c.id)
                    const nextArchived = [...new Set([...archivedIds, ...idsToArchive])]
                    setArchivedIds(nextArchived)
                    localStorage.setItem(storageKey, JSON.stringify(nextArchived))
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-primary text-white rounded-xl font-bold transition-all active:scale-95 hover:opacity-90 text-sm shadow-md shadow-primary/20 flex items-center justify-center gap-1.5"
                >
                  Archivar Completados
                </button>
              )}
            </div>
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
                    <CreditCardItem 
                      key={credit.id} 
                      credit={credit} 
                      onAbonar={handleOpenAbonar} 
                      onPagoTotal={handleSendPagoTotalWhatsApp} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Créditos Pagados */}
            {(pagadosNoArchivados.length > 0 || pagadosArchivados.length > 0) && (
              <section>
                <div className="flex items-center justify-between mb-4 ml-2 mr-2">
                  <h3 className="text-lg font-bold text-app">
                    {showArchived ? 'Historial Archivada' : 'Historial Pagado'}
                  </h3>
                  
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-surface-2 border border-app text-muted hover:text-app transition-colors active:scale-95"
                  >
                    {showArchived 
                      ? `Ver Pagados (${pagadosNoArchivados.length})` 
                      : `Ver Archivados (${pagadosArchivados.length})`
                    }
                  </button>
                </div>

                <div className="grid gap-4 opacity-90">
                  {pagadosAMostrar.length > 0 ? (
                    pagadosAMostrar.map(credit => (
                      <CreditCardItem 
                        key={credit.id} 
                        credit={credit} 
                        isPaid 
                        isArchived={archivedIds.includes(credit.id)}
                        onArchive={handleArchiveToggle}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-muted bg-surface rounded-3xl border border-app border-dashed">
                      No hay créditos en esta lista.
                    </div>
                  )}
                </div>
              </section>
            )}

          </div>
        )}
      </div>

      {/* MODAL PARA AGREGAR ABONO CLIENTE */}
      <AnimatePresence>
        {selectedCredit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCredit(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-surface rounded-3xl shadow-2xl p-6 border border-app z-10"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-soft flex items-center justify-center mb-4 border border-primary-soft">
                <DollarSign size={24} className="text-primary" />
              </div>
              
              <h2 className="text-xl font-black text-app mb-1">Registrar Abono</h2>
              <p className="text-sm text-muted mb-6">
                Ingresa el monto que deseas abonar para el pedido <span className="font-mono font-bold text-app">#{selectedCredit.orderNumber}</span>.
              </p>
 
              <form onSubmit={handleSendAbonoWhatsApp} className="space-y-4">
                <div className="bg-warning-soft border border-warning-soft rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-xs font-bold text-warning uppercase tracking-wider">Saldo Pendiente:</span>
                  <span className="text-xl font-black text-warning">
                    {formatCurrency(selectedCredit.saldoPendiente)}
                  </span>
                </div>
 
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Monto a abonar *</label>
                  <input
                    type="number"
                    value={abonoMonto}
                    onChange={(e) => {
                      setAbonoMonto(e.target.value)
                      setAbonoError('')
                    }}
                    className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-primary-soft text-app focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-lg font-bold"
                    placeholder="Ej: 50000"
                    autoFocus
                  />
                  {abonoError && <p className="text-xs text-red-500 font-semibold mt-1">{abonoError}</p>}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedCredit(null)}
                    className="flex-1 h-12 bg-surface-2 text-app border border-app rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!abonoMonto}
                    className="flex-1 h-12 bg-primary text-white rounded-xl font-bold shadow-md hover:opacity-90 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Abonar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CreditCardItem({ credit, isPaid, onAbonar, onPagoTotal, onArchive, isArchived }) {
  const [showPayments, setShowPayments] = useState(false)

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

        {!isPaid ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="bg-warning-soft px-4 py-2.5 rounded-2xl border border-warning-soft flex flex-col justify-center items-center text-center min-w-[120px]">
              <p className="text-[10px] font-bold text-warning uppercase tracking-wider mb-1 leading-none">Saldo Pendiente</p>
              <p className="text-xl font-black text-warning leading-none">{formatCurrency(credit.saldoPendiente)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-[180px]">
              {onAbonar && (
                <button
                  onClick={() => onAbonar(credit)}
                  className="h-11 bg-surface-2 border border-app text-app rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                >
                  Abono
                </button>
              )}
              {onPagoTotal && (
                <button
                  onClick={() => onPagoTotal(credit)}
                  className="h-11 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                >
                  Pago Total
                </button>
              )}
            </div>
          </div>
        ) : (
          isArchived && onArchive && (
            <button
              onClick={() => onArchive(credit.id)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-2 border border-app text-muted hover:text-app hover:border-primary/30 transition-all active:scale-95 flex items-center gap-1.5 self-end sm:self-auto"
            >
              Desarchivar
            </button>
          )
        )}
      </div>

      <div className="border-t border-app pt-4">
        {/* Encabezado colapsable */}
        <button 
          onClick={() => setShowPayments(!showPayments)}
          className="w-full flex items-center justify-between text-xs font-bold text-muted uppercase tracking-wider mb-1 hover:text-app transition-colors active:scale-[0.99] select-none"
        >
          <span className="flex items-center gap-1.5">
            <History size={14} /> Historial de Pagos
          </span>
          <ChevronDown 
            size={16} 
            className={`transform transition-transform duration-250 ${showPayments ? 'rotate-180 text-primary' : 'text-muted'}`} 
          />
        </button>
        
        <AnimatePresence initial={false}>
          {showPayments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-3"
            >
              {(!credit.abonos || credit.abonos.length === 0) ? (
                <p className="text-sm text-muted italic ml-5 pt-1">No se han registrado abonos aún.</p>
              ) : (
                <div className="space-y-3 pt-1 pb-1">
                  {credit.abonos.map((abono, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-surface-2 p-3 rounded-xl border border-app relative overflow-hidden">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
