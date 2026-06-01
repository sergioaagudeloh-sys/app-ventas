import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, Package, CreditCard, Sparkles, ChevronRight, Info, Edit2, Download, CheckCircle, Smartphone } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useGuidedStore from '../../store/guidedStore'
import useAppConfigStore from '../../store/appConfigStore'
import usePWAInstall from '../../hooks/usePWAInstall'
import { CLIENT_LOGIN_TRUST_MESSAGE, COLLECTIONS } from '../../constants'
import { db } from '../../config/firebaseConfig'
import { doc, updateDoc } from 'firebase/firestore'

const EMOJIS = ['😊', '😎', '🦄', '🐶', '🐱', '🦋', '🚀', '🌟', '🍕', '🎉', '👑', '🏀', '⚽', '🎨', '🎸', '🎮']

export default function ClientProfile() {
  const { user, logout, updateClient } = useAuthStore()
  const { isAssistanceMode, enableAssistance, disableAssistance, resetProgress } = useGuidedStore()
  const { guidedModeEnabled, developerPhone, appName } = useAppConfigStore()
  const { rawInstallable, handleInstall } = usePWAInstall()
  const navigate = useNavigate()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const handleUpdateEmoji = async (newEmoji) => {
    // Actualización local inmediata
    updateClient({ emoji: newEmoji })
    
    // Persistencia en Firestore
    if (user?.celular) {
      try {
        const userRef = doc(db, COLLECTIONS.USERS, user.celular)
        await updateDoc(userRef, { emoji: newEmoji })
      } catch (error) {
        console.error("Error al guardar el emoji en Firestore:", error)
      }
    }
  }

  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  const isStandalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleAssistance = () => {
    if (isAssistanceMode) {
      disableAssistance()
    } else {
      resetProgress() // Reinicia los tutoriales al volver a activar
      enableAssistance()
    }
  }

  const handleContactDeveloper = () => {
    if (!developerPhone) return
    const phone = developerPhone.replace(/\D/g, '')
    const message = encodeURIComponent(`Hola, vi tu contacto en la app *${appName}*. Me interesa cotizar una aplicación para mi propio negocio.`)
    window.open(`https://api.whatsapp.com/send/?phone=${phone}&text=${message}&type=phone_number&app_absent=0`, '_blank')
  }

  return (
    <div className="pb-6">
      {/* Header del Perfil */}
      <div className="bg-primary/5 pt-8 pb-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-5">
          
          {/* Avatar con Emoji Selector */}
          <div className="relative">
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/20 flex-shrink-0 relative group"
            >
              {user?.emoji ? (
                <span className="text-4xl">{user.emoji}</span>
              ) : (
                <User size={36} className="text-white" />
              )}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-surface rounded-full border-2 border-surface flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Edit2 size={12} />
              </div>
            </button>

            {/* Modal de Emojis */}
            <AnimatePresence>
              {showEmojiPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-24 left-0 bg-surface border border-app rounded-2xl shadow-xl p-3 z-50 w-[280px]"
                  >
                    <div className="flex justify-between items-center mb-2 px-1">
                      <p className="text-xs font-bold text-app">Elige tu avatar:</p>
                      {user?.emoji && (
                        <button onClick={() => { handleUpdateEmoji(null); setShowEmojiPicker(false) }} className="text-[10px] font-bold text-error hover:underline">
                          Quitar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {EMOJIS.map(e => (
                        <button 
                          key={e} 
                          onClick={() => { handleUpdateEmoji(e); setShowEmojiPicker(false) }}
                          className={`text-2xl hover:bg-surface-2 rounded-xl p-2 transition-colors flex items-center justify-center ${user?.emoji === e ? 'bg-primary-soft border border-primary-soft' : ''}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-app leading-tight">{user?.nombre || 'Usuario'}</h1>
            <p className="text-muted font-medium mt-1">Cel: {user?.celular}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-6 space-y-4">
        
        {/* ─── BOTONERA PRINCIPAL ─────────────────────────────────────── */}
        <div className="bg-surface rounded-3xl p-2 border border-app shadow-sm">
          <Link to="/tienda/pedidos" className="flex items-center justify-between p-4 hover:bg-surface-2 rounded-2xl transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-app text-app flex items-center justify-center border border-app group-hover:border-primary/50 transition-colors">
                <Package size={20} />
              </div>
              <span className="font-bold text-app">Mis Pedidos</span>
            </div>
            <ChevronRight size={20} className="text-muted group-hover:text-primary transition-colors" />
          </Link>
          
          <div className="h-px bg-app mx-4" />
          
          <Link to="/tienda/creditos" className="flex items-center justify-between p-4 hover:bg-surface-2 rounded-2xl transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-app text-app flex items-center justify-center border border-app group-hover:border-primary/50 transition-colors">
                <CreditCard size={20} />
              </div>
              <span className="font-bold text-app">Mis Créditos</span>
            </div>
            <ChevronRight size={20} className="text-muted group-hover:text-primary transition-colors" />
          </Link>
        </div>

        {/* ─── DESCARGAR APLICACIÓN ─────────────────────────────────────── */}
        {!isStandalone && (rawInstallable || isIOS) && (
          <div className="bg-surface rounded-3xl p-5 border border-app shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Download size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-app leading-tight">Instalar Aplicación</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Descarga la app en tu pantalla de inicio para un acceso rápido y una mejor experiencia.
                </p>
              </div>
            </div>
            {rawInstallable ? (
              <button
                onClick={handleInstall}
                className="w-full h-11 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                style={{ borderRadius: 'var(--radius-base)' }}
              >
                <Download size={16} />
                Descargar ahora
              </button>
            ) : isIOS ? (
              <div className="text-xs text-muted bg-surface-2 p-3.5 rounded-2xl border border-app leading-relaxed">
                📱 En tu iPhone/iPad: pulsa el botón de <strong>Compartir</strong> <span className="text-primary font-bold">↑</span> en la barra inferior de Safari y luego selecciona <strong>"Agregar a la pantalla de inicio"</strong>.
              </div>
            ) : null}
          </div>
        )}

        {isStandalone && (
          <div className="bg-surface rounded-3xl p-4 border border-app shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={16} />
            </div>
            <span className="text-xs font-bold text-app">Aplicación instalada y lista en tu dispositivo</span>
          </div>
        )}

        {/* ─── MODO ASISTENCIA (FASE 8) ────────────────────────────────── */}
        {guidedModeEnabled && (
          <div className="bg-surface rounded-3xl p-5 border border-app shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-app leading-tight">Asistencia de Compra</h3>
                  <p className="text-xs text-muted mt-1 max-w-[200px]">
                    Muestra mensajes emergentes para guiarte paso a paso.
                  </p>
                </div>
              </div>

              {/* Toggle Switch Personalizado */}
              <button 
                onClick={toggleAssistance}
                className={`w-14 h-8 rounded-full flex items-center px-1 transition-colors duration-300 flex-shrink-0 ${isAssistanceMode ? 'bg-primary' : 'bg-surface-2 border border-app'}`}
              >
                <motion.div 
                  layout
                  className={`w-6 h-6 rounded-full bg-white shadow-sm ${!isAssistanceMode && 'bg-muted'}`}
                  initial={false}
                  animate={{ x: isAssistanceMode ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        )}

        {/* Banner Publicitario del Desarrollador (Limpio y Profesional) */}
        {developerPhone && (
          <div className="relative overflow-hidden rounded-3xl bg-primary-soft border border-primary-soft p-5 shadow-xs">
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none" />
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-app text-sm leading-tight">¿Quieres una app para tu negocio?</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Creamos aplicaciones móviles y herramientas digitales personalizadas para ayudarte a vender y organizar tu negocio.
                </p>
                <button
                  onClick={handleContactDeveloper}
                  className="mt-3 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  style={{ borderRadius: 'var(--radius-base)' }}
                >
                  <Smartphone size={14} />
                  Cotizar mi Aplicación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── CONFIANZA Y SALIDA ──────────────────────────────────────── */}
        <div className="bg-primary/5 rounded-2xl p-4 flex gap-3 mt-8">
          <Info size={20} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-app/80 leading-relaxed font-medium">
            {CLIENT_LOGIN_TRUST_MESSAGE}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 font-bold hover:bg-red-500/10 transition-all active:scale-95"
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>

      </div>
    </div>
  )
}
