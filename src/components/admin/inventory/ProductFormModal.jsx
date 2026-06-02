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

const initialVariant = { id: '', talla: '', color: '', stock: 0, nombre: '', sku: '', imageUrl: '', precio: '' }
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

export default function ProductFormModal({ isOpen, onClose, onSave, initialData = null }) {
  const { data: categories = [] } = useCategories()
  const { catalogFilters, commercialOptimization, claimsEnabled } = useAppConfigStore()
  const [formData, setFormData] = useState(initialForm)
  const [errors, setErrors] = useState({})

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
  // El acordeón avanzado solo aparece si al menos uno de sus módulos está activo
  const showAdvancedSection = advancedGalleryEnabled || seoEnabled || !!claimsEnabled || recommendationsEnabled

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
        const fileRef = ref(storage, filePath)
        await deleteObject(fileRef)
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
      const storageRef = ref(storage, `products_drafts/${draftId}_${file.name}`)
      const uploadTask = uploadBytesResumable(storageRef, file)

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          setUploadProgress(progress)
        },
        (error) => {
          console.error(error)
          setLoadingIA(false)
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          setFormData(prev => ({ ...prev, imageUrl: downloadURL }))
          setCurrentDraftId(draftId)
          setCurrentDraftFilePath(storageRef.fullPath)
          
          await setDoc(doc(db, "draft_products", draftId), {
            imageUrl: downloadURL,
            filePath: storageRef.fullPath,
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
        }
      )
    } catch (err) {
      console.error(err)
      setLoadingIA(false)
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
        estado: initialData.estado || null
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
      formData.variantes.forEach((v, index) => {
        if (v.stock === '' || isNaN(Number(v.stock)) || Number(v.stock) < 0) {
          stepErrors[`variantes.${index}.stock`] = `El stock de la variante ${index + 1} no puede ser negativo.`
        }
      })
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

    // Hacemos que siempre sea una única variante por defecto para simplificar y eliminar variantes
    const mainStock = formData.variantes?.[0]?.stock ?? 0
    let finalVariantes = [{
      id: 'default',
      talla: '',
      color: '',
      stock: mainStock === '' ? 0 : Number(mainStock),
      precio: ''
    }]

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

              {/* Galería de imágenes secundarias (Carrusel) */}
              {advancedGalleryEnabled && (
                <div className="bg-surface-2 p-4 rounded-2xl border border-app mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-app uppercase tracking-wider block">Imágenes Secundarias</span>
                      <span className="text-[10px] text-muted block mt-0.5">Agrega otras fotos para el carrusel de detalle.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          galeria: [...(prev.galeria || []), '']
                        }))
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
                    >
                      <Plus size={14} /> Agregar
                    </button>
                  </div>

                  {formData.galeria && formData.galeria.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto no-scrollbar">
                      {formData.galeria.map((url, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-surface p-2.5 rounded-xl border border-app">
                          <div className="w-10 h-10 rounded-lg bg-surface-2 overflow-hidden flex-shrink-0 border border-app flex items-center justify-center">
                            {url ? (
                              <img src={url} alt={`Secundaria ${idx+1}`} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={14} className="text-muted" />
                            )}
                          </div>
                          <input
                            type="url"
                            value={url}
                            onChange={e => {
                              const newGal = [...formData.galeria]
                              newGal[idx] = e.target.value
                              setFormData({ ...formData, galeria: newGal })
                            }}
                            placeholder="https://ejemplo.com/foto-secundario.jpg"
                            className="flex-1 h-9 px-3 rounded-lg bg-surface-2 border border-app text-xs text-app focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newGal = formData.galeria.filter((_, i) => i !== idx)
                              setFormData({ ...formData, galeria: newGal })
                            }}
                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
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
            className="space-y-4"
          >
            <div className="text-center max-w-sm mx-auto mb-4">
              <h3 className="text-lg font-bold text-app">
                Inventario de Tienda
              </h3>
              <p className="text-xs text-muted">
                Indica las unidades disponibles en el stock general.
              </p>
            </div>

            <div className="space-y-4 bg-surface-2 p-5 rounded-3xl border border-app shadow-sm max-w-md mx-auto">
              <div>
                <label className="text-xs font-bold text-app mb-2 block">Cantidad Disponible en Stock *</label>
                <NumberInput
                  min={0}
                  placeholder="Ej. 10"
                  value={formData.variantes?.[0]?.stock ?? 0}
                  onChange={(val) => {
                    const cleanVal = val === '' ? 0 : Number(val)
                    setFormData(prev => {
                      const list = [...prev.variantes]
                      if (list[0]) {
                        list[0].stock = cleanVal
                      } else {
                        list[0] = { ...initialVariant, id: crypto.randomUUID(), stock: cleanVal }
                      }
                      return { ...prev, variantes: list }
                    })
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-app bg-surface text-app focus:border-primary outline-none font-bold text-base"
                />
                {errors[`variantes.0.stock`] && (
                  <p className="text-error text-xs mt-1.5">{errors[`variantes.0.stock`]}</p>
                )}
              </div>
            </div>
          </motion.div>
        )

      default:
        return null
    }
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
            {advancedGalleryEnabled && (
              <div className="bg-surface-2 p-4 rounded-2xl border border-app mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-app uppercase tracking-wider block">Galería de Imágenes Secundarias</span>
                    <span className="text-[10px] text-muted block mt-0.5">Agrega otras tomas del producto para habilitar el carrusel deslizable.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        galeria: [...(prev.galeria || []), '']
                      }))
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
                  >
                    <Plus size={14} /> Agregar Imagen
                  </button>
                </div>

                {formData.galeria && formData.galeria.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto no-scrollbar">
                    {formData.galeria.map((url, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-surface p-2.5 rounded-xl border border-app">
                        <div className="w-12 h-12 rounded-lg bg-surface-2 overflow-hidden flex-shrink-0 border border-app flex items-center justify-center">
                          {url ? (
                            <img src={url} alt={`Secundaria ${idx+1}`} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={16} className="text-muted" />
                          )}
                        </div>
                        <input
                          type="url"
                          value={url}
                          onChange={e => {
                            const newGal = [...formData.galeria]
                            newGal[idx] = e.target.value
                            setFormData({ ...formData, galeria: newGal })
                          }}
                          placeholder="https://ejemplo.com/foto-secundario.jpg"
                          className="flex-1 h-9 px-3 rounded-lg bg-surface-2 border border-app text-xs text-app focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newGal = formData.galeria.filter((_, i) => i !== idx)
                            setFormData({ ...formData, galeria: newGal })
                          }}
                          className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
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
          
          <div className="bg-surface-2 p-4 rounded-2xl border border-app shadow-sm">
            <div>
              <label className="text-xs font-semibold text-app mb-2 block">Cantidad Disponible (Stock) *</label>
              <input
                type="number"
                min="0"
                placeholder="Ej: 15"
                value={formData.variantes?.[0]?.stock ?? 0}
                onChange={e => {
                  const val = e.target.value === '' ? 0 : Number(e.target.value)
                  setFormData(prev => {
                    const list = [...prev.variantes]
                    if (list[0]) {
                      list[0].stock = val
                    } else {
                      list[0] = { ...initialVariant, id: 'default', stock: val }
                    }
                    return { ...prev, variantes: list }
                  })
                }}
                className="w-full h-11 px-4 text-sm rounded-xl border border-app bg-surface text-app focus:border-primary outline-none font-bold"
              />
              {errors[`variantes.0.stock`] && (
                <p className="text-error text-xs mt-1">{errors[`variantes.0.stock`]}</p>
              )}
            </div>
          </div>
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
                {advancedGalleryEnabled && (
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
  )
}
