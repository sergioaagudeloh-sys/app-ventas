import { motion } from 'framer-motion'

export default function EmptyState({ 
  title, 
  description, 
  icon: Icon, 
  actionLabel, 
  onAction,
  illustration: Illustration
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
      {/* Ilustración o Icono animado */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className="mb-6 relative flex items-center justify-center w-24 h-24 rounded-full bg-primary/5 text-primary"
      >
        {Illustration ? (
          <Illustration />
        ) : Icon ? (
          <Icon size={40} className="stroke-[1.5]" />
        ) : (
          <span className="text-4xl">📦</span>
        )}
      </motion.div>

      {/* Textos */}
      <h3 className="text-base font-bold text-app mb-1.5 uppercase tracking-wider">
        {title}
      </h3>
      <p className="text-xs text-muted mb-6 leading-relaxed max-w-[280px]">
        {description}
      </p>

      {/* Botón de acción elástico */}
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md shadow-primary/20 hover:opacity-90 transition-opacity active:scale-95 cursor-pointer"
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  )
}
