import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ShieldCheck, HelpCircle, X, ChevronRight } from 'lucide-react'
import useFCMPermission from '../../hooks/useFCMPermission'

export default function SoftPushPrompt({ userId, role, onDismiss }) {
  const { permissionStatus, requestPermission, refreshPermissionStatus } = useFCMPermission(userId, role)
  const [isOpen, setIsOpen] = useState(true)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Si ya tiene permiso concedido o no está soportado, no mostrar nada
  if (permissionStatus === 'granted' || permissionStatus === 'unsupported' || !isOpen) {
    return null
  }

  const handleSubscribe = async () => {
    setIsLoading(true)
    const result = await requestPermission()
    setIsLoading(false)

    if (result === 'denied') {
      // Si el navegador bloqueó la solicitud o el usuario la denegó, mostrar instructivo de desbloqueo
      setShowInstructions(true)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="p-4 bg-surface border border-app rounded-2xl shadow-xl flex flex-col gap-3 relative overflow-hidden bg-opacity-95 backdrop-blur-sm max-w-md mx-auto my-4"
      >
        <button
          onClick={() => {
            setIsOpen(false)
            if (onDismiss) onDismiss()
          }}
          className="absolute top-3 right-3 text-muted hover:text-app transition-colors p-1"
          aria-label="Cerrar sugerencia"
        >
          <X size={14} />
        </button>

        {!showInstructions ? (
          <>
            <div className="flex items-start gap-3 pr-6">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <Bell size={20} className="animate-bounce" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xs text-app">¿Quieres recibir alertas en tiempo real?</h4>
                <p className="text-[10px] text-muted mt-0.5 leading-relaxed">
                  Te avisaremos al instante cuando tu pedido sea aceptado, empacado y esté en camino a tu dirección.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={() => {
                  setIsOpen(false)
                  if (onDismiss) onDismiss()
                }}
                className="px-3 py-1.5 rounded-xl text-[10px] font-semibold text-muted hover:bg-surface-2 transition-colors"
              >
                Quizás luego
              </button>
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="px-4 py-1.5 rounded-xl text-[10px] font-semibold bg-primary text-white hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-1"
              >
                {isLoading ? 'Activando...' : '🔔 Activar Alertas'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <HelpCircle size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xs text-app">Notificaciones Bloqueadas</h4>
                <p className="text-[10px] text-muted mt-0.5 leading-relaxed">
                  Tu navegador ha bloqueado las notificaciones para esta página. Sigue estos 2 sencillos pasos para activarlas:
                </p>
              </div>
            </div>

            {/* Pasos Visuales */}
            <div className="p-3 bg-surface-2 rounded-xl border border-app space-y-2 text-[10px] text-muted">
              <div className="flex gap-2 items-start">
                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">1</span>
                <p className="leading-tight">
                  Toca el icono de **Ajustes/Tuning** (o el candado) que está a la izquierda de la URL en la barra superior.
                </p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">2</span>
                <p className="leading-tight">
                  Activa el selector de **Notificaciones** cambiándolo a **Permitir**.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-3 py-1.5 rounded-xl text-[10px] font-semibold text-muted hover:bg-surface-2 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={() => {
                  const status = refreshPermissionStatus()
                  if (status === 'granted') {
                    setIsOpen(false)
                  }
                }}
                className="px-4 py-1.5 rounded-xl text-[10px] font-semibold bg-primary text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                Ya lo activé ✓
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
