import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import useGuidedStore from '../../store/guidedStore'
import useCartStore from '../../store/cartStore'
import { GUIDED_MESSAGES } from '../../constants'

export default function GuidedToast() {
  const { isAssistanceMode, completedSteps, disableAssistance } = useGuidedStore()
  const { items } = useCartStore()
  const location = useLocation()
  
  const [currentMessage, setCurrentMessage] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    // Si el modo asistencia no está activo, no mostramos nada
    if (!isAssistanceMode) {
      setIsVisible(false)
      return
    }

    let message = null

    // LÓGICA DE PASOS (Sección 22 del Informe)
    // Aseguramos que las notificaciones de compra solo salgan dentro de la tienda
    if (location.pathname === '/tienda/catalogo') {
      if (items.length === 0 && !completedSteps['catalog']) {
        message = GUIDED_MESSAGES.CATALOG_ENTRY
      } else if (items.length > 0 && !completedSteps['view_cart']) {
        message = GUIDED_MESSAGES.PRODUCT_ADDED
      }
    }

    // Agregar un pequeño delay para que no aparezca abruptamente al cambiar de pantalla
    if (message) {
      setCurrentMessage(message)
      const timer = setTimeout(() => setIsVisible(true), 800)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [isAssistanceMode, location.pathname, items.length, completedSteps])

  const handleDismiss = () => {
    setIsVisible(false)
  }

  const handleDisableAll = () => {
    setShowConfirm(true)
  }

  const confirmDisable = () => {
    disableAssistance()
    setShowConfirm(false)
    setIsVisible(false)
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && currentMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[100] max-w-sm"
          >
            <div className="bg-primary text-white rounded-2xl p-4 shadow-2xl shadow-primary/30 relative border-2 border-white/20">
              {/* Ícono animado */}
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <Sparkles className="text-primary" size={20} />
              </div>

              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                <X size={14} />
              </button>

              <p className="font-bold text-sm leading-relaxed pl-4 pr-6">
                {currentMessage}
              </p>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleDisableAll}
                  className="text-[10px] uppercase tracking-wider font-bold opacity-70 hover:opacity-100 transition-opacity"
                >
                  Dejar de mostrar consejos
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-surface rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center border border-app overflow-hidden"
            >
              {/* Decorative top gradient */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
              
              <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4 border border-app">
                <Sparkles size={28} className="text-primary" />
              </div>
              
              <h3 className="text-xl font-bold text-app mb-2">¿Desactivar consejos?</h3>
              <p className="text-muted text-sm mb-8">
                Si desactivas la ayuda guiada ya no verás estos mensajes. Siempre puedes volver a activarla desde tu Perfil.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 h-12 rounded-xl font-bold text-app bg-surface-2 hover:bg-surface transition-colors border border-app active:scale-95"
                >
                  Mantener
                </button>
                <button
                  onClick={confirmDisable}
                  className="flex-1 h-12 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active:scale-95"
                >
                  Desactivar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
