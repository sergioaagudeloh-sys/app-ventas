import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { ShoppingBag, Image as ImageIcon, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import useAppConfigStore from '../../store/appConfigStore'
import { formatCurrency } from '../../utils/formatters'
import useCartStore from '../../store/cartStore'
import useGuidedStore from '../../store/guidedStore'
import SmartHint from '../../components/client/guided/SmartHint'
import QuantitySelector from '../../components/ui/QuantitySelector'
import { useProduct, useCategories } from '../../hooks/useInventory'
import { useAds } from '../../hooks/useAds'

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

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: rawProduct, isLoading: isLoadingProduct } = useProduct(id)
  const { data: allCategories = [] } = useCategories()
  const { data: ads = [] } = useAds()

  const { addItem } = useCartStore()
  const { markStepCompleted } = useGuidedStore()
  const { commercialOptimization } = useAppConfigStore()

  const { scrollY } = useScroll()
  const yParallax = useTransform(scrollY, [0, 400], [0, 100])

  const optEnabled = commercialOptimization?.enabled === true
  const advancedGalleryEnabled = optEnabled && commercialOptimization?.tools?.advancedGallery?.enabled !== false
  const visualVariationsEnabled = optEnabled && commercialOptimization?.tools?.visualVariations?.enabled !== false
  const smartTagsEnabled = optEnabled && commercialOptimization?.tools?.smartTags?.enabled !== false
  const newProductTagEnabled = smartTagsEnabled && commercialOptimization?.tools?.smartTags?.newProduct?.enabled !== false
  const bestSellerTagEnabled = smartTagsEnabled && commercialOptimization?.tools?.smartTags?.bestSeller?.enabled !== false

  // Mapear anuncio activo y categoría para el producto actual
  const product = useMemo(() => {
    if (!rawProduct) return null
    
    const matchedCat = allCategories.find(c => c.id === rawProduct.categoriaId)
    const baseProduct = {
      ...rawProduct,
      categoria: matchedCat ? matchedCat.nombre : rawProduct.categoria
    }

    const activeAds = ads.filter(ad => {
      if (!ad.active) return false
      const today = new Date().toISOString().split('T')[0]
      return today >= ad.startDate && today <= ad.endDate
    })

    const ad = activeAds.find(a => a.type === 'inventory' && a.productId === rawProduct.id)
    if (ad) {
      const discountValue = Number(ad.discountValue)
      let precioPromocional = baseProduct.precioBase
      if (ad.discountType === 'percentage') {
        precioPromocional = baseProduct.precioBase - (baseProduct.precioBase * discountValue) / 100
      } else {
        precioPromocional = baseProduct.precioBase - discountValue
      }
      precioPromocional = Math.max(0, precioPromocional)
      
      return {
        ...baseProduct,
        precioPromo: precioPromocional,
        tienePromocion: true,
        promocion: ad,
      }
    }
    return baseProduct
  }, [rawProduct, allCategories, ads])

  const isNewProduct = useMemo(() => {
    if (!product?.createdAt) return false
    const createdDate = typeof product.createdAt.toMillis === 'function' 
      ? product.createdAt.toMillis() 
      : (product.createdAt instanceof Date ? product.createdAt.getTime() : new Date(product.createdAt).getTime())
    const limitDays = commercialOptimization?.tools?.smartTags?.newProduct?.daysLimit || 7
    const diffTime = Math.abs(Date.now() - createdDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= limitDays
  }, [product?.createdAt, commercialOptimization])

  const [selectedTalla, setSelectedTalla] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)

  // Estados de galería avanzada
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [variantOverrideImage, setVariantOverrideImage] = useState(null)

  const availableVariants = useMemo(() => {
    if (!product) return []
    return (product.variantes || []).filter(v => v.stock > 0)
  }, [product])

  const tallas = useMemo(() => {
    const t = new Set(availableVariants.map(v => v.talla).filter(Boolean))
    return Array.from(t)
  }, [availableVariants])

  const colores = useMemo(() => {
    let validVariants = availableVariants
    if (selectedTalla) {
      validVariants = validVariants.filter(v => v.talla === selectedTalla)
    }
    const c = new Set(validVariants.map(v => v.color).filter(Boolean))
    return Array.from(c)
  }, [availableVariants, selectedTalla])

  useEffect(() => {
    if (product) {
      setSelectedTalla(null)
      setSelectedColor(null)
      setCantidad(1)
      setError('')
      setActiveImageIndex(0)
      setVariantOverrideImage(null)
      
      const vars = (product.variantes || []).filter(v => v.stock > 0)
      const t = Array.from(new Set(vars.map(v => v.talla).filter(Boolean)))
      const c = Array.from(new Set(vars.map(v => v.color).filter(Boolean)))
      
      if (t.length === 1) setSelectedTalla(t[0])
      if (c.length === 1) setSelectedColor(c[0])
    }
  }, [product?.id])

  const currentVariant = useMemo(() => {
    if (!product) return null
    return availableVariants.find(v => 
      (v.talla === selectedTalla || (!v.talla && !selectedTalla)) &&
      (v.color === selectedColor || (!v.color && !selectedColor))
    )
  }, [availableVariants, selectedTalla, selectedColor, product])

  // Sincronizar imagen de variante
  useEffect(() => {
    if (currentVariant?.imageUrl) {
      setVariantOverrideImage(currentVariant.imageUrl)
      setActiveImageIndex(0)
    } else {
      setVariantOverrideImage(null)
    }
  }, [currentVariant])

  // Combinación de imágenes
  const allImages = useMemo(() => {
    const list = []
    if (product?.imageUrl) list.push(product.imageUrl)
    if (product?.galeria) {
      product.galeria.forEach(url => {
        if (url && !list.includes(url)) list.push(url)
      })
    }
    return list
  }, [product])

  const activeImages = useMemo(() => {
    const list = [...allImages]
    if (variantOverrideImage && !list.includes(variantOverrideImage)) {
      list.unshift(variantOverrideImage)
    }
    return list
  }, [allImages, variantOverrideImage])

  // Calcular precio actual
  const actualPrice = useMemo(() => {
    if (!product) return 0
    if (currentVariant?.precio && Number(currentVariant.precio) > 0) {
      return Number(currentVariant.precio)
    }
    return (product.tienePromocion && product.precioPromo < product.precioBase)
      ? product.precioPromo
      : product.precioBase
  }, [currentVariant, product])

  const handleAddToCart = () => {
    setError('')
    
    if (tallas.length > 0 && !selectedTalla) {
      setError('Por favor selecciona una talla')
      return
    }
    if (colores.length > 0 && !selectedColor) {
      setError('Por favor selecciona un color')
      return
    }

    if (!currentVariant) {
      setError('Esta combinación no está disponible actualmente')
      return
    }

    const state = useCartStore.getState()
    const existingInCart = state.items.find(i => i.productId === product.id && i.variantId === currentVariant.id)
    const currentCartQty = existingInCart ? existingInCart.cantidad : 0

    if (cantidad + currentCartQty > currentVariant.stock) {
      if (currentCartQty > 0) {
        setError(`Solo puedes agregar ${currentVariant.stock - currentCartQty} más (Ya tienes ${currentCartQty} en el carrito)`)
      } else {
        setError(`Solo hay ${currentVariant.stock} unidades disponibles`)
      }
      return
    }

    addItem({
      productId: product.id,
      variantId: currentVariant.id,
      nombre: product.nombre,
      precio: actualPrice,
      talla: selectedTalla,
      color: selectedColor,
      imageUrl: currentVariant?.imageUrl || product.imageUrl,
      maxStock: currentVariant.stock,
    }, cantidad)

    markStepCompleted('add_to_cart')

    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
      navigate(-1)
    }, 1200)
  }

  if (isLoadingProduct) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted text-sm mt-4 font-bold">Cargando producto...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <p className="text-muted text-base font-bold mb-4">El producto solicitado no está disponible.</p>
        <button onClick={() => navigate('/tienda')} className="px-6 h-12 bg-primary text-white font-bold rounded-2xl">
          Volver a la tienda
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-32 relative">
      
      {/* Cabecera Flotante */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-50 bg-surface/80 backdrop-blur-md p-3 rounded-full shadow-lg border border-app hover:scale-105 active:scale-95 transition-all text-gray-800"
        aria-label="Volver"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Hero Image / Imagen del producto con Galería Avanzada */}
      <div className="relative w-full h-[45vh] bg-surface-2 overflow-hidden shrink-0">
        {activeImages.length > 0 ? (
          <>
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImageIndex + '-' + activeImages[activeImageIndex]}
                src={activeImages[activeImageIndex]}
                alt={product.nombre}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full object-cover"
                style={{ y: yParallax, viewTransitionName: 'product-image' }}
              />
            </AnimatePresence>

            {/* Pill image index counter */}
            {activeImages.length > 1 && (
              <span className="absolute top-4 right-4 bg-white/90 text-black/80 text-xs font-black px-3 py-1 rounded-full shadow-sm z-10 border border-black/10 backdrop-blur-sm">
                {activeImageIndex + 1} / {activeImages.length}
              </span>
            )}

            {/* Botones de navegación de la galería */}
            {advancedGalleryEnabled && activeImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev === 0 ? activeImages.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/60 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev === activeImages.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/60 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted">
            <ImageIcon size={48} className="opacity-50" />
          </div>
        )}
      </div>

      {/* Cuerpo de Información Solapado */}
      <div className="relative z-10 -mt-8 bg-surface rounded-t-[40px] p-8 space-y-6 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        
        {/* Metadatos Comerciales Superiores */}
        <div className="flex items-center gap-2.5 flex-wrap text-sm text-muted font-medium border-b border-app pb-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted uppercase tracking-widest font-bold mb-1">{product.categoria}</span>
            <h1 className="text-2xl font-black text-app leading-tight">{product.nombre}</h1>
          </div>

          <div className="flex items-center gap-2 w-full mt-2">
            {isNewProduct && newProductTagEnabled && (
              <span className="font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-lg text-xs">
                Nuevo
              </span>
            )}
            {product.salesCount && product.salesCount > 0 && bestSellerTagEnabled && (
              <span className="font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg text-xs">
                +{product.salesCount} vendidos
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <span className="font-bold text-app">4.8</span>
              <span className="text-yellow-500 text-xs">★★★★★</span>
              <span className="text-xs text-muted">(12 reseñas)</span>
            </div>
          </div>
        </div>

        {/* Carrusel de Miniaturas en Galería */}
        {advancedGalleryEnabled && activeImages.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
            {activeImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                  idx === activeImageIndex ? 'border-primary scale-95 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Llama de Última Unidad */}
        {currentVariant && currentVariant.stock > 0 && currentVariant.stock <= (commercialOptimization?.tools?.smartTags?.lastUnit?.threshold || 3) && (
          <div className="flex">
            <span className="inline-flex items-center gap-1.5 bg-[#ff5a00] text-white text-xs font-black uppercase px-3 py-1.5 rounded-xl shadow-sm border border-black/10">
              🔥 {commercialOptimization?.tools?.smartTags?.lastUnit?.text || '¡ÚLTIMA UNIDAD!'}
            </span>
          </div>
        )}

        {/* Precios y Descripción */}
        <div className="space-y-4">
          <div className="space-y-1">
            {product.tienePromocion && product.precioPromo < product.precioBase && (!currentVariant?.precio || Number(currentVariant.precio) === 0) ? (
              <div>
                <span className="text-sm text-gray-400 line-through font-semibold block">
                  {formatCurrency(product.precioBase)}
                </span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-3xl font-black text-primary">
                    {formatCurrency(actualPrice)}
                  </span>
                  <span className="text-xs font-black text-green-600 bg-green-500/10 px-2 py-0.5 rounded-md">
                    {product.promocion?.discountType === 'percentage'
                      ? `${product.promocion.discountValue}% OFF`
                      : 'OFERTA'}
                  </span>
                </div>
              </div>
            ) : currentVariant?.precio && Number(currentVariant.precio) > 0 && Number(currentVariant.precio) !== product.precioBase ? (
              <div>
                <span className="text-sm text-gray-400 line-through font-semibold block">
                  {formatCurrency(product.precioBase)}
                </span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-3xl font-black text-primary">
                    {formatCurrency(actualPrice)}
                  </span>
                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                    Precio Variante
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-3xl font-black text-primary block">
                {formatCurrency(actualPrice)}
              </span>
            )}
          </div>

          {product.descripcion && (
            <div className="bg-surface-2/40 border border-app p-5 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Descripción</h4>
              <p className="text-sm text-muted leading-relaxed font-medium">
                {product.descripcion}
              </p>
            </div>
          )}
        </div>

        {/* Selección de Talla */}
        {tallas.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-app flex justify-between items-center">
              Talla <span className="text-xs font-normal text-muted">Selecciona una opción</span>
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {tallas.map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setSelectedTalla(t)
                    if (selectedColor) {
                      const hasColor = availableVariants.some(v => v.talla === t && v.color === selectedColor)
                      if (!hasColor) setSelectedColor(null)
                    }
                    setError('')
                  }}
                  className={`h-11 px-5 rounded-xl text-sm font-bold transition-all border-2 active:scale-95 ${
                    selectedTalla === t 
                      ? 'border-primary bg-primary text-white shadow-md shadow-primary/10' 
                      : 'border-app bg-transparent text-app hover:border-primary/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selección de Color */}
        {colores.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-app flex justify-between items-center">
              Color 
              <span className="text-xs font-bold text-primary">
                {selectedColor ? selectedColor.toUpperCase() : <span className="text-muted font-normal">Selecciona una opción</span>}
              </span>
            </h3>
            <div className="flex flex-wrap gap-3.5">
              {colores.map(c => {
                const cssColor = getCssColor(c)
                const isWhite = cssColor === '#FFFFFF' || cssColor.toLowerCase() === '#fff'
                const isSelected = selectedColor === c
                
                const variantForColor = availableVariants.find(v => v.color === c && (!selectedTalla || v.talla === selectedTalla))
                const variantImg = variantForColor?.imageUrl

                return (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedColor(c)
                      setError('')
                    }}
                    title={c}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-md' : 'ring-1 ring-app hover:ring-primary/50'
                    }`}
                  >
                    {visualVariationsEnabled && variantImg ? (
                      <img 
                        src={variantImg} 
                        alt={c}
                        className="w-10 h-10 rounded-full object-cover shadow-inner border border-app"
                      />
                    ) : (
                      <span 
                        className={`w-10 h-10 rounded-full shadow-inner ${isWhite ? 'border border-app' : ''}`}
                        style={{ backgroundColor: cssColor }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Estatus de stock variante */}
        {currentVariant && (
          <motion.p 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`text-sm font-bold ${
              currentVariant.stock === 0 ? 'text-error' : 'text-success'
            }`}
          >
            {currentVariant.stock === 0 ? 'Esta variante está agotada' : `${currentVariant.stock} unidades disponibles`}
          </motion.p>
        )}

        {/* Ayuda Asistente */}
        <div className="relative pt-4">
          <SmartHint 
            stepId="product_detail" 
            message="Aquí puedes ver más detalles del producto. Selecciona talla y color si aplica." 
            position="bottom" 
            delay={1000} 
          />
        </div>
      </div>

      {/* Pie de Página Fijo / Botón Añadir */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-surface/90 backdrop-blur-md border-t border-app z-50 flex flex-col gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-600 bg-red-50 p-3.5 rounded-2xl font-semibold text-center border border-red-200"
          >
            {error}
          </motion.p>
        )}
        <div className="flex gap-4 max-w-lg mx-auto w-full">
          <QuantitySelector
            value={cantidad}
            onChange={setCantidad}
            min={1}
            max={currentVariant?.stock || 10}
            className="h-14 shrink-0"
          />

          <button
            onClick={handleAddToCart}
            disabled={currentVariant?.stock === 0}
            className={`flex-1 h-14 rounded-2xl font-bold text-base transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 shadow-lg ${
              currentVariant?.stock === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-action text-white hover:opacity-95 shadow-action/25'
            }`}
          >
            {currentVariant?.stock === 0 ? (
              <span>Agotado</span>
            ) : (
              <>
                <ShoppingBag size={20} />
                <span>Agregar <span className="font-black text-white">{formatCurrency(actualPrice * cantidad)}</span></span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast de agregado al carrito */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-4 right-4 max-w-md mx-auto bg-success text-white px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3.5 z-[100] border border-success/80"
          >
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center animate-bounce shrink-0">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <p className="font-bold text-sm">Agregado al carrito exitosamente.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
