import { useEffect } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft } from 'lucide-react'

/**
 * Componente de Modal Premium Reutilizable.
 * Cumple con: React Portals, Body Scroll Lock, Microinteracciones y responsividad Mobile-First.
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Flag de control de apertura.
 * @param {function} props.onClose - Función callback de cierre.
 * @param {string} [props.title] - Título principal de la cabecera (si está vacío, oculta la cabecera).
 * @param {string} [props.subtitle] - Subtítulo secundario opcional.
 * @param {React.Component} [props.icon] - Ícono Lucide React opcional para decorar la cabecera.
 * @param {function} [props.onBack] - Función callback opcional para botón de regreso (modales multi-paso).
 * @param {React.ReactNode} props.children - Contenido interno del modal.
 * @param {React.ReactNode} [props.footerActions] - Botones de acción del pie de página.
 */
export default function ModalTemplate({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  icon: Icon, 
  onBack,
  children, 
  footerActions 
}) {
  
  // ─── Bloqueo de Scroll del Body (Scroll Lock) ───────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const modalDOM = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        
        {/* 1. Backdrop Translúcido con Desenfoque */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        />

        {/* 2. Tarjeta del Modal (Mobile-First Slide-up) */}
        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-app pointer-events-auto"
          style={{ willChange: 'transform' }}
        >
          {/* A. Cabecera (Header) - Renderizada condicionalmente si hay título */}
          {title && (
            <div className="flex items-center justify-between p-4 border-b border-app bg-surface-2 shrink-0">
              <div className="flex items-center gap-3">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center hover:bg-surface-3 text-muted hover:text-app transition-colors active:scale-90"
                    aria-label="Volver"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                {Icon && (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                    <Icon size={20} className="animate-pulse" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-app text-base leading-none">{title}</h3>
                  {subtitle && <div className="text-xs text-muted mt-1 leading-none">{subtitle}</div>}
                </div>
              </div>
              
              {/* Botón X de Cerrar */}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-app hover:bg-surface-3 transition-all active:scale-90 cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* B. Cuerpo Desplazable (Body) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-app">
            {children}
          </div>

          {/* C. Pie de Página (Sticky Footer) */}
          {footerActions && (
            <div className="p-4 border-t border-app bg-surface shrink-0 flex gap-3">
              {footerActions}
            </div>
          )}
        </motion.div>

      </div>
    </AnimatePresence>
  )

  return ReactDOM.createPortal(modalDOM, document.body)
}
