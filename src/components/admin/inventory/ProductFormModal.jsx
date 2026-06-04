import { useState, useEffect, useCallback, useRef } from 'react'
import NumberInput from '../../ui/NumberInput'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Image as ImageIcon, ChevronDown, Check, Sparkles, Camera, UploadCloud } from 'lucide-react'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { storage, db } from '../../../config/firebaseConfig'
import { productSchema } from '../../../schemas/inventorySchemas'
import { PRODUCT_GENDERS } from '../../../constants'
import { useCategories } from '../../../hooks/useInventory'
import useAppConfigStore from '../../../store/appConfigStore'
import ModalTemplate from '../../common/ModalTemplate'
import CustomSelect from '../../ui/CustomSelect'
import { getCssColor } from '../../../utils/colors'
import { uploadImage, deleteImage } from '../../../services/uploadService'
import { Loader2 } from 'lucide-react'

const initialVariant = { id: '', talla: '', color: '', genero: '', stock: 0, nombre: '', sku: '', imageUrl: '', precio: '', precioCosto: '' }
const initialForm = {
  nombre: '',
  descripcion: '',
  precioBase: '',
  precioMayorista: '',
  precioCosto: '',
  categoriaId: '',
  imageUrl: '',
  umbralAlerta: 5,
  activo: true,
  variantes: [],
  atributos: {},
  discountActive: false,
  discountType: 'percentage',
  discountValue: 0,
  galeria: [],
  varianteImages: {},
  descripcionLarga: '',
  beneficios: [],
  caracteristicas: {},
  garantiaInfo: '',
  productosRelacionados: [],
  productosComplementarios: [],
  seoTitle: '',
  seoDescription: '',
  estado: null
}

