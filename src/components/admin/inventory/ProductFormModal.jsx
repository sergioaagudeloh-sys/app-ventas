import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Image as ImageIcon, ChevronDown, Check } from 'lucide-react'
import { productSchema } from '../../../schemas/inventorySchemas'
import { PRODUCT_GENDERS } from '../../../constants'
import { useCategories } from '../../../hooks/useInventory'
import useAppConfigStore from '../../../store/appConfigStore'

const COMMON_TALLAS = ['Única', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '35', '36', '37', '38', '39', '40', '41', '42']
const COMMON_COLORES = ['Negro', 'Blanco', 'Gris', 'Azul', 'Rojo', 'Verde', 'Amarillo', 'Rosa', 'Beige', 'Café', 'Morado', 'Naranja']

function CustomSelect({ value, onChange, options, placeholder, emptyOption = "Ninguno" }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none flex items-center justify-between transition-colors text-sm"
      >
        <span className={value ? 'text-app truncate mr-2' : 'text-muted truncate mr-2'}>
          {value ? options.find(o => o.value === value)?.label || value : placeholder}
        </span>
        <ChevronDown size={16} className={`text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 top-full left-0 right-0 mt-2 bg-surface border border-app rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
                <button
                  type="button"
                  onClick={() => { onChange(''); setIsOpen(false) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-muted hover:bg-surface-2 transition-colors"
                >
                  {emptyOption}
                </button>
                {options?.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setIsOpen(false) }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${
                      value === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-app hover:bg-surface-2'
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
    </div>
  )
}

const initialVariant = { id: '', talla: '', color: '', stock: 0 }
const initialForm = {
  nombre: '',
  descripcion: '',
  precioBase: '',
  precioMayorista: '',
  categoriaId: '',
  imageUrl: '',
  umbralAlerta: 5,
  activo: true,
  variantes: [],
  atributos: {}
}

export default function ProductFormModal({ isOpen, onClose, onSave, initialData = null }) {
  const { data: categories = [] } = useCategories()
  const { catalogFilters } = useAppConfigStore()
  const [formData, setFormData] = useState(initialForm)
  const [errors, setErrors] = useState({})

  // Cargar datos iniciales si estamos editando
  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        ...initialData,
        precioBase: initialData.precioBase?.toString() || '',
        precioMayorista: initialData.precioMayorista?.toString() || '',
        umbralAlerta: initialData.umbralAlerta?.toString() || '5',
        atributos: initialData.atributos || {}
      })
    } else if (isOpen) {
      setFormData({ ...initialForm, variantes: [{ ...initialVariant, id: crypto.randomUUID() }] })
      setErrors({})
    }
  }, [initialData, isOpen])

  const handleAddVariant = () => {
    setFormData(prev => ({
      ...prev,
      variantes: [...prev.variantes, { ...initialVariant, id: crypto.randomUUID() }]
    }))
  }

  const handleRemoveVariant = (id) => {
    setFormData(prev => ({
      ...prev,
      variantes: prev.variantes.filter(v => v.id !== id)
    }))
  }

  const handleVariantChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      variantes: prev.variantes.map(v => 
        v.id === id ? { ...v, [field]: field === 'stock' ? Number(value) : value } : v
      )
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    let finalVariantes = formData.variantes
    if (!catalogFilters.sizes && !catalogFilters.colors) {
      finalVariantes = [{ ...formData.variantes[0], talla: '', color: '' }]
    }

    // Preparar datos para validación Zod
    const dataToValidate = {
      ...formData,
      precioBase: Number(formData.precioBase),
      precioMayorista: formData.precioMayorista ? Number(formData.precioMayorista) : undefined,
      umbralAlerta: Number(formData.umbralAlerta),
      variantes: finalVariantes
    }

    const result = productSchema.safeParse(dataToValidate)
    
    if (!result.success) {
      const fieldErrors = {}
      result.error.issues.forEach(issue => {
        const path = issue.path.join('.')
        fieldErrors[path] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    onSave(result.data)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-surface rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-app"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-app bg-surface z-10">
            <h2 className="text-xl font-bold text-app">
              {initialData ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-app transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
              
              {/* Alerta general de Errores */}
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-error p-4 rounded-xl">
                  <p className="text-error font-bold mb-2">Por favor corrige los siguientes errores:</p>
                  <ul className="list-disc pl-5 text-sm text-error space-y-1">
                    {Object.entries(errors).map(([key, msg]) => {
                      // Traducir rutas técnicas a algo amigable
                      let friendlyKey = key
                      if (key === 'nombre') friendlyKey = 'Nombre del producto'
                      if (key === 'categoriaId') friendlyKey = 'Categoría'
                      if (key === 'precioBase') friendlyKey = 'Precio Detal'
                      if (key === 'precioMayorista') friendlyKey = 'Precio Mayorista'
                      if (key === 'imageUrl') friendlyKey = 'Imagen'
                      if (key === 'umbralAlerta') friendlyKey = 'Alerta de Stock'
                      
                      if (key.startsWith('variantes.')) {
                        const parts = key.split('.')
                        friendlyKey = `Variante ${Number(parts[1]) + 1} (${parts[2] || 'general'})`
                      }
                      return <li key={key}><b>{friendlyKey}:</b> {msg}</li>
                    })}
                  </ul>
                </div>
              )}

              {/* Información Básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-app mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                    className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none"
                  />
                  {errors.nombre && <p className="text-error text-xs mt-1">{errors.nombre}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-app mb-1">Categoría *</label>
                  <CustomSelect
                    value={formData.categoriaId}
                    onChange={(val) => setFormData({...formData, categoriaId: val})}
                    options={categories.map(c => ({ value: c.id, label: c.nombre }))}
                    placeholder="Seleccione una categoría..."
                    emptyOption="Sin categoría"
                  />
                  {errors.categoriaId && <p className="text-error text-xs mt-1">{errors.categoriaId}</p>}
                </div>

                {/* Atributos Personalizados Dinámicos */}
                {catalogFilters.customAttributes?.map(attr => (
                  <div key={attr.id}>
                    <label className="block text-sm font-medium text-app mb-1">{attr.name}</label>
                    {attr.type === 'select' ? (
                      <CustomSelect
                        value={formData.atributos?.[attr.id] || ''}
                        onChange={(val) => setFormData({
                          ...formData,
                          atributos: { ...formData.atributos, [attr.id]: val }
                        })}
                        options={attr.options?.map(opt => ({ value: opt, label: opt }))}
                        placeholder="Seleccione una opción..."
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData.atributos?.[attr.id] || ''}
                        onChange={e => setFormData({
                          ...formData,
                          atributos: { ...formData.atributos, [attr.id]: e.target.value }
                        })}
                        placeholder={`Ej. ${attr.name}`}
                        className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none"
                      />
                    )}
                  </div>
                ))}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-app mb-1">URL de Imagen (No subir archivos) *</label>
                  <div className="relative">
                    <ImageIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                      placeholder="https://..."
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none text-sm"
                    />
                  </div>
                  {errors.imageUrl && <p className="text-error text-xs mt-1">{errors.imageUrl}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-app mb-1">Precio Detal (COP) *</label>
                  <input
                    type="number"
                    value={formData.precioBase}
                    onChange={e => setFormData({...formData, precioBase: e.target.value})}
                    className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none"
                  />
                  {errors.precioBase && <p className="text-error text-xs mt-1">{errors.precioBase}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-app mb-1">Precio Mayorista (Opcional)</label>
                  <input
                    type="number"
                    value={formData.precioMayorista}
                    onChange={e => setFormData({...formData, precioMayorista: e.target.value})}
                    className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Variantes e Inventario */}
              <div className="border-t border-app pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-app">
                      {(catalogFilters.sizes || catalogFilters.colors) ? 'Variantes y Stock' : 'Inventario y Stock'}
                    </h3>
                    <p className="text-xs text-muted">
                      {(catalogFilters.sizes || catalogFilters.colors) ? 'Añade combinaciones disponibles.' : 'Indica la cantidad total disponible en tienda.'}
                    </p>
                  </div>
                  {(catalogFilters.sizes || catalogFilters.colors) && (
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors"
                    >
                      <Plus size={16} /> Añadir Variante
                    </button>
                  )}
                </div>
                
                {errors.variantes && <p className="text-error text-sm mb-3">{errors.variantes}</p>}

                <div className="space-y-4">
                  {(catalogFilters.sizes || catalogFilters.colors ? formData.variantes : [formData.variantes[0]]).filter(Boolean).map((variant) => {
                    // Asegurar que si hay una talla/color existente que no esté en la lista común, se muestre como botón
                    const tallasList = Array.from(new Set([...COMMON_TALLAS, variant.talla])).filter(Boolean)
                    const coloresList = Array.from(new Set([...COMMON_COLORES, variant.color])).filter(Boolean)

                    return (
                      <div key={variant.id} className="relative bg-surface-2 p-4 rounded-2xl border border-app shadow-sm">
                        
                        {/* Botón Eliminar Variante (Absoluto arriba a la derecha) */}
                        {(catalogFilters.sizes || catalogFilters.colors) && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(variant.id)}
                            disabled={formData.variantes.length === 1}
                            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-error hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}

                        <div className="flex flex-col gap-4 pr-6">
                          {/* Botones de Talla */}
                          {catalogFilters.sizes && (
                            <div>
                              <label className="text-xs font-semibold text-app mb-2 block">Talla Seleccionada: {variant.talla || 'Ninguna'}</label>
                              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {tallasList.map(t => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => handleVariantChange(variant.id, 'talla', variant.talla === t ? '' : t)} // Permite deseleccionar
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border-2 ${
                                      variant.talla === t
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-surface text-app border-app hover:border-primary/50'
                                    }`}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Botones de Color */}
                          {catalogFilters.colors && (
                            <div>
                              <label className="text-xs font-semibold text-app mb-2 block">Color Seleccionado: {variant.color || 'Ninguno'}</label>
                              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {coloresList.map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => handleVariantChange(variant.id, 'color', variant.color === c ? '' : c)} // Permite deseleccionar
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border-2 ${
                                      variant.color === c
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-surface text-app border-app hover:border-primary/50'
                                    }`}
                                  >
                                    {c}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Input de Stock */}
                          <div>
                            <label className="text-xs font-semibold text-app mb-2 block">Cantidad Disponible (Stock) *</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="Ej: 15"
                              value={variant.stock}
                              onChange={e => handleVariantChange(variant.id, 'stock', e.target.value)}
                              className="w-full sm:w-1/2 h-11 px-4 text-sm rounded-xl border border-app bg-surface text-app focus:border-primary outline-none focus:ring-1 focus:ring-primary transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-app bg-surface z-10 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-semibold text-app bg-surface-2 hover:bg-app transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="product-form"
              className="px-6 py-2.5 rounded-xl font-semibold text-white bg-primary hover:opacity-90 active:scale-95 transition-all"
            >
              Guardar Producto
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
