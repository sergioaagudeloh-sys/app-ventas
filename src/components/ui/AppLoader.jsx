import { motion } from 'framer-motion'
import useAppConfigStore from '../../store/appConfigStore'

/**
 * Loader global de la aplicación.
 * Se muestra durante lazy loading de rutas y carga inicial.
 * Usa el nombre de la app configurado para personalizarlo.
 */
export default function AppLoader() {
  const { appName } = useAppConfigStore()

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-app"
      role="status"
      aria-label="Cargando aplicación"
    >
      {/* Círculo animado */}
      <motion.div
        className="w-16 h-16 rounded-full border-4 border-app"
        style={{
          borderTopColor: 'var(--color-primary)',
          borderRightColor: 'var(--color-primary-light)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      />

      {/* Nombre de la app */}
      <motion.p
        className="mt-6 text-lg font-semibold text-primary"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {appName}
      </motion.p>

      <p className="mt-1 text-sm text-muted">Cargando...</p>
    </div>
  )
}
