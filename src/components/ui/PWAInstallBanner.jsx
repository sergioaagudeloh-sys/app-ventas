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
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 p-4 rounded-3xl bg-surface/90 backdrop-blur-md border border-app shadow-2xl flex flex-col gap-3"
          style={{ borderRadius: 'var(--radius-base)' }}
        >
          {/* Botón cerrar */}
          <button
            onClick={dismissPrompt}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-app transition-colors"
            aria-label="Cerrar aviso"
          >
            <X size={14} />
          </button>

          <div className="flex gap-3 pr-6">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Download size={20} />
            </div>
            <div>
              <h3 className="font-bold text-app text-sm">Instalar Aplicación</h3>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                Descarga esta aplicación en tu pantalla de inicio para un acceso rápido y una mejor experiencia.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={dismissPrompt}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-app bg-surface-2 hover:bg-app/10 transition-colors"
            >
              Quizás luego
            </button>
            <button
              onClick={handleInstall}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:opacity-90 active:scale-95 transition-all shadow-md"
            >
              Descargar ahora
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
