import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import useAppConfigStore from '../../../store/appConfigStore'
import { formatCurrency } from '../../../utils/formatters'
import useCartStore from '../../../store/cartStore'
import useGuidedStore from '../../../store/guidedStore'
import SmartHint from '../guided/SmartHint'
import ModalTemplate from '../../common/ModalTemplate'
import QuantitySelector from '../../ui/QuantitySelector'

import { getCssColor } from '../../../utils/colors'

export default function ProductDetailModal({ product, isOpen, onClose }) {
  const { addItem } = useCartStore()
  const { markStepCompleted } = useGuidedStore()
  const { commercialOptimization } = useAppConfigStore()

  const optEnabled = commercialOptimization?.enabled === true
  const advancedGalleryEnabled = optEnabled && commercialOptimization?.tools?.advancedGallery?.enabled !== false
  const visualVariationsEnabled = optEnabled && commercialOptimization?.tools?.visualVariations?.enabled !== false
  const installmentsEnabled = optEnabled && commercialOptimization?.tools?.installments?.enabled !== false
  const premiumBannerEnabled = optEnabled && commercialOptimization?.tools?.premiumBanner?.enabled !== false
  const trustBadgesEnabled = optEnabled && commercialOptimization?.tools?.trustBadges?.enabled !== false
  const smartTagsEnabled = optEnabled && commercialOptimization?.tools?.smartTags?.enabled !== false
  const newProductTagEnabled = smartTagsEnabled && commercialOptimization?.tools?.smartTags?.newProduct?.enabled !== false
  const bestSellerTagEnabled = smartTagsEnabled && commercialOptimization?.tools?.smartTags?.bestSeller?.enabled !== false

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
    return product.variantes.filter(v => v.stock > 0)
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
    if (isOpen && product) {
      setSelectedTalla(null)
      setSelectedColor(null)
      setCantidad(1)
      setError('')
      setActiveImageIndex(0)
      setVariantOverrideImage(null)
      
      const vars = product.variantes.filter(v => v.stock > 0)
      const t = Array.from(new Set(vars.map(v => v.talla).filter(Boolean)))
      const c = Array.from(new Set(vars.map(v => v.color).filter(Boolean)))
      
      if (t.length === 1) setSelectedTalla(t[0])
      if (c.length === 1) setSelectedColor(c[0])
    }
  }, [isOpen, product?.id])

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
      onClose()
    }, 1200)
  }

  // Guard: no renderizar ni evaluar JSX si el producto es null
  if (!product) return null

  // Renderizado de las acciones en el sticky footer del modal
  const footerActions = (
    <div className="w-full flex flex-col gap-3">
      {error && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl font-medium text-center"
        >
          {error}
        </motion.p>
      )}
      <div className="flex gap-3">
        <QuantitySelector
          value={cantidad}
          onChange={setCantidad}
          min={1}
          max={currentVariant?.stock || 10}
          className="h-14"
        />


        <button
          onClick={handleAddToCart}
          disabled={currentVariant?.stock === 0}
          className={`flex-1 h-14 rounded-2xl font-bold text-base transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${
            currentVariant?.stock === 0
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-action text-white hover:opacity-90 shadow-lg shadow-action/20'
          }`}
        >
          {currentVariant?.stock === 0 ? (
            <span>Agotado</span>
          ) : (
            <>
              <ShoppingBag size={20} />
              Agregar {formatCurrency(actualPrice * cantidad)}
            </>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <ModalTemplate
        isOpen={isOpen}
        onClose={onClose}
        title={product.nombre}
        subtitle={product.categoria}
        icon={ShoppingBag}
        footerActions={footerActions}
      >
        {/* Metadatos Comerciales Superiores, matching Screenshot 1 */}
        {optEnabled && (
          <div className="flex items-center gap-2 flex-wrap mb-3 text-xs text-muted font-medium">
            {isNewProduct && newProductTagEnabled ? (
              <span className="font-semibold text-green-600 dark:text-green-400">
                Nuevo
              </span>
            ) : null}
            {isNewProduct && newProductTagEnabled && product.salesCount > 0 && bestSellerTagEnabled && (
              <span>|</span>
            )}
            {product.salesCount && product.salesCount > 0 && bestSellerTagEnabled ? (
              <span className="font-semibold">
                +{product.salesCount} vendidos
              </span>
            ) : null}
            
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <span className="font-bold text-app">4.8</span>
              <span className="text-yellow-500 text-[10px]">★★★★★</span>
              <span className="text-[10px] text-muted">(12)</span>
            </div>
          </div>
        )}

        {/* Imagen del producto con Galería Avanzada */}
        <div className="relative w-full h-64 sm:h-80 bg-surface-2 rounded-2xl overflow-hidden shrink-0 border border-app group">
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
                  transition={{ duration: 0.2 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Pill image index counter matching Screenshot 1 */}
              {activeImages.length > 1 && (
                <span className="absolute top-3.5 left-3.5 bg-white text-black/80 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm z-10 border border-black/10">
                  {activeImageIndex + 1} / {activeImages.length}
                </span>
              )}

              {/* Botón Izquierda */}
              {advancedGalleryEnabled && activeImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev === 0 ? activeImages.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Botón Derecha */}
              {advancedGalleryEnabled && activeImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev === activeImages.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <ChevronRight size={20} />
                </button>
              )}

              {/* Indicadores de Puntos */}
              {advancedGalleryEnabled && activeImages.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
                  {activeImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === activeImageIndex ? 'bg-white w-4' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted">
              <ImageIcon size={48} className="opacity-50 mb-2" />
            </div>
          )}
        </div>

        {/* Carrusel de Miniaturas de la Galería Avanzada */}
        {advancedGalleryEnabled && activeImages.length > 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-thin">
            {activeImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                  idx === activeImageIndex ? 'border-primary scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Badge ¡ÚLTIMA UNIDAD! con llama, matching Screenshots 1 & 4 */}
        {currentVariant && currentVariant.stock > 0 && currentVariant.stock <= (commercialOptimization?.tools?.smartTags?.lastUnit?.threshold || 3) && (
          <div className="mt-4 flex">
            <span className="inline-flex items-center gap-1.5 bg-[#ff5a00] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shadow-sm border border-black/10">
              🔥 {commercialOptimization?.tools?.smartTags?.lastUnit?.text || '¡ÚLTIMA UNIDAD!'}
            </span>
          </div>
        )}

        {/* Precios con Descuento Inline, matching Screenshots 1 & 4 */}
        <div className="mt-4">
          <div className="space-y-0.5">
            {product.tienePromocion && product.precioPromo < product.precioBase && (!currentVariant?.precio || Number(currentVariant.precio) === 0) ? (
              <div>
                <span className="text-xs text-muted line-through font-semibold block mb-0.5">
                  {formatCurrency(product.precioBase)}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-3xl font-black text-primary">
                    {formatCurrency(actualPrice)}
                  </span>
                  <span className="text-[10px] font-black text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-md">
                    {product.promocion?.discountType === 'percentage'
                      ? `${product.promocion.discountValue}% OFF`
                      : 'OFERTA'}
                  </span>
                </div>
              </div>
            ) : currentVariant?.precio && Number(currentVariant.precio) > 0 && Number(currentVariant.precio) !== product.precioBase ? (
              <div>
                <span className="text-xs text-muted line-through font-semibold block mb-0.5">
                  {formatCurrency(product.precioBase)}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-3xl font-black text-primary">
                    {formatCurrency(actualPrice)}
                  </span>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
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
            <p className="text-sm text-muted mt-4 leading-relaxed font-medium">
              {product.descripcion}
            </p>
          )}
        </div>

        {/* Selección de Talla */}
        {tallas.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-app mb-3 flex justify-between items-center">
              Talla <span className="text-xs font-normal text-muted">Selecciona una opción</span>
            </h3>
            <div className="flex flex-wrap gap-2">
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
                  className={`h-10 px-4 rounded-xl text-sm font-semibold transition-all border-2 active:scale-95 ${
                    selectedTalla === t 
                      ? 'border-primary bg-primary text-white' 
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
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-app mb-3 flex justify-between items-center">
              Color 
              <span className="text-xs font-bold text-primary">
                {selectedColor ? selectedColor.toUpperCase() : <span className="text-muted font-normal">Selecciona una opción</span>}
              </span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {colores.map(c => {
                const cssColor = getCssColor(c)
                const isWhite = cssColor === '#FFFFFF' || cssColor.toLowerCase() === '#fff'
                const isSelected = selectedColor === c
                
                // Buscar si la variante asociada a este color tiene su propia imagen
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
                      isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : 'ring-1 ring-app hover:ring-primary/50'
                    }`}
                  >
                    {visualVariationsEnabled && variantImg ? (
                      <img 
                        src={variantImg} 
                        alt={c}
                        className="w-10 h-10 rounded-full object-cover shadow-inner border border-app animate-fade-in"
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
            className={`text-sm font-semibold mt-4 ${
              currentVariant.stock === 0 ? 'text-error' : 'text-success'
            }`}
          >
            {currentVariant.stock === 0 ? 'Esta variante está agotada' : `${currentVariant.stock} unidades disponibles`}
          </motion.p>
        )}

        {/* Ayuda Asistente */}
        <div className="mt-8 mb-2 relative">
          <SmartHint 
            stepId="product_detail" 
            message="Aquí puedes ver más detalles del producto. Selecciona talla y color si aplica." 
            position="bottom" 
            delay={1000} 
          />
        </div>
      </ModalTemplate>

      {/* Toast de agregado al carrito */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-4 right-4 bg-success text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-[100] border border-success/80"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <p className="font-bold text-sm">Agregado al carrito exitosamente.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
