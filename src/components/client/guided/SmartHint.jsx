import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import useAppConfigStore from '../../../store/appConfigStore'

export default function SmartHint({ 
  stepId, 
  message, 
  position = 'bottom', // 'top', 'bottom', 'floating', 'banner', 'none'
  delay = 0,
  inactivityTrigger = false,
  isInactive = false,
  onDismiss,
  children,
  className = ''
}) {
  const { guidedModeEnabled } = useAppConfigStore()
  const [isDismissed, setIsDismissed] = useState(false)
  
  const isEnabled = guidedModeEnabled && !isDismissed
  // Mostrar si está habilitado y (no requiere inactividad O está inactivo)
  const show = isEnabled && (!inactivityTrigger || isInactive)

  const handleDismiss = (e) => {
    if (e) e.stopPropagation()
    setIsDismissed(true)
    if (onDismiss) onDismiss()
  }

  // Auto-cerrar cualquier mensaje después de 3.5 segundos
  useEffect(() => {
    if (show) {
      const t = setTimeout(() => {
        handleDismiss()
      }, 3500)
      return () => clearTimeout(t)
    }
  }, [show])

  const content = (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' || position === 'banner' ? -50 : 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: position === 'top' || position === 'banner' ? -50 : 50, x: '-50%' }}
          transition={{ delay: delay / 1000, type: 'spring', stiffness: 400, damping: 25 }}
          className={`z-[100] fixed left-1/2 w-[90%] max-w-sm pointer-events-auto bg-surface/80 backdrop-blur-lg border border-primary/30 shadow-2xl shadow-primary/20 rounded-2xl p-4 flex items-start gap-3 ${
            position === 'top' || position === 'banner' ? 'top-6' : 'bottom-24'
          } ${className}`}
        >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div className="flex-1 pt-0.5 pr-2">
              <p className="text-sm text-app font-medium leading-snug">{message}</p>
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
