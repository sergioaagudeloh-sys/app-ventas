import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

/**
 * Componente unificado CustomSelect.
 * Reemplaza selectores locales repetidos en el panel de inventario y ajustes.
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  emptyOption = null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none flex items-center justify-between transition-colors text-sm cursor-pointer"
        style={{ borderColor: isOpen ? 'var(--color-primary)' : undefined }}
      >
        <span className={selected || value ? 'text-app truncate mr-2' : 'text-muted truncate mr-2'}>
          {selected ? selected.label : (value || placeholder)}
        </span>
        <ChevronDown
          size={16}
          className={`text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay para cerrar al hacer click fuera */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 top-12 left-0 right-0 mt-1 bg-surface border border-app rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
                {emptyOption && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('')
                      setIsOpen(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-muted hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    {emptyOption}
                  </button>
                )}
                {options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between cursor-pointer ${
                      value === opt.value
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-app hover:bg-surface-2'
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {value === opt.value && <Check size={16} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Espaciador dinámico para scroll modal */}
      {isOpen && <div className="h-48 pointer-events-none" />}
    </div>
  )
}
