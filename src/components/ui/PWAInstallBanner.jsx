import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'
import usePWAInstall from '../../hooks/usePWAInstall'

export default function PWAInstallBanner() {
  const { isInstallable, handleInstall, dismissPrompt } = usePWAInstall()

  return (
    <AnimatePresence>
      {isInstallable && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-50 p-4 rounded-3xl bg-surface/85 backdrop-blur-lg border border-app shadow-2xl flex flex-col gap-4"
        >
          {/* Fila de Encabezado */}
          <div className="flex gap-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Download size={20} className="animate-bounce" style={{ animationDuration: '2.5s' }} />
            </div>
            
            <div className="flex-1 min-w-0 pr-6">
              <h4 className="font-extrabold text-app text-sm leading-tight">Instalar Aplicación</h4>
              <p className="text-muted text-[11px] mt-0.5 leading-snug">
                Accede al instante a la tienda desde tu pantalla de inicio y navega de forma más rápida y fluida.
              </p>
            </div>

            {/* Botón de Cerrar Permanente */}
            <button
              onClick={() => dismissPrompt(false)}
              className="absolute -top-1.5 -right-1.5 w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-app hover:bg-surface-2 transition-colors"
              aria-label="Cerrar permanentemente"
            >
              <X size={15} />
            </button>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => dismissPrompt(true)}
              className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-muted hover:text-app bg-surface-2 hover:bg-surface border border-app transition-all active:scale-95"
            >
              Recordar más tarde
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-2.5 rounded-2xl text-xs font-black text-white bg-primary hover:opacity-95 transition-all active:scale-95 shadow-lg shadow-primary/10"
            >
              Instalar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
