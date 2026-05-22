import { motion } from 'framer-motion'
import useAppConfigStore from '../../../store/appConfigStore'

export default function CatalogBanner() {
  const { catalogBanner, theme, isDarkMode } = useAppConfigStore()

  if (!catalogBanner || catalogBanner.type === 'none') {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 md:px-8 mt-4"
    >
      <div 
        className="w-full h-32 sm:h-40 md:h-48 rounded-3xl overflow-hidden relative shadow-sm border border-app flex items-center justify-center"
        style={
          catalogBanner.type === 'gradient' 
            ? { background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }
            : {}
        }
      >
        {catalogBanner.type === 'image' && catalogBanner.value ? (
          <>
            <img 
              src={catalogBanner.value} 
              alt="Banner del catálogo" 
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            {/* Overlay sutil para la imagen */}
            <div className="absolute inset-0 bg-black/20" />
          </>
        ) : null}

        {/* Mensaje opcional o decorativo (puedes personalizarlo luego) */}
        {catalogBanner.type === 'gradient' && (
          <h2 className="relative z-10 text-white font-bold text-2xl sm:text-3xl tracking-tight text-center px-4 drop-shadow-md">
            Descubre nuestra colección
          </h2>
        )}
      </div>
    </motion.div>
  )
}
