import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Store, ChevronRight } from 'lucide-react'
import useAppConfigStore from '../store/appConfigStore'
import useAuthStore from '../store/authStore'
import { ROLES } from '../constants'

export default function WelcomePage() {
  const navigate = useNavigate()
  const { role, isLoading } = useAuthStore()
  const { appName, appIcon, primaryColor, welcomeWavesEnabled, isLoaded } = useAppConfigStore()

  // Leer color primario real desde las variables CSS del DOM
  const patternColor = useMemo(() => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary').trim()
    return raw || '#6d28d9'
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryColor])

  // Construir SVG del patrón con el color real
  const patternSvg = useMemo(() => {
    const c = encodeURIComponent(patternColor)
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cg transform='translate(10,10)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6h16l-1.5 10H5.5L4 6z'/%3E%3Cpath d='M9 6V4a3 3 0 016 0v2'/%3E%3C/g%3E%3Cg transform='translate(80,10)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='19' r='1.5'/%3E%3Ccircle cx='18' cy='19' r='1.5'/%3E%3Cpath d='M2 2h2l2.5 11h10l2-7H6.5'/%3E%3C/g%3E%3Cg transform='translate(10,80)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2L2 12l8 8 10-10V2H12z'/%3E%3Ccircle cx='16' cy='6' r='1.5'/%3E%3C/g%3E%3Cg transform='translate(80,80)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='8' width='18' height='13' rx='1'/%3E%3Cpath d='M3 8h18M12 8V21M8 8c0-2 1.5-4 4-4s4 2 4 4'/%3E%3C/g%3E%3Cg transform='translate(45,40)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolygon points='12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9'/%3E%3C/g%3E%3Cg transform='translate(115,45)' stroke='${c}' stroke-width='1.5' fill='none'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7v1m0 8v1m-3-5h6m-3-3v6' stroke-linecap='round'/%3E%3C/g%3E%3Cg transform='translate(45,110)' stroke='${c}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/%3E%3C/g%3E%3C/svg%3E")`
  }, [patternColor])

  // Redirección si ya hay sesión activa
  useEffect(() => {
    if (!isLoading) {
      if (role === ROLES.ADMIN) navigate('/admin/inicio', { replace: true })
      if (role === ROLES.CLIENT) navigate('/tienda/catalogo', { replace: true })
    }
  }, [role, isLoading, navigate])

  if (isLoading || !isLoaded) return null

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* ─── Fondo: orbes + patrón de comercio ──────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orbes de luz */}
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full bg-primary/5 blur-[80px]" />

        {/* Patrón de iconos de comercio — SVG tileado, color del tema */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: patternSvg,
            backgroundSize: '160px 160px',
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center">

        {/* ─── Logo Premium ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, type: 'spring', bounce: 0.45 }}
          className="mb-10 relative flex items-center justify-center"
        >
          {/* Glow difuminado exterior — fuera del clip para que se vea suave */}
          <motion.div
            animate={{ opacity: [0.3, 0.65, 0.3], scale: [0.9, 1.05, 0.9] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-[340px] h-[340px] rounded-full bg-primary/20 blur-3xl"
          />

          {/* Círculo contenedor de ondas — overflow-hidden para que no tapen el texto */}
          <div className="relative w-[340px] h-[340px] rounded-full overflow-hidden flex items-center justify-center">
            {/* Fondo circular muy sutil */}
            <div className="absolute inset-0 rounded-full bg-primary/5" />

            {/* Ondas sonar contenidas dentro del círculo */}
            {(welcomeWavesEnabled !== false) && [0, 1.2, 2.4].map((delay, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [0.3, 1.05],
                  opacity: [0, 0.35, 0]
                }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay,
                }}
                className="absolute inset-0 rounded-full bg-primary"
              />
            ))}

            {/* Logo centrado y flotante */}
            <div className="relative w-[240px] h-[240px] z-10">
              {appIcon ? (
                <motion.img
                  src={appIcon}
                  alt={`Logo de ${appName}`}
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 16px 28px color-mix(in srgb, var(--color-primary) 45%, transparent))'
                  }}
                />
              ) : (
                <motion.div
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-full h-full rounded-[5rem] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl"
                >
                  <Store size={128} className="text-white drop-shadow-lg" />
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ─── Nombre y descripción ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <h1 className="text-4xl md:text-5xl font-black text-app tracking-tight mb-3">
            {appName || 'Mi Tienda'}
          </h1>
          <p className="text-lg text-muted mb-12 max-w-xs mx-auto leading-relaxed">
            Explora nuestros productos y realiza tus pedidos fácilmente.
          </p>
        </motion.div>

        {/* ─── Botón Comencemos ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="w-full"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login')}
            className="group w-full md:w-auto md:min-w-[260px] flex items-center justify-center gap-3 bg-primary text-white py-4 px-8 font-bold text-lg rounded-2xl mx-auto transition-all"
            style={{
              boxShadow: '0 8px 30px color-mix(in srgb, var(--color-primary) 35%, transparent)'
            }}
          >
            <span>Comencemos</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}
