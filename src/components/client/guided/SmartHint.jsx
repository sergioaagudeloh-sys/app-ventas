import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import useAppConfigStore from '../../../store/appConfigStore'
import useGuidedStore from '../../../store/guidedStore'

export default function SmartHint({ 
  stepId, 
  message, 
  position = 'bottom', // 'top', 'bottom', 'floating', 'banner', 'none'
  delay = 0,
  inactivityTrigger = false,
  isInactive = false,
  onDismiss,
  children,
  className = '',
  forceShow = false
}) {
  const { guidedModeEnabled } = useAppConfigStore()
  const { isAssistanceMode, shouldShowHint, markStepCompleted } = useGuidedStore()
  const [isDismissed, setIsDismissed] = useState(false)
  
  // Usar la lógica inteligente del store para saber si debe mostrarse
  const isEnabled = guidedModeEnabled && (shouldShowHint(stepId) || forceShow) && !isDismissed
  // Mostrar si está habilitado y (no requiere inactividad O está inactivo)
  const show = isEnabled && (!inactivityTrigger || isInactive)

  const handleDismiss = (e) => {
    if (e) e.stopPropagation()
    setIsDismissed(true)
    // Guardar el progreso en el store local para que no se repita
    markStepCompleted(stepId)
    if (onDismiss) onDismiss()
  }

  // Auto-cerrar el consejo después de un tiempo prudente proporcional al largo del texto (mínimo 7 segundos)
  useEffect(() => {
    if (show) {
      const wordsCount = message.split(' ').length
      const readingTimeMs = Math.max(7000, wordsCount * 300 + 2000) // 300ms por palabra + 2s base

      const t = setTimeout(() => {
        handleDismiss()
      }, readingTimeMs)
      return () => clearTimeout(t)
    }
  }, [show, message])

  const content = (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' || position === 'banner' ? -50 : 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: position === 'top' || position === 'banner' ? -50 : 50, x: '-50%' }}
          transition={{ delay: delay / 1000, type: 'spring', stiffness: 400, damping: 25 }}
          className={`z-[100] fixed left-1/2 w-[92%] max-w-sm pointer-events-auto bg-surface/90 backdrop-blur-md border border-primary/20 shadow-2xl rounded-2xl p-4 flex items-start gap-3 ${
            position === 'top' || position === 'banner' ? 'top-6' : 'bottom-24'
          } ${className}`}
        >
          {/* Botón de cerrar manual */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-surface-2 hover:bg-primary/10 text-muted hover:text-primary transition-colors cursor-pointer"
            aria-label="Cerrar consejo"
          >
            <X size={12} />
          </button>

          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 border border-primary/20">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div className="flex-1 pt-0.5 pr-4">
            <p className="text-xs md:text-sm text-app font-semibold leading-snug">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {children}
      {content}
    </>
  )
}
