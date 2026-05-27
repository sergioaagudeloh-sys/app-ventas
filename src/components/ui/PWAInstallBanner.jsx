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
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-max z-50 p-2.5 rounded-full bg-surface/90 backdrop-blur-md border border-app shadow-xl flex items-center gap-3.5 pl-4 pr-3"
          style={{ borderRadius: '9999px' }}
        >
          {/* Icono + Texto en una sola línea compacta */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Download size={14} className="animate-bounce" style={{ animationDuration: '2s' }} />
            </div>
            <span className="font-semibold text-app text-xs whitespace-nowrap">
              Instala la aplicación para un acceso rápido
            </span>
          </div>

          {/* Botones de acción súper compactos */}
          <div className="flex items-center gap-1.5 border-l border-app pl-3">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white bg-primary hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              Instalar
            </button>
            <button
              onClick={dismissPrompt}
              className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-app hover:bg-surface-2 transition-colors"
              aria-label="Cerrar aviso"
            >
              <X size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