const PRESET_COLORS = [
  { name: 'Rojo', hex: '#EF4444' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Verde', hex: '#10B981' },
  { name: 'Amarillo', hex: '#F59E0B' },
  { name: 'Naranja', hex: '#F97316' },
  { name: 'Morado', hex: '#8B5CF6' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Negro', hex: '#171717' },
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Gris', hex: '#6B7280' },
  { name: 'Café', hex: '#78350F' },
  { name: 'Beige', hex: '#F5F5DC' }
]

const EXTENDED_COLORS = [
  { name: 'Rojo Pastel', hex: '#FCA5A5' },
  { name: 'Rojo Coral', hex: '#F87171' },
  { name: 'Rojo Fuerte', hex: '#EF4444' },
  { name: 'Vino Tinto', hex: '#991B1B' },
  { name: 'Naranja Suave', hex: '#FDBA74' },
  { name: 'Naranja', hex: '#F97316' },
  { name: 'Amarillo Pastel', hex: '#FDE047' },
  { name: 'Amarillo Oro', hex: '#EAB308' },
  { name: 'Verde Menta', hex: '#86EFAC' },
  { name: 'Verde Esmeralda', hex: '#10B981' },
  { name: 'Verde Bosque', hex: '#15803D' },
  { name: 'Oliva', hex: '#84CC16' },
  { name: 'Celeste', hex: '#7DD3FC' },
  { name: 'Azul Turquesa', hex: '#06B6D4' },
  { name: 'Azul Cielo', hex: '#3B82F6' },
  { name: 'Azul Marino', hex: '#1E3A8A' },
  { name: 'Lavanda', hex: '#C084FC' },
  { name: 'Morado Real', hex: '#8B5CF6' },
  { name: 'Rosa Pastel', hex: '#FBCFE8' },
  { name: 'Rosa Chicle', hex: '#F472B6' },
  { name: 'Fucsia', hex: '#D946EF' },
  { name: 'Terracota', hex: '#C2410C' },
  { name: 'Café Madera', hex: '#78350F' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Blanco Puro', hex: '#FFFFFF' },
  { name: 'Hueso', hex: '#F9FAFB' },
  { name: 'Gris Claro', hex: '#E5E7EB' },
  { name: 'Gris Medio', hex: '#9CA3AF' },
  { name: 'Gris Oscuro', hex: '#4B5563' },
  { name: 'Negro Mate', hex: '#171717' }
]

const SIZES_CATALOG = {
  ropa: {
    hombre: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    mujer: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    infantil: ['2', '4', '6', '8', '10', '12', '14', '16']
  },
  calzado: {
    mujer: ['35', '36', '37', '38', '39', '40', '41', '42'],
    hombre: ['38', '39', '40', '41', '42', '43', '44', '45', '46'],
    infantil: ['21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34']
  }
}

const GENDERS = ['Hombre', 'Mujer', 'Unisex', 'Niño', 'Niña', 'Bebé', 'Mascota']

function hexToHsl(hex) {
  let c = hex.replace('#', '')
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
  }
  if (c.length !== 6) {
    return { h: 0, s: 100, l: 50 }
  }
  const r = parseInt(c.substring(0, 2), 16) / 255
  const g = parseInt(c.substring(2, 4), 16) / 255
  const b = parseInt(c.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

function hslToHex(h, s, l) {
  h /= 360
  s /= 100
  l /= 100
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export default function ProductFormModal({ isOpen, onClose, onSave, initialData = null }) {
  const { data: categories = [] } = useCategories()
  const { catalogFilters, commercialOptimization, claimsEnabled } = useAppConfigStore()
  const [formData, setFormData] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [variantFilters, setVariantFilters] = useState({})
  const [colorModalOpen, setColorModalOpen] = useState(false)
  const [activeColorVariantId, setActiveColorVariantId] = useState(null)
  const [customColorHex, setCustomColorHex] = useState('#FFFFFF')
  const [loadingVariantImages, setLoadingVariantImages] = useState({})
  const [variantUploadProgress, setVariantUploadProgress] = useState({})
  const [loadingGalleryIndex, setLoadingGalleryIndex] = useState(null)
  const [galleryProgress, setGalleryProgress] = useState(0)

  const getVariantFilter = (variantId) => {
    return variantFilters[variantId] || { category: 'ropa', group: 'hombre' }
  }

  const updateVariantFilter = (variantId, key, value) => {
    setVariantFilters(prev => ({
      ...prev,
      [variantId]: {
        ...getVariantFilter(variantId),
        [key]: value
      }
    }))
  }

  const [loadingIA, setLoadingIA] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState(null)
  const [currentDraftFilePath, setCurrentDraftFilePath] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Estados del Wizard (Solo creación)
  const [currentStep, setCurrentStep] = useState(1)
  const [showCommercialConfig, setShowCommercialConfig] = useState(false)

  // ─── Banderas de Visibilidad de Campos (basadas en Optimización Comercial) ───
  const optEnabled = commercialOptimization?.enabled === true
  const advancedGalleryEnabled = optEnabled && commercialOptimization?.tools?.advancedGallery?.enabled !== false
  const visualVariationsEnabled = optEnabled && commercialOptimization?.tools?.visualVariations?.enabled !== false
  const recommendationsEnabled = optEnabled && (
    commercialOptimization?.tools?.cartRecommendations?.enabled !== false ||
    commercialOptimization?.tools?.historyRecommendations?.enabled !== false
  )
  const seoEnabled = optEnabled
  const hasActiveVariants = formData.variantes && (formData.variantes.length > 1 || (formData.variantes[0] && (formData.variantes[0].color || formData.variantes[0].talla)))
  const showSecondaryGallery = advancedGalleryEnabled && !hasActiveVariants
  // El acordeón avanzado solo aparece si al menos uno de sus módulos está activo
  const showAdvancedSection = showSecondaryGallery || seoEnabled || !!claimsEnabled || recommendationsEnabled

  const steps = [
    { number: 1, title: 'Imagen' },
    { number: 2, title: 'Datos Básicos' },
    { number: 3, title: 'Precios' },
    { number: 4, title: 'Descuento' },
    { number: 5, title: 'Inventario' },
  ]

  const handleCleanupTemp = async (id, filePath) => {
    if (!id) return
    try {
      await deleteDoc(doc(db, "draft_products", id))
      if (filePath) {
        await deleteImage(filePath)
      }
    } catch (e) {
      console.error("Error al limpiar borrador temporal:", e)
    }
  }

  const handleClose = async () => {
    if (currentDraftId) {
      await handleCleanupTemp(currentDraftId, currentDraftFilePath)
    }
    onClose()
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoadingIA(true)
    setUploadProgress(0)

    try {
      if (currentDraftId) {
        await handleCleanupTemp(currentDraftId, currentDraftFilePath)
      }

      const draftId = `draft_${crypto.randomUUID()}`
      
      const downloadURL = await uploadImage(file, 'products_drafts', draftId, (progress) => {
        setUploadProgress(progress)
      })

      setFormData(prev => ({ ...prev, imageUrl: downloadURL }))
      setCurrentDraftId(draftId)
      setCurrentDraftFilePath(downloadURL)
      
      await setDoc(doc(db, "draft_products", draftId), {
        imageUrl: downloadURL,
        filePath: downloadURL,
        createdAt: new Date()
      })

      const docRef = doc(db, "draft_products", draftId)
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().suggestions) {
          const suggestions = docSnap.data().suggestions
          setFormData(prev => ({
            ...prev,
            nombre: suggestions.nombre || prev.nombre,
            descripcion: suggestions.descripcion || prev.descripcion,
            precioBase: suggestions.precioBase?.toString() || prev.precioBase,
            categoriaId: suggestions.categoriaId || prev.categoriaId,
            seoTitle: suggestions.seoTitle || prev.seoTitle,
            seoDescription: suggestions.seoDescription || prev.seoDescription,
          }))
          setLoadingIA(false)
          unsubscribe()
        }
      })
    } catch (err) {
      console.error(err)
      setLoadingIA(false)
    }
  }

  const handleVariantImageUpload = async (variantId, e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoadingVariantImages(prev => ({ ...prev, [variantId]: true }))
    setVariantUploadProgress(prev => ({ ...prev, [variantId]: 0 }))

    try {
      const variant = formData.variantes.find(v => v.id === variantId)
      if (variant && variant.imageUrl) {
        await deleteImage(variant.imageUrl).catch(err => console.warn('Error al borrar anterior:', err))
      }

      const downloadURL = await uploadImage(file, 'products_variants', variantId, (progress) => {
        setVariantUploadProgress(prev => ({ ...prev, [variantId]: progress }))
      })

      handleVariantChange(variantId, 'imageUrl', downloadURL)
    } catch (err) {
      console.error('[Variant Image Upload] Error:', err)
      setErrors(prev => ({ ...prev, [`variant_img_${variantId}`]: 'Error al subir imagen de variante.' }))
    } finally {
      setLoadingVariantImages(prev => ({ ...prev, [variantId]: false }))
    }
  }

  const handleGalleryImageUpload = async (index, e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoadingGalleryIndex(index)
    setGalleryProgress(0)

    try {
      const currentUrl = formData.galeria[index]
      if (currentUrl) {
        await deleteImage(currentUrl).catch(err => console.warn('Error al borrar anterior:', err))
      }

      const downloadURL = await uploadImage(file, 'products_gallery', `gallery_${index}`, (progress) => {
        setGalleryProgress(progress)
      })

      const newGal = [...formData.galeria]
      newGal[index] = downloadURL
      setFormData(prev => ({ ...prev, galeria: newGal }))
    } catch (err) {
      console.error('[Gallery Image Upload] Error:', err)
      setErrors(prev => ({ ...prev, [`gallery_img_${index}`]: 'Error al subir imagen de galería.' }))
    } finally {
      setLoadingGalleryIndex(null)
    }
  }

  // Cargar datos iniciales si estamos editando
  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        ...initialForm,
        ...initialData,
        precioBase: initialData.precioBase?.toString() || '',
        precioMayorista: initialData.precioMayorista?.toString() || '',
        precioCosto: initialData.precioCosto?.toString() || '',
        umbralAlerta: initialData.umbralAlerta?.toString() || '5',
        atributos: initialData.atributos || {},
        discountActive: initialData.discountActive || false,
        discountType: initialData.discountType || 'percentage',
        discountValue: initialData.discountValue || 0,
        galeria: initialData.galeria || [],
        varianteImages: initialData.varianteImages || {},
        descripcionLarga: initialData.descripcionLarga || '',
        beneficios: initialData.beneficios || [],
        caracteristicas: initialData.caracteristicas || {},
        garantiaInfo: initialData.garantiaInfo || '',
        productosRelacionados: initialData.productosRelacionados || [],
        productosComplementarios: initialData.productosComplementarios || [],
        seoTitle: initialData.seoTitle || '',
        seoDescription: initialData.seoDescription || '',
        estado: initialData.estado || null,
        variantes: (initialData.variantes && initialData.variantes.length > 0)
          ? initialData.variantes
          : [{ ...initialVariant, id: 'default', stock: initialData.stock || 0 }]
      })
      setCurrentStep(1)
    } else if (isOpen) {
      setFormData({ ...initialForm, variantes: [{ ...initialVariant, id: crypto.randomUUID() }] })
      setErrors({})
      setCurrentStep(1) // Empezar siempre en el paso 1 al crear
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

    if (field === 'genero') {
      let groupVal = 'hombre'
      if (value === 'Hombre') groupVal = 'hombre'
      else if (value === 'Mujer') groupVal = 'mujer'
      else if (['Niño', 'Niña', 'Bebé', 'Mascota'].includes(value)) groupVal = 'infantil'
      else if (value === 'Unisex') groupVal = 'hombre'

      updateVariantFilter(id, 'group', groupVal)
    }
  }

  const renderVariantsSection = () => {
    const hasColorFilter = catalogFilters?.colors !== false
    const hasSizeFilter = catalogFilters?.sizes !== false
    const hasVariantsEnabled = hasColorFilter || hasSizeFilter

    if (!hasVariantsEnabled) {
      const handleStockChange = (val) => {
        const cleanVal = val === '' ? 0 : Number(val)
        setFormData(prev => {
          const list = [...(prev.variantes || [])]
          if (list[0]) {
            list[0].stock = cleanVal
            list[0].id = list[0].id || 'default'
          } else {
            list[0] = { ...initialVariant, id: 'default', stock: cleanVal }
          }
          return { ...prev, variantes: list }
        })
      }

      const stockVal = formData.variantes?.[0]?.stock ?? 0

      return (
        <div className="bg-surface-2 p-5 rounded-3xl border border-app shadow-sm max-w-md mx-auto">
          <div>
            <label className="text-xs font-bold text-app mb-2 block">Cantidad Disponible en Stock *</label>
            <input
              type="number"
              min={0}
              placeholder="Ej. 10"
              value={stockVal === 0 && formData.variantes?.[0]?.stock === undefined ? '' : stockVal}
              onChange={(e) => handleStockChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full h-12 px-4 rounded-xl border border-app bg-surface text-app focus:border-primary outline-none font-bold text-base"
            />
            {errors[`variantes.0.stock`] && (
              <p className="text-error text-xs mt-1.5">{errors[`variantes.0.stock`]}</p>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-app uppercase tracking-wider">Variantes Disponibles</span>
          <button
            type="button"
            onClick={handleAddVariant}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Añadir Variante
          </button>
        </div>

        {errors.variantes && typeof errors.variantes === 'string' && (
          <p className="text-error text-xs">{errors.variantes}</p>
        )}

        <div className="space-y-3">
          {formData.variantes?.map((variant, index) => (
            <div key={variant.id || index} className="p-4 rounded-2xl border border-app bg-surface-2 space-y-3 relative group animate-in fade-in duration-200">
              <div className="absolute right-3 top-3">
                {formData.variantes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(variant.id)}
                    className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {hasColorFilter && (
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-app mb-1 block uppercase">Color Referencial *</label>
                    <div className="flex flex-wrap gap-2 items-center bg-surface p-3 rounded-xl border border-app">
                      {PRESET_COLORS.map(c => {
                        const isSelected = variant.color === c.hex || variant.color === c.name
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => handleVariantChange(variant.id, 'color', c.hex)}
                            className={`w-7 h-7 rounded-full border-2 transition-all relative flex-shrink-0 cursor-pointer ${
                              isSelected ? 'border-primary scale-110 shadow-md' : 'border-app hover:scale-105'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          >
                            {isSelected && (
                              <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-black drop-shadow">✓</span>
                            )}
                          </button>
                        )
                      })}
                      {/* Custom Color Selector Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveColorVariantId(variant.id)
                          setCustomColorHex(variant.color && variant.color.startsWith('#') ? variant.color : '#FFFFFF')
                          setColorModalOpen(true)
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-all relative flex-shrink-0 cursor-pointer flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 hover:scale-105 active:scale-95 ${
                          variant.color && !PRESET_COLORS.some(c => c.hex === variant.color) ? 'border-primary scale-110 shadow-md' : 'border-app'
                        }`}
                        title="Color personalizado"
                      >
                        <span className="text-[10px] text-white font-bold drop-shadow">+</span>
                      </button>

                      {variant.color && (
                        <div className="ml-auto flex items-center gap-1.5 bg-surface-2 px-2.5 py-1 rounded-lg border border-app text-[10px] font-bold text-app">
                          <span className="w-2.5 h-2.5 rounded-full border border-app flex-shrink-0" style={{ backgroundColor: variant.color }} />
                          <span className="uppercase">{variant.color}</span>
                        </div>
                      )}
                    </div>
                    {errors[`variantes.${index}.color`] && (
                      <p className="text-error text-[10px] mt-1">{errors[`variantes.${index}.color`]}</p>
                    )}
                  </div>
                )}

                {hasSizeFilter && (
                  <div className="col-span-2 space-y-4 bg-surface p-4 rounded-2xl border border-app shadow-sm">
                    {/* Fila 1: Género (Ocupa ancho completo) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-app uppercase tracking-wider block">
                        Género de la Variante *
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {GENDERS.map(g => {
                          const isSelected = (variant.genero || 'Unisex') === g
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => {
                                handleVariantChange(variant.id, 'genero', g)
                                if (g === 'Mascota') {
                                  handleVariantChange(variant.id, 'talla', 'Talla Única')
                                }
                              }}
                              className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-primary text-white border-primary shadow-sm'
                                  : 'bg-surface-2 text-muted border-app hover:bg-surface-2 hover:text-app'
                              }`}
                            >
                              {g}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {variant.genero !== 'Mascota' ? (
                      <>
                        {/* Fila 2: Categoría de Talla (Tipo de Producto) */}
                        <div className="pt-2 border-t border-app/40 border-dashed">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-app uppercase tracking-wider block">
                              Tipo de Producto
                            </label>
                            <div className="grid grid-cols-2 gap-1.5 bg-surface-2 p-1 rounded-xl border border-app max-w-xs">
                              {[
                                { value: 'ropa', label: 'Prenda de Ropa' },
                                { value: 'calzado', label: 'Calzado' }
                              ].map(t => {
                                const isSelected = getVariantFilter(variant.id).category === t.value
                                return (
                                  <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => updateVariantFilter(variant.id, 'category', t.value)}
                                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                                      isSelected
                                        ? 'bg-surface text-primary shadow-sm border border-app'
                                        : 'text-muted hover:text-app'
                                    }`}
                                  >
                                    {t.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Fila 3: Grid de Tallas */}
                        <div className="space-y-2 pt-3 border-t border-app/40 border-dashed">
                          <label className="text-[10px] font-bold text-app uppercase tracking-wider block">
                            Selecciona la Talla *
                          </label>
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                            {(() => {
                              const filter = getVariantFilter(variant.id)
                              const g = variant.genero || 'Unisex'
                              let derivedGroup = 'hombre'
                              if (g === 'Hombre') derivedGroup = 'hombre'
                              else if (g === 'Mujer') derivedGroup = 'mujer'
                              else if (['Niño', 'Niña', 'Bebé'].includes(g)) derivedGroup = 'infantil'
                              else if (g === 'Unisex') derivedGroup = 'hombre'

                              const sizes = [...(SIZES_CATALOG[filter.category]?.[derivedGroup] || []), 'Talla Única']
                              return sizes.map(size => {
                                const isSelected = variant.talla === size
                                return (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={() => handleVariantChange(variant.id, 'talla', size)}
                                    className={`py-2 rounded-xl border text-[11px] font-black transition-all cursor-pointer text-center ${
                                      isSelected
                                        ? 'bg-primary text-white border-primary shadow-md scale-105'
                                        : 'bg-surface-2 text-app border-app hover:bg-surface hover:text-primary'
                                    }`}
                                  >
                                    {size}
                                  </button>
                                )
                              })
                            })()}
                          </div>
                          {variant.talla && (
                            <div className="flex items-center gap-1.5 mt-2 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg text-[10px] font-bold text-primary w-fit">
                              <span>Talla Seleccionada: {variant.talla}</span>
                            </div>
                          )}
                          {errors[`variantes.${index}.talla`] && (
                            <p className="text-error text-[10px] mt-1">{errors[`variantes.${index}.talla`]}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="pt-3 border-t border-app/40 border-dashed space-y-2 text-center py-4 bg-surface-2 rounded-xl">
                        <span className="text-xs font-bold text-primary block">Mascota seleccionada</span>
                        <p className="text-[10px] text-muted max-w-xs mx-auto">
                          Se deshabilita el tipo de producto, grupo y selector de tallas. Se asigna por defecto Talla Única.
                        </p>
                        <div className="flex items-center justify-center gap-1.5 mt-2 bg-primary text-white px-3 py-1.5 rounded-xl text-xs font-black w-fit mx-auto shadow-sm">
                          <span>Talla: Talla Única</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-app mb-1 block uppercase">Stock Disponible *</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Ej. 10"
                    value={variant.stock === '' ? '' : variant.stock}
                    onChange={(e) => handleVariantChange(variant.id, 'stock', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-app bg-surface text-xs focus:border-primary outline-none font-medium text-app"
                  />
                  {errors[`variantes.${index}.stock`] && (
                    <p className="text-error text-[10px] mt-0.5">{errors[`variantes.${index}.stock`]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-app/40 border-dashed">
                <div>
                  <label className="text-[10px] font-semibold text-muted mb-1 block uppercase">SKU (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. SKU-ROJO-M"
                    value={variant.sku || ''}
                    onChange={(e) => handleVariantChange(variant.id, 'sku', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-app bg-surface text-[11px] focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted mb-1 block uppercase">Precio Propio (Opcional)</label>
                  <input
                    type="number"
                    placeholder="Usa precio base si vacío"
                    value={variant.precio || ''}
                    onChange={(e) => handleVariantChange(variant.id, 'precio', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-app bg-surface text-[11px] focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-muted block uppercase">Foto de Variante (Opcional)</label>
                  <div className="flex items-center gap-2">
                    {loadingVariantImages[variant.id] ? (
                      <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-app bg-surface-2 w-full">
                        <Loader2 size={14} className="animate-spin text-primary shrink-0" />
                        <span className="text-[10px] font-bold text-primary animate-pulse">
                          Subiendo... {variantUploadProgress[variant.id] || 0}%
                        </span>
                      </div>
                    ) : variant.imageUrl ? (
                      <div className="flex items-center gap-2 bg-surface p-1 pr-2.5 rounded-lg border border-app w-full justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img 
                            src={variant.imageUrl} 
                            alt="Variante" 
                            className="w-7 h-7 rounded object-cover border border-app shrink-0"
                          />
                          <span className="text-[9px] font-mono text-muted truncate max-w-[120px]">
                            {variant.imageUrl}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteImage(variant.imageUrl)
                            } catch (err) {
                              console.warn('Error al borrar imagen de Storage:', err)
                            }
                            handleVariantChange(variant.id, 'imageUrl', '')
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                          title="Eliminar foto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 w-full">
                        <label className="flex-1 h-9 bg-surface-2 hover:bg-surface border border-app rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-bold text-app cursor-pointer transition-colors active:scale-95 group">
                          <UploadCloud size={13} className="text-muted group-hover:text-primary transition-colors" />
                          <span>Galería</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleVariantImageUpload(variant.id, e)} 
                            className="hidden" 
                          />
                        </label>
                        <label className="flex-1 h-9 bg-surface-2 hover:bg-surface border border-app rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-bold text-app cursor-pointer transition-colors active:scale-95 group">
                          <Camera size={13} className="text-muted group-hover:text-primary transition-colors" />
                          <span>Cámara</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            onChange={(e) => handleVariantImageUpload(variant.id, e)} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  {errors[`variant_img_${variant.id}`] && (
                    <p className="text-error text-[9px] font-bold mt-0.5">{errors[`variant_img_${variant.id}`]}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Validaciones parciales por pasos para el Wizard
  const validateStep = (step) => {
    const stepErrors = {}
    
    if (step === 1) {
      if (loadingIA) {
        stepErrors.imageUrl = "Espera a que termine de procesar la imagen."
      }
    }
    
    if (step === 2) {
      if (!formData.nombre || formData.nombre.trim().length < 3) {
        stepErrors.nombre = "El nombre del producto debe tener al menos 3 caracteres."
      }
      if (!formData.categoriaId) {
        stepErrors.categoriaId = "Debes seleccionar una categoría."
      }
    }
    
    if (step === 3) {
      const pBase = Number(formData.precioBase)
      if (isNaN(pBase) || pBase <= 0) {
        stepErrors.precioBase = "El precio al detal debe ser mayor a 0."
      }
      if (formData.precioMayorista && Number(formData.precioMayorista) < 0) {
        stepErrors.precioMayorista = "El precio mayorista no puede ser negativo."
      }
      if (formData.precioCosto && Number(formData.precioCosto) < 0) {
        stepErrors.precioCosto = "El precio de costo no puede ser negativo."
      }
      const umbral = Number(formData.umbralAlerta)
      if (isNaN(umbral) || umbral < 0) {
        stepErrors.umbralAlerta = "El stock mínimo de alerta no puede ser negativo."
      }
    }
    
    if (step === 4) {
      if (formData.discountActive) {
        const val = Number(formData.discountValue || 0)
        if (val < 0) {
          stepErrors.discountValue = "El descuento no puede ser negativo."
        }
        if (formData.discountType === 'percentage' && val > 100) {
          stepErrors.discountValue = "El porcentaje de descuento no puede superar el 100%."
        }
      }
    }

    if (step === 5) {
      const hasColorFilter = catalogFilters?.colors !== false
      const hasSizeFilter = catalogFilters?.sizes !== false
      const hasVariantsEnabled = hasColorFilter || hasSizeFilter

      if (hasVariantsEnabled) {
        if (!formData.variantes || formData.variantes.length === 0) {
          stepErrors.variantes = "Debes añadir al menos una variante."
        } else {
          formData.variantes.forEach((v, index) => {
            if (hasColorFilter && (!v.color || !v.color.trim())) {
              stepErrors[`variantes.${index}.color`] = `El color es obligatorio.`
            }
            if (hasSizeFilter && (!v.talla || !v.talla.trim())) {
              stepErrors[`variantes.${index}.talla`] = `La talla es obligatoria.`
            }
            if (v.stock === '' || isNaN(Number(v.stock)) || Number(v.stock) < 0) {
              stepErrors[`variantes.${index}.stock`] = `El stock de la variante ${index + 1} no puede ser negativo.`
            }
          })
        }
      } else {
        formData.variantes.forEach((v, index) => {
          if (v.stock === '' || isNaN(Number(v.stock)) || Number(v.stock) < 0) {
            stepErrors[`variantes.${index}.stock`] = `El stock de la variante ${index + 1} no puede ser negativo.`
          }
        })
      }
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setErrors({})
      setCurrentStep(prev => Math.min(prev + 1, 5))
    }
  }

  const handlePrevStep = () => {
    setErrors({})
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    
    // Si estamos creando, realizar validación final de todos los pasos
    if (!initialData) {
      let allValid = true
      for (let s = 1; s <= 5; s++) {
        if (!validateStep(s)) {
          setCurrentStep(s)
          allValid = false
          break
        }
      }
      if (!allValid) return
    }

    const hasColorFilter = catalogFilters?.colors !== false
    const hasSizeFilter = catalogFilters?.sizes !== false
    const hasVariantsEnabled = hasColorFilter || hasSizeFilter

    let finalVariantes = []
    if (hasVariantsEnabled) {
      finalVariantes = formData.variantes.map(v => ({
        id: v.id || crypto.randomUUID(),
        talla: hasSizeFilter ? (v.talla || '') : '',
        color: hasColorFilter ? (v.color || '') : '',
        genero: v.genero || '',
        stock: v.stock === '' ? 0 : Number(v.stock),
        sku: v.sku || '',
        nombre: v.nombre || '',
        imageUrl: v.imageUrl || '',
        precio: v.precio !== '' && v.precio !== undefined && v.precio !== null ? Number(v.precio) : '',
        precioCosto: v.precioCosto !== '' && v.precioCosto !== undefined && v.precioCosto !== null ? Number(v.precioCosto) : ''
      }))
    } else {
      const mainStock = formData.variantes?.[0]?.stock ?? 0
      finalVariantes = [{
        id: 'default',
        talla: '',
        color: '',
        stock: mainStock === '' ? 0 : Number(mainStock),
        precio: ''
      }]
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
      precioCosto: formData.precioCosto ? Number(formData.precioCosto) : undefined,
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
    setCurrentDraftId(null)
    setCurrentDraftFilePath(null)
    onSave(result.data)
  }

  if (!isOpen) return null

  // RENDERIZADO DE LA BARRA DE PROGRESO DEL ASISTENTE
  const renderProgressBar = () => {
    if (initialData) return null // No mostrar en edición

    return (
      <div className="px-6 py-4 border-b border-app bg-surface/50 backdrop-blur-md">
        <div className="flex items-center justify-between max-w-lg mx-auto relative">
          {/* Línea de fondo */}
          <div className="absolute top-4 left-4 right-4 h-[2px] bg-surface-2 -translate-y-1/2 z-0" />
          {/* Línea activa */}
          <div 
            className="absolute top-4 left-4 h-[2px] bg-primary -translate-y-1/2 z-0 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
          
          {steps.map((s) => {
            const isActive = currentStep === s.number
            const isCompleted = currentStep > s.number
            return (
              <div key={s.number} className="relative z-10 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    // Permitir navegar a pasos ya completados o validar para ir uno adelante
                    if (s.number < currentStep) {
                      setCurrentStep(s.number)
                    } else if (s.number === currentStep + 1) {
                      if (validateStep(currentStep)) {
                        setCurrentStep(s.number)
                      }
                    }
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-primary text-white scale-100' 
                      : isActive 
                        ? 'bg-primary text-white ring-4 ring-primary/20 scale-110' 
                        : 'bg-surface-2 text-muted border border-app'
                  }`}
                >
                  {isCompleted ? <Check size={14} className="stroke-[3]" /> : s.number}
                </button>
                <span className={`text-[10px] mt-1.5 font-bold transition-colors duration-300 ${
                  isActive ? 'text-primary' : isCompleted ? 'text-app' : 'text-muted'
                }`}>
                  {s.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // RENDERIZADO DEL PASO ACTUAL EN MODO WIZARD (CREACIÓN)
  const renderWizardStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="text-center max-w-sm mx-auto mb-6">
              <h3 className="text-lg font-bold text-app">Imagen del Producto</h3>
              <p className="text-xs text-muted">Sube o toma una foto del producto para iniciar el registro guiado.</p>
            </div>

            <div className="space-y-4">
              {/* Controles de Carga */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    {/* Subir de Galería */}
                    <label className="flex-1 h-12 bg-surface-2 hover:bg-surface border-2 border-dashed border-app rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-app cursor-pointer transition-all active:scale-95 group">
                      <UploadCloud size={18} className="text-muted group-hover:text-primary transition-colors" />
                      <span>Galería</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                        disabled={loadingIA}
                      />
                    </label>
                    
                    {/* Tomar Foto */}
                    <label className="flex-1 h-12 bg-surface-2 hover:bg-surface border-2 border-dashed border-app rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-app cursor-pointer transition-all active:scale-95 group">
                      <Camera size={18} className="text-muted group-hover:text-primary transition-colors" />
                      <span>Cámara</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                        disabled={loadingIA}
                      />
                    </label>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted font-bold block mb-1">O INGRESA UNA URL DE RESPALDO:</span>
                    <div className="relative">
                      <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                        placeholder="https://..."
                        className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface-2 border border-app text-xs text-app focus:border-primary focus:outline-none"
                        disabled={loadingIA}
                      />
                    </div>
                  </div>
                </div>

                {/* Previsualización */}
                <div className="relative h-32 rounded-2xl border border-app bg-surface-2 overflow-hidden flex items-center justify-center">
                  {loadingIA ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <div className="relative flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <Sparkles size={14} className="text-primary absolute animate-pulse" />
                      </div>
                      <p className="text-[11px] font-extrabold text-primary animate-pulse">
                        Gemini IA Analizando Producto...
                      </p>
                      <p className="text-[9px] text-muted">
                        {uploadProgress < 100 ? `Subiendo: ${uploadProgress}%` : 'Generando sugerencias comerciales...'}
                      </p>
                    </div>
                  ) : formData.imageUrl ? (
                    <div className="w-full h-full relative group">
                      <img 
                        src={formData.imageUrl} 
                        alt="Vista previa" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (currentDraftId) {
                            await handleCleanupTemp(currentDraftId, currentDraftFilePath)
                            setCurrentDraftId(null)
                            setCurrentDraftFilePath(null)
                          }
                          setFormData({ ...formData, imageUrl: '' })
                        }}
                        className="absolute top-2 right-2 bg-black/60 text-white hover:bg-red-500 rounded-lg p-1.5 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon size={24} className="text-muted mx-auto mb-1.5 opacity-40" />
                      <p className="text-[11px] text-muted">Sin imagen cargada</p>
                    </div>
                  )}
                </div>
              </div>

              {errors.imageUrl && <p className="text-error text-xs">{errors.imageUrl}</p>}

              {showSecondaryGallery && (
                <div className="bg-surface-2 p-4 rounded-2xl border border-app mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-app uppercase tracking-wider block">Imágenes Secundarias</span>
                      <span className="text-[10px] text-muted block mt-0.5">Agrega otras fotos para el carrusel de detalle.</span>
                    </div>
                    <div className="flex gap-1.5">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all cursor-pointer active:scale-95 group">
                        <UploadCloud size={14} className="text-primary shrink-0" />
                        <span>Galería</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleGalleryImageUpload(formData.galeria?.length || 0, e)} 
                          className="hidden" 
                          disabled={loadingGalleryIndex !== null}
                        />
                      </label>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all cursor-pointer active:scale-95 group">
                        <Camera size={14} className="text-primary shrink-0" />
                        <span>Cámara</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          onChange={(e) => handleGalleryImageUpload(formData.galeria?.length || 0, e)} 
                          className="hidden" 
                          disabled={loadingGalleryIndex !== null}
                        />
                      </label>
                    </div>
                  </div>

                  {loadingGalleryIndex === (formData.galeria?.length || 0) && (
                    <div className="flex items-center justify-center gap-2 p-3 border border-app bg-surface rounded-xl animate-pulse">
                      <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                      <span className="text-xs font-bold text-primary">Subiendo nueva imagen... {galleryProgress}%</span>
                    </div>
                  )}

                  {formData.galeria && formData.galeria.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto no-scrollbar">
                      {formData.galeria.map((url, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-surface p-2.5 rounded-xl border border-app justify-between">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-10 h-10 rounded-lg bg-surface-2 overflow-hidden flex-shrink-0 border border-app flex items-center justify-center">
                              {url ? (
                                <img src={url} alt={`Secundaria ${idx+1}`} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={14} className="text-muted" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-app">Foto #{idx + 1}</span>
                              <span className="text-[9px] font-mono text-muted truncate max-w-[150px] sm:max-w-[220px]">
                                {url}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Reemplazar Foto */}
                            <label className="w-8 h-8 rounded-lg bg-surface-2 hover:bg-surface border border-app flex items-center justify-center cursor-pointer transition-colors" title="Cambiar foto">
                              <UploadCloud size={14} className="text-muted hover:text-primary" />
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => handleGalleryImageUpload(idx, e)} 
                                className="hidden" 
                                disabled={loadingGalleryIndex !== null}
                              />
                            </label>
                            {/* Eliminar Foto */}
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await deleteImage(url)
                                } catch (err) {
                                  console.warn('Error al borrar de Storage:', err)
                                }
                                const newGal = formData.galeria.filter((_, i) => i !== idx)
                                setFormData({ ...formData, galeria: newGal })
                              }}
                              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                              title="Eliminar foto"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 border border-dashed border-app rounded-xl bg-surface/50">
                      <p className="text-[11px] text-muted">Sin fotos secundarias. Solo se usará la principal.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="text-center max-w-sm mx-auto mb-4">
              <h3 className="text-lg font-bold text-app">Datos Básicos</h3>
              <p className="text-xs text-muted">Define los textos de venta y a qué categoría pertenece tu producto.</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-app">Nombre del Producto *</label>
                  {loadingIA && (
                    <span className="text-[10px] font-bold text-primary animate-pulse flex items-center gap-1">
                      <Sparkles size={10} /> IA Escribiendo...
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  placeholder={loadingIA ? "Escribiendo por IA..." : "Ej. Camisa Lino Italiana"}
                  className={`w-full h-11 px-4 rounded-xl bg-surface-2 border text-app focus:border-primary focus:outline-none transition-all ${
                    loadingIA ? 'border-primary/40 animate-pulse' : 'border-app'
                  }`}
                />
                {errors.nombre && <p className="text-error text-xs mt-1">{errors.nombre}</p>}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-app">Descripción Comercial</label>
                  {loadingIA && (
                    <span className="text-[10px] font-bold text-primary animate-pulse flex items-center gap-1">
                      <Sparkles size={10} /> IA Redactando...
                    </span>
                  )}
                </div>
                <textarea
                  value={formData.descripcion || ''}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  rows={3}
                  placeholder={loadingIA ? "Escribiendo descripción por IA..." : "Destaca los atractivos del producto..."}
                  className={`w-full p-3 rounded-xl bg-surface-2 border text-app focus:border-primary focus:outline-none resize-none transition-all ${
                    loadingIA ? 'border-primary/40 animate-pulse' : 'border-app'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-app mb-1">Categoría *</label>
                <CustomSelect
                  value={formData.categoriaId}
                  onChange={(val) => setFormData({...formData, categoriaId: val})}
                  options={categories.map(c => ({ value: c.id, label: c.nombre }))}
                  placeholder="Selecciona una categoría..."
                  emptyOption="Sin categoría"
                />
                {errors.categoriaId && <p className="text-error text-xs mt-1">{errors.categoriaId}</p>}
              </div>

              {/* Atributos personalizados */}
              {catalogFilters.customAttributes?.map(attr => (
                <div key={attr.id}>
                  <label className="block text-xs font-bold text-app mb-1">{attr.name}</label>
                  {attr.type === 'select' ? (
                    <CustomSelect
                      value={formData.atributos?.[attr.id] || ''}
                      onChange={(val) => setFormData({
                        ...formData,
                        atributos: { ...formData.atributos, [attr.id]: val }
                      })}
                      options={attr.options?.map(opt => ({ value: opt, label: opt }))}
                      placeholder="Seleccione..."
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
            </div>
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="text-center max-w-sm mx-auto mb-4">
              <h3 className="text-lg font-bold text-app">Precios y Alerta</h3>
              <p className="text-xs text-muted">Establece el costo para el público, mayoristas y el límite de inventario.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-app mb-1">Precio Detal (COP) *</label>
                <NumberInput
                  value={formData.precioBase}
                  onChange={(val) => setFormData({...formData, precioBase: val})}
                  placeholder="Ej. 85000"
                  className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none font-bold"
                />
                {errors.precioBase && <p className="text-error text-xs mt-1">{errors.precioBase}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-app mb-1">Precio Mayorista (Opcional)</label>
                <NumberInput
                  value={formData.precioMayorista}
                  onChange={(val) => setFormData({...formData, precioMayorista: val})}
                  placeholder="Ej. 70000"
                  className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-app mb-1">Precio de Costo (COP) (Opcional)</label>
                <NumberInput
                  value={formData.precioCosto}
                  onChange={(val) => setFormData({...formData, precioCosto: val})}
                  placeholder="Ej. 45000"
                  className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none font-bold"
                />
                {errors.precioCosto && <p className="text-error text-xs mt-1">{errors.precioCosto}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-app mb-1">Stock Mínimo (Alerta de Agotado) *</label>
                <NumberInput
                  min={0}
                  value={formData.umbralAlerta}
                  onChange={(val) => setFormData({...formData, umbralAlerta: val})}
                  placeholder="Ej. 3"
                  className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none"
                />
                {errors.umbralAlerta && <p className="text-error text-xs mt-1">{errors.umbralAlerta}</p>}
              </div>
            </div>
          </motion.div>
        )

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="text-center max-w-sm mx-auto mb-4">
              <h3 className="text-lg font-bold text-app">Oferta Directa</h3>
              <p className="text-xs text-muted">Aplica rebajas inmediatas para llamar la atención en el catálogo.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-2 border border-app">
                <div>
                  <p className="text-sm font-bold text-app">¿Aplicar Descuento de una vez?</p>
                  <p className="text-xs text-muted">Habilita una rebaja especial inmediata.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.discountActive}
                  onChange={(e) => setFormData({ ...formData, discountActive: e.target.checked })}
                  className="w-5 h-5 rounded text-primary focus:ring-primary border-app cursor-pointer shrink-0"
                />
              </div>

              {formData.discountActive && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-surface-2 border border-app animate-in fade-in slide-in-from-top-3 duration-200">
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
                    {errors.discountValue && <p className="text-error text-xs mt-1">{errors.discountValue}</p>}
                  </div>

                  {/* Previsualización */}
                  {Number(formData.precioBase) > 0 && (
                    <div className="sm:col-span-2 p-3 bg-surface rounded-xl border border-app text-xs font-bold flex items-center justify-between">
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
          </motion.div>
        )

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 animate-in fade-in duration-200"
          >
            <div className="text-center max-w-sm mx-auto mb-4">
              <h3 className="text-lg font-bold text-app">
                Inventario de Tienda
              </h3>
              <p className="text-xs text-muted">
                Indica las unidades disponibles en el stock general y gestiona sus variantes.
              </p>
            </div>

            {renderVariantsSection()}
          </motion.div>
        )

      default:
        return null
    }
  }

  const renderCustomColorModal = () => {
    if (!colorModalOpen) return null

    const hsl = hexToHsl(customColorHex)

    const handleHueChange = (newHue) => {
      setCustomColorHex(hslToHex(newHue, hsl.s, hsl.l))
    }

    const handleSatChange = (newSat) => {
      setCustomColorHex(hslToHex(hsl.h, newSat, hsl.l))
    }

    const handleLightChange = (newLight) => {
      setCustomColorHex(hslToHex(hsl.h, hsl.s, newLight))
    }

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setColorModalOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface border border-app rounded-3xl p-6 shadow-2xl z-10 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-app">
            <div>
              <h3 className="text-base font-bold text-app">Color Personalizado</h3>
              <p className="text-[11px] text-muted font-normal">Selecciona o introduce un código hexadecimal.</p>
            </div>
            <button
              type="button"
              onClick={() => setColorModalOpen(false)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-app transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Grid of 30 aesthetic colors */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Gama de Tonos</span>
            <div className="grid grid-cols-6 gap-2">
              {EXTENDED_COLORS.map(c => {
                const isSelected = customColorHex.toLowerCase() === c.hex.toLowerCase()
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setCustomColorHex(c.hex)}
                    className={`h-9 w-full rounded-xl border-2 transition-all relative flex-shrink-0 cursor-pointer hover:scale-105 active:scale-95 ${
                      isSelected ? 'border-primary scale-110 shadow-lg' : 'border-app'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-black drop-shadow">✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom HSL Sliders & Live Preview */}
          <div className="space-y-4 pt-2 border-t border-app/40 border-dashed">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Mezclador de Color (HSL)</span>
            
            {/* Live Preview & Hex Input Row */}
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-2xl border border-app shadow-inner flex-shrink-0 transition-colors duration-150"
                style={{ backgroundColor: customColorHex }}
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={customColorHex}
                  onChange={(e) => {
                    let val = e.target.value
                    if (!val.startsWith('#') && val.length > 0) {
                      val = '#' + val
                    }
                    setCustomColorHex(val)
                  }}
                  placeholder="#FFFFFF"
                  className="w-full h-11 px-4 rounded-xl border border-app bg-surface-2 text-xs font-mono uppercase tracking-widest text-app focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* Slider 1: Hue */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-muted">
                <span>Tono (Hue)</span>
                <span className="font-mono">{hsl.h}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={hsl.h}
                onChange={(e) => handleHueChange(Number(e.target.value))}
                className="w-full h-2.5 rounded-lg appearance-none cursor-pointer outline-none bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-purple-500 to-red-500"
              />
            </div>

            {/* Slider 2: Saturation */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-muted">
                <span>Saturación</span>
                <span className="font-mono">{hsl.s}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={hsl.s}
                onChange={(e) => handleSatChange(Number(e.target.value))}
                className="w-full h-2.5 rounded-lg appearance-none cursor-pointer outline-none"
                style={{
                  background: `linear-gradient(to right, hsl(${hsl.h}, 0%, ${hsl.l}%), hsl(${hsl.h}, 100%, ${hsl.l}%))`
                }}
              />
            </div>

            {/* Slider 3: Lightness */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-muted">
                <span>Luminosidad</span>
                <span className="font-mono">{hsl.l}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={hsl.l}
                onChange={(e) => handleLightChange(Number(e.target.value))}
                className="w-full h-2.5 rounded-lg appearance-none cursor-pointer outline-none"
                style={{
                  background: `linear-gradient(to right, #000000, hsl(${hsl.h}, ${hsl.s}%, 50%), #ffffff)`
                }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setColorModalOpen(false)}
              className="flex-1 h-11 rounded-xl bg-surface-2 text-xs font-bold text-app hover:bg-surface border border-app transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                handleVariantChange(activeColorVariantId, 'color', customColorHex)
                setColorModalOpen(false)
              }}
              className="flex-1 h-11 rounded-xl bg-primary text-xs font-bold text-white hover:bg-primary-hover shadow-sm transition-colors"
            >
              Guardar Color
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // RENDERIZADO DEL FORMULARIO CLÁSICO COMPLETO (MODO EDICIÓN)
  const renderClassicForm = () => {
    return (
      <form id="product-form" onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-200">
        {/* Alerta general de Errores */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-error p-4 rounded-xl">
            <p className="text-error font-bold mb-2">Por favor corrige los siguientes errores:</p>
            <ul className="list-disc pl-5 text-sm text-error space-y-1">
              {Object.entries(errors).map(([key, msg]) => {
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-app">Nombre *</label>
              {loadingIA && (
                <span className="text-[10px] font-bold text-primary animate-pulse flex items-center gap-1">
                  <Sparkles size={10} /> Autogenerando...
                </span>
              )}
            </div>
            <input
              type="text"
              value={formData.nombre}
              onChange={e => setFormData({...formData, nombre: e.target.value})}
              placeholder={loadingIA ? "Escribiendo por IA..." : "Nombre del producto"}
              className={`w-full h-11 px-4 rounded-xl bg-surface-2 border text-app focus:border-primary focus:outline-none transition-all ${
                loadingIA ? 'border-primary/40 animate-pulse' : 'border-app'
              }`}
            />
            {errors.nombre && <p className="text-error text-xs mt-1">{errors.nombre}</p>}
          </div>

          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-app">Descripción Comercial</label>
              {loadingIA && (
                <span className="text-[10px] font-bold text-primary animate-pulse flex items-center gap-1">
                  <Sparkles size={10} /> Autogenerando...
                </span>
              )}
            </div>
            <textarea
              value={formData.descripcion || ''}
              onChange={e => setFormData({...formData, descripcion: e.target.value})}
              rows={3}
              placeholder={loadingIA ? "Escribiendo descripción por IA..." : "Describe el producto..."}
              className={`w-full p-3 rounded-xl bg-surface-2 border text-app focus:border-primary focus:outline-none resize-none transition-all ${
                loadingIA ? 'border-primary/40 animate-pulse' : 'border-app'
              }`}
            />
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

          <div className="md:col-span-2 space-y-3">
            <label className="block text-sm font-bold text-app">Imagen del Producto *</label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <label className="flex-1 h-12 bg-surface-2 hover:bg-surface border-2 border-dashed border-app rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-app cursor-pointer transition-all active:scale-95 group">
                    <UploadCloud size={18} className="text-muted group-hover:text-primary transition-colors" />
                    <span>Subir de Galería</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                      disabled={loadingIA}
                    />
                  </label>
                  
                  <label className="flex-1 h-12 bg-surface-2 hover:bg-surface border-2 border-dashed border-app rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-app cursor-pointer transition-all active:scale-95 group">
                    <Camera size={18} className="text-muted group-hover:text-primary transition-colors" />
                    <span>Tomar Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                      disabled={loadingIA}
                    />
                  </label>
                </div>

                <div>
                  <span className="text-[10px] text-muted font-bold block mb-1">O INGRESA UNA URL DE RESPALDO:</span>
                  <div className="relative">
                    <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                      placeholder="https://..."
                      className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface-2 border border-app text-xs text-app focus:border-primary focus:outline-none"
                      disabled={loadingIA}
                    />
                  </div>
                </div>
              </div>

            </div>
            {errors.imageUrl && <p className="text-error text-xs mt-1">{errors.imageUrl}</p>}
            
            {/* Galería de imágenes secundarias (Carrusel del producto) */}
            {showSecondaryGallery && (
              <div className="bg-surface-2 p-4 rounded-2xl border border-app mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-app uppercase tracking-wider block">Galería de Imágenes Secundarias</span>
                    <span className="text-[10px] text-muted block mt-0.5">Agrega otras tomas del producto para habilitar el carrusel deslizable.</span>
                  </div>
                  <div className="flex gap-1.5">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all cursor-pointer active:scale-95 group">
                      <UploadCloud size={14} className="text-primary shrink-0" />
                      <span>Galería</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleGalleryImageUpload(formData.galeria?.length || 0, e)} 
                        className="hidden" 
                        disabled={loadingGalleryIndex !== null}
                      />
                    </label>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all cursor-pointer active:scale-95 group">
                      <Camera size={14} className="text-primary shrink-0" />
                      <span>Cámara</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={(e) => handleGalleryImageUpload(formData.galeria?.length || 0, e)} 
                        className="hidden" 
                        disabled={loadingGalleryIndex !== null}
                      />
                    </label>
                  </div>
                </div>

                {loadingGalleryIndex === (formData.galeria?.length || 0) && (
                  <div className="flex items-center justify-center gap-2 p-3 border border-app bg-surface rounded-xl animate-pulse">
                    <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                    <span className="text-xs font-bold text-primary">Subiendo nueva imagen... {galleryProgress}%</span>
                  </div>
                )}

                {formData.galeria && formData.galeria.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto no-scrollbar">
                    {formData.galeria.map((url, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-surface p-2.5 rounded-xl border border-app justify-between">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg bg-surface-2 overflow-hidden flex-shrink-0 border border-app flex items-center justify-center">
                            {url ? (
                              <img src={url} alt={`Secundaria ${idx+1}`} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={14} className="text-muted" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold text-app">Foto #{idx + 1}</span>
                            <span className="text-[9px] font-mono text-muted truncate max-w-[120px] sm:max-w-[155px]">
                              {url}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Reemplazar Foto */}
                          <label className="w-8 h-8 rounded-lg bg-surface-2 hover:bg-surface border border-app flex items-center justify-center cursor-pointer transition-colors" title="Cambiar foto">
                            <UploadCloud size={14} className="text-muted hover:text-primary" />
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleGalleryImageUpload(idx, e)} 
                              className="hidden" 
                              disabled={loadingGalleryIndex !== null}
                            />
                          </label>
                          {/* Eliminar Foto */}
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteImage(url)
                              } catch (err) {
                                console.warn('Error al borrar de Storage:', err)
                              }
                              const newGal = formData.galeria.filter((_, i) => i !== idx)
                              setFormData({ ...formData, galeria: newGal })
                            }}
                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                            title="Eliminar foto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 border border-dashed border-app rounded-xl bg-surface/50">
                    <p className="text-xs text-muted">No hay imágenes secundarias. Solo se mostrará la foto principal.</p>
                  </div>
                )}
              </div>
            )}
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
            <label className="block text-sm font-medium text-app mb-1">Precio de Costo (COP) (Opcional)</label>
            <input
              type="number"
              value={formData.precioCosto}
              onChange={e => setFormData({...formData, precioCosto: e.target.value})}
              className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:border-primary focus:outline-none"
            />
            {errors.precioCosto && <p className="text-error text-xs mt-1">{errors.precioCosto}</p>}
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

          <div className="md:col-span-2 border-t border-app pt-5 mt-2 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-2 border border-app">
              <div>
                <p className="text-sm font-bold text-app">¿Aplicar Descuento de una vez?</p>
                <p className="text-xs text-muted">Aplica una oferta directa al producto</p>
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

        <div className="border-t border-app pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-app">Inventario y Stock</h3>
            </div>
          </div>
          
          {renderVariantsSection()}
        </div>

        {/* Sección de Configuración Comercial, QR y SEO — solo visible si hay algún módulo activo */}
        {showAdvancedSection && (
          <div className="border-t border-app pt-6 mt-6">
            <button
              type="button"
              onClick={() => setShowCommercialConfig(!showCommercialConfig)}
              className="w-full flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app hover:bg-surface transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-app uppercase tracking-wider">Configuración Avanzada de Producto</span>
              </div>
              <ChevronDown size={18} className={`text-muted transition-transform ${showCommercialConfig ? 'rotate-180' : ''}`} />
            </button>

            {showCommercialConfig && (
              <div className="mt-4 p-4 rounded-2xl bg-surface-2 border border-app space-y-4 animate-in fade-in duration-200">
                {/* Visibilidad manual del producto — solo para casos excepcionales */}
                <div>
                  <label className="block text-xs font-bold text-app mb-1 uppercase tracking-wider">Visibilidad Manual del Producto</label>
                  <p className="text-[11px] text-muted mb-2">Por defecto la app lo gestiona sola: con stock → <span className="font-semibold text-success">Activo</span>, sin stock → <span className="font-semibold text-warning">Agotado</span>. Solo usa esto si quieres forzar un estado especial.</p>
                  <CustomSelect
                    value={formData.estado || ''}
                    onChange={(val) => setFormData({ ...formData, estado: val || null })}
                    options={[
                      { value: '', label: '— Automático (gestionado por stock) —' },
                      { value: 'oculto', label: '🙈 Oculto — No aparece en el catálogo público' },
                      { value: 'archivado', label: '📦 Archivado — Solo histórico, fuera de venta' },
                      { value: 'descontinuado', label: '⛔ Descontinuado — Muestra mensaje de no disponible' },
                      { value: 'eliminado', label: '🗑️ Eliminado — Conserva URL con mensaje especial' },
                    ]}
                    placeholder="— Automático (gestionado por stock) —"
                  />
                </div>

                {/* Galería de imágenes secundarias — requiere advancedGallery */}
                {showSecondaryGallery && (
                  <div>
                    <label className="block text-xs font-bold text-app mb-1.5 uppercase tracking-wider">Galería de Imágenes Secundarias (URLs separadas por comas)</label>
                    <textarea
                      rows={2}
                      value={formData.galeria?.join(', ') || ''}
                      onChange={e => setFormData({
                        ...formData,
                        galeria: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="https://ejemplo.com/img1.jpg, https://ejemplo.com/img2.jpg"
                      className="w-full p-3 rounded-xl bg-surface border border-app text-xs text-app focus:border-primary focus:outline-none resize-none"
                    />
                  </div>
                )}

                {/* Descripción larga y beneficios — requiere seoEnabled */}
                {seoEnabled && (
                  <div>
                    <label className="block text-xs font-bold text-app mb-1.5 uppercase tracking-wider">Beneficios del Producto (Uno por línea)</label>
                    <textarea
                      rows={3}
                      value={formData.beneficios?.join('\n') || ''}
                      onChange={e => setFormData({
                        ...formData,
                        beneficios: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="✓ Envío gratis hoy&#10;✓ Garantía de 12 meses&#10;✓ Devolución fácil"
                      className="w-full p-3 rounded-xl bg-surface border border-app text-xs text-app focus:border-primary focus:outline-none resize-none"
                    />
                  </div>
                )}

                {/* Garantía — requiere claimsEnabled */}
                {!!claimsEnabled && (
                  <div>
                    <label className="block text-xs font-bold text-app mb-1.5 uppercase tracking-wider">Información de Garantía y Soporte</label>
                    <input
                      type="text"
                      value={formData.garantiaInfo || ''}
                      onChange={e => setFormData({ ...formData, garantiaInfo: e.target.value })}
                      placeholder="Ej: 6 meses de garantía por defectos de fábrica"
                      className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-xs text-app focus:border-primary focus:outline-none"
                    />
                  </div>
                )}

                {/* SEO — auto-generado por Gemini, solo visible para referencia/edición manual si SEO activo */}
                {seoEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-app mb-1 uppercase tracking-wider">SEO Título
                        <span className="ml-1 text-primary font-normal normal-case">✦ Gemini</span>
                      </label>
                      <p className="text-[10px] text-muted mb-1.5">Auto-generado al subir imagen. Edita si quieres.</p>
                      <input
                        type="text"
                        value={formData.seoTitle || ''}
                        onChange={e => setFormData({ ...formData, seoTitle: e.target.value })}
                        placeholder="Auto-generado por IA al subir la foto..."
                        className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-xs text-app focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-app mb-1 uppercase tracking-wider">SEO Descripción
                        <span className="ml-1 text-primary font-normal normal-case">✦ Gemini</span>
                      </label>
                      <p className="text-[10px] text-muted mb-1.5">Auto-generado al subir imagen. Edita si quieres.</p>
                      <input
                        type="text"
                        value={formData.seoDescription || ''}
                        onChange={e => setFormData({ ...formData, seoDescription: e.target.value })}
                        placeholder="Auto-generado por IA al subir la foto..."
                        className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-xs text-app focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Relacionados y Complementarios — requiere recommendations */}
                {recommendationsEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-app mb-1.5 uppercase tracking-wider">Productos Relacionados (IDs separados por coma)</label>
                      <input
                        type="text"
                        value={formData.productosRelacionados?.join(', ') || ''}
                        onChange={e => setFormData({
                          ...formData,
                          productosRelacionados: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                        placeholder="ID1, ID2, ID3"
                        className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-xs text-app focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-app mb-1.5 uppercase tracking-wider">Productos Complementarios (IDs separados por coma)</label>
                      <input
                        type="text"
                        value={formData.productosComplementarios?.join(', ') || ''}
                        onChange={e => setFormData({
                          ...formData,
                          productosComplementarios: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                        placeholder="ID4, ID5"
                        className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-xs text-app focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </form>
    )
  }

  const modalFooterActions = (
    <div className="w-full flex justify-between items-center">
      <div className="flex-1 mr-4">
        {Object.keys(errors).length > 0 && !initialData && (
          <p className="text-red-500 text-xs font-bold leading-tight animate-pulse">
            {Object.values(errors)[0]}
          </p>
        )}
      </div>
      <div className="flex gap-3 shrink-0 font-semibold">
        {initialData ? (
          <>
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="product-form"
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md shadow-blue-600/20"
            >
              Guardar Cambios
            </button>
          </>
        ) : (
          <>
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:opacity-95 active:scale-95 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-600/20 cursor-pointer"
              >
                Guardar Producto
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      <ModalTemplate
        isOpen={isOpen}
        onClose={handleClose}
        title={initialData ? 'Editar Producto' : 'Crear Nuevo Producto'}
        subtitle={initialData ? 'Administración de Catálogo' : 'Asistente de registro rápido'}
        icon={Sparkles}
        onBack={(!initialData && currentStep > 1) ? handlePrevStep : null}
        footerActions={modalFooterActions}
      >
        {/* Barra de progreso si estamos en creación */}
        {renderProgressBar()}

        {/* Contenido del Formulario */}
        <div className="mt-4">
          {initialData ? renderClassicForm() : (
            <AnimatePresence mode="wait">
              {renderWizardStep()}
            </AnimatePresence>
          )}
        </div>

      </ModalTemplate>

      <AnimatePresence>
        {renderCustomColorModal()}
      </AnimatePresence>
    </>
  )
}
