import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Receipt, X, LogOut, CheckCircle2, Loader2 } from 'lucide-react'
import useAppConfigStore from '../../../store/appConfigStore'
import { requestService, requestTableBill } from '../../../services/tableService'

export default function TableMenuBar() {
  const { activeTable, setActiveTable } = useAppConfigStore()
  const [loading, setLoading] = useState(null) // 'llamado' | 'cuenta'
  const [success, setSuccess] = useState(null)  // 'llamado' | 'cuenta'

  if (!activeTable) return null

  const handleCallWaiter = async () => {
    setLoading('llamado')
    try {
      await requestService(activeTable.id, activeTable.nombre, 'llamado')
      setSuccess('llamado')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  const handleRequestBill = async () => {
    setLoading('cuenta')
    try {
      await requestTableBill(activeTable.id, activeTable.nombre)
      setSuccess('cuenta')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  const handleExitTable = () => {
    if (window.confirm('¿Deseas desvincularte de esta mesa? No podrás realizar pedidos autoservicio.')) {
      setActiveTable(null)
      sessionStorage.removeItem('activeTable')
      // Limpiar el parámetro de la URL
      const url = new URL(window.location.href)
      url.searchParams.delete('tableId')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[min(480px,calc(100vw-32px))]">
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-surface border border-app rounded-3xl p-4 shadow-2xl flex flex-col gap-3 relative"
        style={{
          boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(8px)',
          background: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
        }}
      >
        {/* Cabecera del Menu Bar */}
        <div className="flex items-center justify-between border-b border-app pb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-xs font-bold text-app uppercase tracking-wider">
              Autoservicio QR · <span className="text-primary font-black">{activeTable.nombre}</span>
            </p>
          </div>
          
          <button
            onClick={handleExitTable}
            className="flex items-center gap-1 text-[10px] font-bold text-muted hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
            title="Salir de la mesa"
          >
            <LogOut size={12} />
            <span>Salir</span>
          </button>
        </div>

        {/* Acciones principales */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCallWaiter}
            disabled={loading !== null || success !== null}
            className="h-11 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs transition-all active:scale-95 text-white shadow-md border-none cursor-pointer"
            style={{
              background: success === 'llamado' ? '#10b981' : 'var(--color-primary)',
            }}
          >
            {loading === 'llamado' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : success === 'llamado' ? (
              <><CheckCircle2 size={16} /> ¡Llamado!</>
            ) : (
              <><Bell size={16} /> Llamar Mesero</>
            )}
          </button>

          <button
            onClick={handleRequestBill}
            disabled={loading !== null || success !== null}
            className="h-11 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs transition-all active:scale-95 text-app bg-surface-2 border border-app hover:bg-surface-3 shadow-sm cursor-pointer"
          >
            {loading === 'cuenta' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : success === 'cuenta' ? (
              <span className="text-emerald-500 flex items-center gap-1 font-bold">
                <CheckCircle2 size={16} /> Cuenta pedida
              </span>
            ) : (
              <><Receipt size={16} className="text-primary" /> Pedir Cuenta</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
