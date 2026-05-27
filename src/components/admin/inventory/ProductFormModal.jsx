import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Image as ImageIcon, ChevronDown, Check } from 'lucide-react'
import { productSchema } from '../../../schemas/inventorySchemas'
import { PRODUCT_GENDERS } from '../../../constants'
import { useCategories } from '../../../hooks/useInventory'
import useAppConfigStore from '../../../store/appConfigStore'

const COMMON_TALLAS = ['Única', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '35', '36', '37', '38', '39', '40', '41', '42']
const COMMON_COLORES = ['Negro', 'Blanco', 'Gris', 'Azul', 'Rojo', 'Verde', 'Amarillo', 'Rosa', 'Beige', 'Café', 'Morado', 'Naranja']

const COLOR_MAP = {
  'rojo': '#EF4444',
  'azul': '#3B82F6',
  'verde': '#10B981',
  'amarillo': '#EAB308',
  'naranja': '#F97316',
  'morado': '#8B5CF6',
  'rosa': '#EC4899',
  'negro': '#171717',
  'blanco': '#FFFFFF',
  'gris': '#6B7280',
  'cafe': '#78350F',
  'café': '#78350F',
  'beige': '#F5F5DC',
  'celeste': '#38BDF8',
  'vino': '#7F1D1D',
  'vinotinto': '#7F1D1D',
  'vino tinto': '#7F1D1D',
  'dorado': '#D4AF37',
  'plateado': '#C0C0C0',
  'marron': '#78350F',
  'marrón': '#78350F',
}

function getCssColor(colorName) {
  if (!colorName) return '#ccc'
  const normalized = colorName.toLowerCase().trim()
  if (COLOR_MAP[normalized]) return COLOR_MAP[normalized]
  
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  return '#' + (hash & 0x00FFFFFF).toString(16).toUpperCase().padStart(6, '0')
}

function isLightColor(colorHex) {
  const hex = colorHex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 180
}

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
  atributos: {},
  discountActive: false,
  discountType: 'percentage',
  discountValue: 0
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
        atributos: initialData.atributos || {},
        discountActive: initialData.discountActive || false,
        discountType: initialData.discountType || 'percentage',
        discountValue: initialData.discountValue || 0
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
        v.id === id ? { ...v, [field]: field === 'stock' ? (value === '' ? '' : Number(value)) : value } : v
      )
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    let finalVariantes = formData.variantes.map(v => ({
      ...v,
      stock: v.stock === '' ? 0 : Number(v.stock)
    }))

    if (!catalogFilters.sizes && !catalogFilters.colors) {
      finalVariantes = [{ ...finalVariantes[0], talla: '', color: '' }]
    }

    // Resolver nombre de categoría a partir del ID seleccionado
    const selectedCategory = categories.find(c => c.id === formData.categoriaId)
    const categoriaNombre = selectedCategory?.nombre || formData.categoria || ''

    // Preparar datos para validación Zod
    const dataToValidate = {
      ...formData,
      categoria: categoriaNombre,
      precioBase: Number(formData.precioBase),
      precioMayorista: formData.precioMayorista ? Number(formData.precioMayorista) : undefined,
      umbralAlerta: Number(formData.umbralAlerta),
      variantes: finalVariantes,
      discountActive: formData.discountActive,
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue || 0)
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

                <div>
                  <label className="block text-sm font-medium text-app mb-1">Stock Mínimo (Umbral de Alerta) *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.umbralAlerta}
                    onChange={e => setFormData({...formData, umbralAlerta: e.target.value})}
                    className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none"
                  />
                  {errors.umbralAlerta && <p className="text-error text-xs mt-1">{errors.umbralAlerta}</p>}
                </div>

                {/* ── Sección de Descuento Directo en Inventario ── */}
                <div className="md:col-span-2 border-t border-app pt-5 mt-2 space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-2 border border-app">
                    <div>
                      <p className="text-sm font-bold text-app">¿Aplicar Descuento de una vez?</p>
                      <p className="text-xs text-muted">Aplica una oferta directa al producto que se verá reflejada en el catálogo</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.discountActive}
                      onChange={(e) => setFormData({ ...formData, discountActive: e.target.checked })}
                      className="w-5 h-5 rounded text-primary focus:ring-primary border-app cursor-pointer shrink-0"
                    />
                  </div>

                  {formData.discountActive && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-surface-2 border border-app animate-in fade-in slide-in-from-top-3 duration-200">
                      <div>
                        <label className="block text-xs font-bold text-app mb-1.5">Tipo de Descuento</label>
                        <CustomSelect
                          value={formData.discountType}
                          onChange={(val) => setFormData({ ...formData, discountType: val })}
                          options={[
                            { value: 'percentage', label: 'Porcentaje (%)' },
                            { value: 'amount', label: 'Monto Fijo (COP $)' },
                          ]}
                          placeholder="Seleccione..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-app mb-1.5">Valor del Descuento</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.discountValue === 0 ? '' : formData.discountValue}
                          onChange={(e) => setFormData({ ...formData, discountValue: e.target.value === '' ? 0 : Number(e.target.value) })}
                          className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-app focus:border-primary focus:outline-none"
                        />
                      </div>

                      {/* Vista Previa del Cálculo en Tiempo Real */}
                      {Number(formData.precioBase) > 0 && (
                        <div className="md:col-span-2 p-3 bg-surface rounded-xl border border-app text-xs font-bold flex items-center justify-between">
                          <span className="text-muted">Simulación de Precio:</span>
                          <div className="flex items-center gap-2">
                            <span className="line-through text-muted font-normal">${Number(formData.precioBase).toLocaleString()}</span>
                            <span className="text-primary text-sm font-extrabold">
                              ${Math.max(0, (() => {
                                const base = Number(formData.precioBase)
                                const val = Number(formData.discountValue || 0)
                                if (formData.discountType === 'percentage') {
                                  return base - (base * val) / 100
                                }
                                return base - val
                              })()).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1.5 pt-1">
                                {coloresList.map(c => {
                                  const hex = getCssColor(c)
                                  const isLight = isLightColor(hex)
                                  const isSelected = variant.color === c
                                  return (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => handleVariantChange(variant.id, 'color', variant.color === c ? '' : c)}
                                      className={`flex-shrink-0 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all active:scale-95 border-2 flex items-center gap-1.5 shadow-sm`}
                                      style={{
                                        backgroundColor: hex,
                                        color: isLight ? 'rgba(0,0,0,0.85)' : '#ffffff',
                                        borderColor: isSelected 
                                          ? 'var(--color-primary)' 
                                          : (isLight ? 'var(--color-border)' : 'transparent'),
                                        boxShadow: isSelected ? '0 0 10px rgba(124,58,237,0.35)' : undefined
                                      }}
                                    >
                                      <span 
                                        className="w-2 h-2 rounded-full shrink-0 border"
                                        style={{ 
                                          backgroundColor: isSelected ? (isLight ? 'rgba(0,0,0,0.85)' : '#ffffff') : 'transparent',
                                          borderColor: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)'
                                        }}
                                      />
                                      {c}
                                    </button>
                                  )
                                })}
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
                              onWheel={e => e.target.blur()}
                              onKeyDown={e => {
                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                  e.preventDefault()
                                }
                              }}
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
