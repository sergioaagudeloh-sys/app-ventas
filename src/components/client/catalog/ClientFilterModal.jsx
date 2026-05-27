import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Filter, Trash2 } from 'lucide-react'
import useAppConfigStore from '../../../store/appConfigStore'

export default function ClientFilterModal({ isOpen, onClose, allProducts, onApplyFilters, currentFilters }) {
  const { catalogFilters } = useAppConfigStore()
  
  // Local state for the filters being selected in the modal
  const [localFilters, setLocalFilters] = useState(currentFilters || {})

  // Sync local filters with current active filters when opening
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(currentFilters || {})
    }
  }, [isOpen, currentFilters])

  // Extract unique values from products
  const uniqueOptions = useMemo(() => {
    const dynamicAttrs = {}
    catalogFilters.customAttributes?.forEach(attr => {
      dynamicAttrs[attr.id] = new Set()
    })

    const colors = new Set()
    const sizes = new Set()

    allProducts.forEach(p => {
      catalogFilters.customAttributes?.forEach(attr => {
        if (p.atributos?.[attr.id]) {
          dynamicAttrs[attr.id].add(p.atributos[attr.id])
        }
      })
      
      p.variantes?.forEach(v => {
        if (v.color) colors.add(v.color)
        if (v.talla) sizes.add(v.talla)
      })
    })

    const result = {
      colors: Array.from(colors).filter(Boolean).sort(),
      sizes: Array.from(sizes).filter(Boolean).sort()
    }
    
    catalogFilters.customAttributes?.forEach(attr => {
      result[attr.id] = Array.from(dynamicAttrs[attr.id]).filter(Boolean).sort()
    })

    return result
  }, [allProducts, catalogFilters.customAttributes])

  const toggleFilter = (category, value) => {
    setLocalFilters(prev => {
      const currentList = prev[category] || []
      if (currentList.includes(value)) {
        return { ...prev, [category]: currentList.filter(item => item !== value) }
      } else {
        return { ...prev, [category]: [...currentList, value] }
      }
    })
  }

  const handleApply = () => {
    onApplyFilters(localFilters)
    onClose()
  }

  const handleClearAll = () => {
    setLocalFilters({})
  }

  const countActiveLocalFilters = Object.values(localFilters).flat().length

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* Modal / Drawer */}
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full sm:max-w-md bg-surface sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] border border-app"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-app bg-surface-2/50 rounded-t-3xl">
            <h2 className="text-lg font-bold text-app flex items-center gap-2">
              <Filter size={18} className="text-primary" />
              Filtrar Búsqueda
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-muted hover:text-app transition-colors shadow-sm"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Atributos Personalizados Dinámicos */}
            {catalogFilters.customAttributes?.map(attr => {
              const options = uniqueOptions[attr.id] || []
              if (options.length === 0) return null

              return (
                <div key={attr.id}>
                  <h3 className="text-sm font-bold text-app mb-3">{attr.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {options.map(opt => {
                      const isActive = localFilters[attr.id]?.includes(opt)
                      return (
                        <button
                          key={opt}
                          onClick={() => toggleFilter(attr.id, opt)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                            isActive
                              ? 'bg-primary text-white border-primary shadow-md'
                              : 'bg-surface border-app text-app hover:border-primary/50'
                          }`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Colors */}
            {catalogFilters.colors && uniqueOptions.colors.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-app mb-3">Color</h3>
                <div className="flex flex-wrap gap-2">
                  {uniqueOptions.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => toggleFilter('colors', color)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                        localFilters.colors?.includes(color)
                          ? 'bg-primary text-white border-primary shadow-md'
                          : 'bg-surface border-app text-app hover:border-primary/50'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {catalogFilters.sizes && uniqueOptions.sizes.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-app mb-3">Talla</h3>
                <div className="flex flex-wrap gap-2">
                  {uniqueOptions.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => toggleFilter('sizes', size)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                        localFilters.sizes?.includes(size)
                          ? 'bg-primary text-white border-primary shadow-md'
                          : 'bg-surface border-app text-app hover:border-primary/50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Si no hay filtros disponibles para mostrar */}
            {!Object.values(uniqueOptions).some(arr => arr.length > 0) && (
              <div className="text-center py-10">
                <p className="text-muted text-sm">No hay filtros disponibles para los productos actuales.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-app bg-surface-2/50 sm:rounded-b-3xl flex gap-3">
            <button
              onClick={handleClearAll}
              disabled={countActiveLocalFilters === 0}
              className="flex-1 h-12 rounded-xl bg-surface border border-app text-app font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50"
            >
              <Trash2 size={16} /> Limpiar
            </button>
            <button
              onClick={handleApply}
              className="flex-[2] h-12 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center transition-all hover:opacity-90 active:scale-95 shadow-md"
            >
              Ver {countActiveLocalFilters > 0 ? `Resultados (${countActiveLocalFilters})` : 'Resultados'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
