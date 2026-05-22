import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ErrorBoundary } from 'react-error-boundary'
import { Store, Smartphone, Shield, Mail, Lock } from 'lucide-react'
import { auth, db } from '../config/firebaseConfig'
import useAuthStore from '../store/authStore'
import useAppConfigStore from '../store/appConfigStore'
import { updateAppConfig } from '../services/appConfigService'
import { ROLES, CLIENT_LOGIN_TRUST_MESSAGE, COLLECTIONS } from '../constants'
import useInactivityTimer from '../hooks/useInactivityTimer'
import SmartHint from '../components/client/guided/SmartHint'

/**
 * Página de Login.
 * Dos modos: Administrador (Google Auth) | Cliente (celular + nombre).
 * Incluye mensaje de confianza exacto del Informe §4.
 */
export default function LoginPage() {
  const [mode, setMode] = useState('client')   // 'client' | 'admin'
  const [clientStep, setClientStep] = useState(1) // 1: Pedir Celular, 2: Pedir Nombre
  const [nombre, setNombre] = useState('')
  const [celular, setCelular] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { role, setAdmin, setClient } = useAuthStore()
  const { appName, appIcon, adminRegistered, primaryColor } = useAppConfigStore()
  const navigate = useNavigate()

  // Leer color primario real desde CSS en runtime
  const patternColor = useMemo(() => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary').trim()
    return raw || '#6d28d9'
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryColor])

  const patternSvg = useMemo(() => {
    const c = encodeURIComponent(patternColor)
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cg transform='translate(10,10)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6h16l-1.5 10H5.5L4 6z'/%3E%3Cpath d='M9 6V4a3 3 0 016 0v2'/%3E%3C/g%3E%3Cg transform='translate(80,10)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='19' r='1.5'/%3E%3Ccircle cx='18' cy='19' r='1.5'/%3E%3Cpath d='M2 2h2l2.5 11h10l2-7H6.5'/%3E%3C/g%3E%3Cg transform='translate(10,80)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2L2 12l8 8 10-10V2H12z'/%3E%3Ccircle cx='16' cy='6' r='1.5'/%3E%3C/g%3E%3Cg transform='translate(80,80)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='8' width='18' height='13' rx='1'/%3E%3Cpath d='M3 8h18M12 8V21M8 8c0-2 1.5-4 4-4s4 2 4 4'/%3E%3C/g%3E%3Cg transform='translate(45,40)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolygon points='12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9'/%3E%3C/g%3E%3Cg transform='translate(115,45)' stroke='${c}' stroke-width='1.5' fill='none'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7v1m0 8v1m-3-5h6m-3-3v6' stroke-linecap='round'/%3E%3C/g%3E%3Cg transform='translate(45,110)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/%3E%3C/g%3E%3C/svg%3E")`
  }, [patternColor])

  // Inactividad (Paso 2 Guiado)
  const { isInactive } = useInactivityTimer(15000, mode === 'client' && clientStep === 1)

  // ─── Redirección automática si ya está autenticado ───────────────────────
  useEffect(() => {
    if (role === ROLES.ADMIN) {
      navigate('/admin/inicio', { replace: true })
    } else if (role === ROLES.CLIENT) {
      navigate('/tienda/catalogo', { replace: true })
    }
  }, [role, navigate])

  // ─── Autenticación Administrador (Correo/Contraseña) ───────────────────────
  const handleAdminAuth = async (e) => {
    e.preventDefault()
    if (!adminEmail || !adminPassword) {
      setError('Por favor, ingresa correo y contraseña.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      let userCredential
      if (adminRegistered) {
        // Inicio de sesión
        userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      } else {
        // Registro por primera vez
        userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword)
        await updateAppConfig({ adminRegistered: true })
      }
      
      const user = userCredential.user
      setAdmin({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Administrador',
        photoURL: user.photoURL || null,
      })
      navigate('/admin/inicio', { replace: true })
    } catch (err) {
      console.error(err)
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Correo o contraseña incorrectos.')
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Ese correo ya está en uso.')
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.')
      } else {
        setError('Ocurrió un error. Intenta de nuevo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Login Cliente con celular + nombre ────────────────────────────────────
  const handleClientLogin = async (e) => {
    e.preventDefault()
    
    if (clientStep === 1) {
      if (celular.replace(/\D/g, '').length < 7) {
        setError('Ingresa un número de celular válido.')
        return
      }
      
      setIsLoading(true)
      setError('')

      try {
        const cleanPhone = celular.replace(/\D/g, '')
        const userRef = doc(db, COLLECTIONS.USERS, cleanPhone)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          // Cliente antiguo: entra de una vez
          setClient({
            nombre: userSnap.data().nombre,
            celular: cleanPhone,
          })
          navigate('/tienda/catalogo', { replace: true })
        } else {
          // Cliente nuevo: avanza al paso 2
          setClientStep(2)
        }
      } catch (err) {
        setError('Error al verificar tu número. Verifica tu conexión.')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
      
    } else {
      // clientStep === 2
      if (!nombre.trim()) {
        setError('Por favor ingresa tu nombre para continuar.')
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const cleanPhone = celular.replace(/\D/g, '')
        const userRef = doc(db, COLLECTIONS.USERS, cleanPhone)
        
        // Guardar nuevo cliente
        await setDoc(userRef, {
          nombre: nombre.trim(),
          celular: cleanPhone,
          fechaRegistro: serverTimestamp(),
        })

        setClient({
          nombre: nombre.trim(),
          celular: cleanPhone,
        })
        navigate('/tienda/catalogo', { replace: true })
      } catch (err) {
        setError('Error al registrar tu nombre. Intenta de nuevo.')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-5 relative overflow-hidden">

      {/* ─── Fondo: orbes + patrón de comercio ──────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full bg-primary/5 blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: patternSvg,
            backgroundSize: '160px 160px',
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      {/* Header con logo y nombre de la app */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center mb-4">
          {appIcon ? (
            <img
              src={appIcon}
              alt={`Logo de ${appName}`}
              className="w-16 h-16 rounded-2xl object-cover shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Store size={28} className="text-white" aria-hidden="true" />
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold text-app">{appName}</h1>
        <p className="text-muted text-sm mt-1">Bienvenido. Explora y realiza tus pedidos fácilmente.</p>
      </motion.div>

      {/* Tarjeta de login */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm bg-surface rounded-3xl shadow-xl border border-app overflow-hidden"
      >
        {/* Selector de modo */}
        <div className="flex p-2 gap-2 bg-surface-2 m-4 rounded-2xl" role="tablist" aria-label="Tipo de acceso">
          <button
            role="tab"
            aria-selected={mode === 'client'}
            onClick={() => { setMode('client'); setClientStep(1); setError('') }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              mode === 'client'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-muted hover:text-app'
            }`}
            aria-label="Acceso para clientes"
          >
            Cliente
          </button>
          <button
            role="tab"
            aria-selected={mode === 'admin'}
            onClick={() => { setMode('admin'); setClientStep(1); setError('') }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              mode === 'admin'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-muted hover:text-app'
            }`}
            aria-label="Acceso para administrador"
          >
            Administrador
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* ─── Formulario Cliente ───────────────────────────────────── */}
          {mode === 'client' && (
            <form
              onSubmit={handleClientLogin}
              noValidate
            >
                <div className="space-y-4">
                  {/* Paso 1: Pedir celular */}
                  {clientStep === 1 && (
                    <div key="step1">
                      <label htmlFor="client-celular" className="block text-sm font-medium text-app mb-1.5">
                        Número de celular
                      </label>
                      <div className="relative">
                        <Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                        <input
                          id="client-celular"
                          type="tel"
                          value={celular}
                          onChange={(e) => setCelular(e.target.value)}
                          placeholder="3XXXXXXXXX"
                          className="w-full h-12 pl-10 pr-4 rounded-2xl bg-surface-2 border border-app text-app placeholder:text-muted text-sm focus:outline-none focus:border-primary transition-colors"
                          autoComplete="tel"
                          aria-required="true"
                          aria-describedby="trust-message"
                        />
                      </div>
                      <div id="trust-message" className="flex items-start gap-2 mt-3 p-3 bg-surface-2 rounded-xl" role="note">
                        <Shield size={14} className="text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-xs text-muted leading-relaxed">{CLIENT_LOGIN_TRUST_MESSAGE}</p>
                      </div>
                    </div>
                  )}

                  {/* Paso 2: Pedir nombre (Solo si es nuevo) */}
                  {clientStep === 2 && (
                    <div key="step2">
                      <div className="mb-4">
                        <p className="text-sm text-app font-medium mb-1">¡Hola! Parece que eres nuevo por aquí.</p>
                        <p className="text-xs text-muted">Ingresa tu nombre para guardar tus datos y hacer más rápidos tus próximos pedidos.</p>
                      </div>
                      <label htmlFor="client-nombre" className="block text-sm font-medium text-app mb-1.5">
                        ¿Cómo te llamas?
                      </label>
                      <input
                        id="client-nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej. María Pérez"
                        className="w-full h-12 px-4 rounded-2xl bg-surface-2 border border-app text-app placeholder:text-muted text-sm focus:outline-none focus:border-primary transition-colors"
                        autoComplete="given-name"
                        aria-required="true"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Mensaje de error */}
                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-sm text-red-500 text-center font-medium" role="alert">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Botón continuar */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-primary text-white rounded-2xl font-bold text-base transition-all duration-300 active:scale-95 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Continuar al catálogo"
                  >
                    {isLoading ? (
                      <div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                        aria-label="Cargando..."
                      />
                    ) : (
                      'Continuar'
                    )}
                  </button>

                  {/* Asistencia Guiada: Inactividad */}
                  {mode === 'client' && (
                    <SmartHint 
                      stepId="login_inactivity" 
                      message="Ingresa tus datos para continuar." 
                      position="bottom" 
                      inactivityTrigger={true}
                      isInactive={isInactive}
                    />
                  )}
                </div>
              </form>
            )}

            {/* ─── Formulario Admin ─────────────────────────────────────── */}
            {mode === 'admin' && (
              <form onSubmit={handleAdminAuth} className="space-y-4" noValidate>
                <div className="mb-4">
                  <p className="text-sm text-app font-medium mb-1">
                    {adminRegistered ? 'Bienvenido de nuevo' : 'Configuración Inicial'}
                  </p>
                  <p className="text-xs text-muted">
                    {adminRegistered 
                      ? 'Ingresa tus credenciales para acceder al panel.' 
                      : 'Crea el usuario y contraseña del administrador.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="Correo electrónico"
                      className="w-full h-12 pl-10 pr-4 rounded-2xl bg-surface-2 border border-app text-app placeholder:text-muted text-sm focus:outline-none focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="w-full h-12 pl-10 pr-4 rounded-2xl bg-surface-2 border border-app text-app placeholder:text-muted text-sm focus:outline-none focus:border-primary transition-colors"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-sm text-red-500 text-center font-medium" role="alert">
                      {error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-primary text-white rounded-2xl font-bold text-base transition-all duration-300 active:scale-95 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    adminRegistered ? 'Iniciar Sesión' : 'Registrar Administrador'
                  )}
                </button>
              </form>
            )}
        </div>
      </motion.div>

      <p className="mt-6 text-xs text-muted text-center">
        {appName} · Tu tienda de confianza
      </p>
    </div>
  )
}
