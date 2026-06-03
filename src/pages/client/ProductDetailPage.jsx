import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { 
  ShoppingBag, Image as ImageIcon, ChevronLeft, ChevronRight, 
  Heart, Share2, MessageSquare, Check 
} from 'lucide-react'
import BackButton from '../../components/ui/BackButton'
import useAppConfigStore from '../../store/appConfigStore'
import useAuthStore from '../../store/authStore'
import useFavoritesStore from '../../store/favoritesStore'
import { formatCurrency } from '../../utils/formatters'
import useCartStore from '../../store/cartStore'
import useGuidedStore from '../../store/guidedStore'
import SmartHint from '../../components/client/guided/SmartHint'
import QuantitySelector from '../../components/ui/QuantitySelector'
import { useProduct, useCategories } from '../../hooks/useInventory'
import { useAds } from '../../hooks/useAds'
import CheckoutModal from '../../components/client/checkout/CheckoutModal'
import { getCssColor } from '../../utils/colors'
import { openWhatsAppChat } from '../../services/whatsappService'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: rawProduct, isLoading: isLoadingProduct } = useProduct(id)
  const { data: allCategories = [] } = useCategories()
  const { data: ads = [] } = useAds()

  const { addItem } = useCartStore()
  const { markStepCompleted } = useGuidedStore()
  const { commercialOptimization, catalogFilters, appName } = useAppConfigStore()

  const { scrollY } = useScroll()
  const yParallax = useTransform(scrollY, [0, 400], [0, 100])

  const optEnabled = commercialOptimization?.enabled === true
  const advancedGalleryEnabled = optEnabled && commercialOptimization?.tools?.advancedGallery?.enabled !== false
  const visualVariationsEnabled = optEnabled && commercialOptimization?.tools?.visualVariations?.enabled !== false
  const smartTagsEnabled = optEnabled && commercialOptimization?.tools?.smartTags?.enabled !== false
  const newProductTagEnabled = smartTagsEnabled && commercialOptimization?.tools?.smartTags?.newProduct?.enabled !== false
  const bestSellerTagEnabled = smartTagsEnabled && commercialOptimization?.tools?.smartTags?.bestSeller?.enabled !== false

  const showColors = catalogFilters?.colors !== false
  const showSizes = catalogFilters?.sizes !== false

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

  const { user, role } = useAuthStore()
  const { favoriteIds, toggleFavorite } = useFavoritesStore()

  const isClientLoggedIn = role === 'client' && !!user

  const isFav = useMemo(() => {
    return product ? favoriteIds.includes(product.id) : false
  }, [product, favoriteIds])
  const userId = user?.celular || user?.uid

  const handleFavoriteClick = (e) => {
    e.stopPropagation()
    if (!userId || !isClientLoggedIn) {
      navigate('/login')
      return
    }
    toggleFavorite(userId, product.id)
  }

  const [copiedLink, setCopiedLink] = useState(false)
  const handleShare = () => {
    // Precio activo (considera promoción)
    const activePrice = product?.tienePromocion && product?.precioPromo < product?.precioBase
      ? product.precioPromo
      : product?.precioBase

    // Beneficios destacados (máx. 3)
    const benefitsText = (product?.beneficios || []).slice(0, 3)
      .map(b => `  ✅ ${b}`)
      .join('\n')

    // Línea de promo opcional
    const promoLine = product?.tienePromocion && product?.precioPromo < product?.precioBase
      ? `🔥 *¡Precio especial de oferta!* Antes: ${formatCurrency(product.precioBase)}\n`
      : ''

    const shareMessage = [
      `🛍️ *${product?.nombre || 'Mira este producto'}*`,
      ``,
      product?.descripcion ? `${product.descripcion}` : null,
      benefitsText ? `\n${benefitsText}` : null,
      ``,
      `${promoLine}💰 *Precio: ${formatCurrency(activePrice)}*`,
      ``,
      `📲 Pídelo desde nuestro portal de compra.`,
    ].filter(line => line !== null).join('\n')

    if (navigator.share) {
      navigator.share({
        title: product?.nombre || 'Comprar Producto',
        text: shareMessage
      }).catch(console.error)
    } else {
      // Fallback: copia el mensaje completo al portapapeles
      navigator.clipboard.writeText(shareMessage)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const [selectedTalla, setSelectedTalla] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const availableVariants = useMemo(() => {
    if (!product) return []
    return (product.variantes || []).filter(v => v.stock > 0)
  }, [product])

  const tallas = useMemo(() => {
    if (!showSizes) return []
    const t = new Set(availableVariants.map(v => v.talla).filter(Boolean))
    return Array.from(t)
  }, [availableVariants, showSizes])

  const colores = useMemo(() => {
    if (!showColors) return []
    let validVariants = availableVariants
    if (selectedTalla) {
      validVariants = validVariants.filter(v => v.talla === selectedTalla)
    }
    const c = new Set(validVariants.map(v => v.color).filter(Boolean))
    return Array.from(c)
  }, [availableVariants, selectedTalla, showColors])

  useEffect(() => {
    if (product) {
      setSelectedTalla(null)
      setSelectedColor(null)
      setCantidad(1)
      setError('')
      setActiveImageIndex(0)
      
      const vars = (product.variantes || []).filter(v => v.stock > 0)
      const t = showSizes ? Array.from(new Set(vars.map(v => v.talla).filter(Boolean))) : []
      const c = showColors ? Array.from(new Set(vars.map(v => v.color).filter(Boolean))) : []
      
      if (t.length > 0) setSelectedTalla(t[0])
    }
  }, [product?.id, showColors, showSizes])

  const currentVariant = useMemo(() => {
    if (!product) return null
    return availableVariants.find(v => 
      ((!showSizes || v.talla === selectedTalla) || (!v.talla && !selectedTalla)) &&
      ((!showColors || v.color === selectedColor) || (!v.color && !selectedColor))
    )
  }, [availableVariants, selectedTalla, selectedColor, product, showColors, showSizes])

  const allImages = useMemo(() => {
    const list = []

    const cleanUrl = (url) => {
      if (!url) return ''
      try {
        const decoded = decodeURIComponent(url)
        const withoutQuery = decoded.split('?')[0]
        if (withoutQuery.includes('/o/')) {
          return withoutQuery.split('/o/')[1] || withoutQuery.split('/').pop() || ''
        }
        return withoutQuery.split('/').pop() || ''
      } catch (e) {
        return url.split('?')[0].split('/').pop() || ''
      }
    }

    const hasImage = (url) => {
      const cleanTarget = cleanUrl(url)
      return list.some(u => cleanUrl(u) === cleanTarget)
    }

    if (product?.imageUrl) list.push(product.imageUrl)
    if (product?.galeria) {
      product.galeria.forEach(url => {
        if (url && !hasImage(url)) list.push(url)
      })
    }
    // Agregar imágenes secundarias de variantes para que estén disponibles en el carrusel
    if (product?.variantes) {
      product.variantes.forEach(v => {
        if (v.imageUrl && !hasImage(v.imageUrl)) {
          list.push(v.imageUrl)
        }
      })
    }
    return list
  }, [product])

  const activeImages = useMemo(() => {
    return allImages
  }, [allImages])

  // Actualizar imagen activa al cambiar de variante de color
  useEffect(() => {
    const cleanUrl = (url) => {
      if (!url) return ''
      try {
        const decoded = decodeURIComponent(url)
        const withoutQuery = decoded.split('?')[0]
        if (withoutQuery.includes('/o/')) {
          return withoutQuery.split('/o/')[1] || withoutQuery.split('/').pop() || ''
        }
        return withoutQuery.split('/').pop() || ''
      } catch (e) {
        return url.split('?')[0].split('/').pop() || ''
      }
    }

    const cleanColor = (color) => color ? color.trim().toLowerCase() : ''

    console.log('[DEBUG Detail Effect] selectedColor:', selectedColor)
    console.log('[DEBUG Detail Effect] activeImages:', activeImages.map(cleanUrl))

    if (selectedColor && product?.variantes) {
      const variantWithImg = product.variantes.find(v => cleanColor(v.color) === cleanColor(selectedColor) && v.imageUrl)
      console.log('[DEBUG Detail Effect] variantWithImg:', variantWithImg)
      if (variantWithImg?.imageUrl) {
        const targetClean = cleanUrl(variantWithImg.imageUrl)
        const idx = activeImages.findIndex(url => url && cleanUrl(url) === targetClean)
        console.log('[DEBUG Detail Effect] Found variant index:', idx)
        if (idx !== -1) {
          setActiveImageIndex(idx)
          return
        }
      }
    }

    if (currentVariant?.imageUrl) {
      const targetClean = cleanUrl(currentVariant.imageUrl)
      const idx = activeImages.findIndex(url => url && cleanUrl(url) === targetClean)
      console.log('[DEBUG Detail Effect] Found currentVariant index:', idx)
      if (idx !== -1) {
        setActiveImageIndex(idx)
      }
    } else {
      console.log('[DEBUG Detail Effect] Fallback to index 0')
      setActiveImageIndex(0)
    }
  }, [selectedColor, currentVariant, activeImages, product])

  // Autoplay para el carrusel de imágenes
  useEffect(() => {
    const imagesCount = activeImages?.length || 0
    if (imagesCount <= 1 || selectedColor) return

    const interval = setInterval(() => {
      setActiveImageIndex(prev => (prev === imagesCount - 1 ? 0 : prev + 1))
    }, 5000)

    return () => clearInterval(interval)
  }, [activeImageIndex, activeImages, selectedColor])

  const actualPrice = useMemo(() => {
    if (!product) return 0
    if (currentVariant?.precio && Number(currentVariant.precio) > 0) {
      return Number(currentVariant.precio)
    }
    return (product.tienePromocion && product.precioPromo < product.precioBase)
      ? product.precioPromo
      : product.precioBase
  }, [currentVariant, product])

  const handleAddToCart = (directCheckout = false) => {
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
      setError(`Solo hay ${currentVariant.stock} unidades disponibles`)
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

    if (directCheckout) {
      setShowCheckout(true)
    } else {
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
        navigate(-1)
      }, 1200)
    }
  }

  if (isLoadingProduct) {
    return (
      <div className="min-h-screen bg-surface p-6 space-y-6">
        <div className="flex items-center gap-4 animate-pulse pt-4">
          <div className="w-12 h-12 bg-surface-2 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-surface-2 rounded-full w-24" />
            <div className="h-5 bg-surface-2 rounded-full w-48" />
          </div>
        </div>
        <div className="w-full h-[40vh] bg-surface-2 rounded-3xl animate-pulse" />
        <div className="space-y-4 animate-pulse">
          <div className="h-16 bg-surface-2 rounded-2xl w-full" />
          <div className="h-4 bg-surface-2 rounded-full w-1/3" />
          <div className="h-20 bg-surface-2 rounded-2xl w-full" />
        </div>
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
  }  return (
    <div className="min-h-screen bg-surface pb-36 md:pb-24 relative">
      
      {/* Header Fijo */}
      <header className="fixed top-0 inset-x-0 h-16 bg-surface/80 backdrop-blur-md border-b border-app flex items-center justify-between px-4 z-50">
        <button 
          onClick={() => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1)
            } else {
              navigate('/tienda')
            }
          }}
          className="w-10 h-10 rounded-full bg-surface hover:bg-surface-2 border border-app flex items-center justify-center text-app transition-colors cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-muted uppercase tracking-widest">Detalle del Producto</span>
          <span className="text-xs font-bold text-app">{appName || 'Tienda Digital'}</span>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="max-w-5xl mx-auto pt-16 md:pt-24 px-4 md:px-6">
        
        {/* Cabecera Móvil (Oculta en Desktop) */}
        <div className="md:hidden pb-4 px-2 text-left space-y-1.5">
          <span className="text-[10px] text-muted uppercase tracking-widest font-black block leading-none">{product.categoria}</span>
          <h1 className="text-2xl font-black text-app leading-tight block">{product.nombre}</h1>
          {((isNewProduct && newProductTagEnabled) || (product.salesCount && product.salesCount > 0 && bestSellerTagEnabled)) && (
            <div className="flex items-center justify-start gap-2 pt-0.5">
              {isNewProduct && newProductTagEnabled && (
                <span className="font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider">
                  Nuevo
                </span>
              )}
              {product.salesCount && product.salesCount > 0 && bestSellerTagEnabled && (
                <span className="font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider">
                  +{product.salesCount} vendidos
                </span>
              )}
            </div>
          )}
          {/* Precios Móvil (Cabecera Alineada a la Izquierda) */}
          <div className="pt-0.5 flex flex-col items-start justify-start">
            {product.tienePromocion && product.precioPromo < product.precioBase && (!currentVariant?.precio || Number(currentVariant.precio) === 0) ? (
              <div className="space-y-0.5">
                <span className="text-xs text-gray-400 line-through font-semibold block">
                  {formatCurrency(product.precioBase)}
                </span>
                <div className="flex items-center justify-start gap-2">
                  <span className="text-2xl font-black text-primary">
                    {formatCurrency(actualPrice)}
                  </span>
                  <span className="text-[10px] font-black text-green-600 bg-green-500/10 px-2 py-0.5 rounded-md">
                    {product.promocion?.discountType === 'percentage'
                      ? `${product.promocion.discountValue}% OFF`
                      : 'OFERTA'}
                  </span>
                </div>
              </div>
            ) : currentVariant?.precio && Number(currentVariant.precio) > 0 && Number(currentVariant.precio) !== product.precioBase ? (
              <div className="space-y-0.5">
                <span className="text-xs text-gray-400 line-through font-semibold block">
                  {formatCurrency(product.precioBase)}
                </span>
                <div className="flex items-center justify-start gap-2">
                  <span className="text-2xl font-black text-primary">
                    {formatCurrency(actualPrice)}
                  </span>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    Variante
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-2xl font-black text-primary block">
                {formatCurrency(actualPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Grid de 2 Columnas: Escritorio / Móvil */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          
          {/* Columna Izquierda: Galería e Imágenes */}
          <div className="space-y-4">
            {/* Galería de Imágenes Redondeada */}
            <div className="relative w-full aspect-square bg-surface-2 rounded-2xl overflow-hidden shadow-sm shrink-0 border border-app">
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
                      className="w-full h-full object-cover rounded-2xl cursor-grab active:cursor-grabbing"
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.6}
                      onDragEnd={(e, info) => {
                        const swipeThreshold = 50
                        if (info.offset.x < -swipeThreshold) {
                          setActiveImageIndex(prev => (prev === activeImages.length - 1 ? 0 : prev + 1))
                        } else if (info.offset.x > swipeThreshold) {
                          setActiveImageIndex(prev => (prev === 0 ? activeImages.length - 1 : prev - 1))
                        }
                      }}
                    />
                  </AnimatePresence>

                  {/* Efecto viñeta por dentro de la imagen */}
                  <div className="absolute inset-0 rounded-2xl pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.12)] z-10" />

                  {/* Indicador de Disponibilidad en la esquina superior derecha de la imagen */}
                  {currentVariant && (
                    <div className="absolute top-4 left-4 z-20">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black leading-none shadow-md backdrop-blur-md ${
                        currentVariant.stock === 0 ? 'bg-red-55/95 text-red-600 border border-red-200' : 'bg-green-55/95 text-green-700 border border-green-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${currentVariant.stock === 0 ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                        {currentVariant.stock === 0 ? 'Agotado' : `${currentVariant.stock} disponibles`}
                      </span>
                    </div>
                  )}

                  {/* Floating Action Buttons on the Right, matching ProductPublicDetail */}
                  <div className="absolute right-4 top-4 flex flex-col gap-2 z-20">
                    {/* Botón Favorito */}
                    {isClientLoggedIn && (
                      <button
                        onClick={handleFavoriteClick}
                        className={`w-9 h-9 rounded-full flex items-center justify-center border border-neutral-200 dark:border-neutral-800 shadow-md transition-all cursor-pointer ${
                          isFav 
                            ? 'bg-white text-red-500' 
                            : 'bg-white text-black/60 hover:text-black'
                        }`}
                        title={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                      >
                        <Heart size={16} fill={isFav ? 'currentColor' : 'none'} className="stroke-[2.5]" />
                      </button>
                    )}

                    {/* Botón Compartir */}
                    <button
                      onClick={handleShare}
                      className="w-9 h-9 rounded-full bg-white text-black/60 hover:text-black flex items-center justify-center border border-neutral-200 dark:border-neutral-800 shadow-md transition-all cursor-pointer"
                      title="Compartir"
                    >
                      {copiedLink ? <Check size={16} className="text-success" /> : <Share2 size={16} className="stroke-[2.5]" />}
                    </button>

                    {/* Botón WhatsApp */}
                    <button
                      onClick={() => openWhatsAppChat({ message: `Hola, me interesa comprar *${product.nombre}*` })}
                      className="w-9 h-9 rounded-full bg-white text-green-600 hover:text-green-700 flex items-center justify-center border border-neutral-200 dark:border-neutral-800 shadow-md transition-all cursor-pointer"
                      title="Preguntar por WhatsApp"
                    >
                      <MessageSquare size={16} className="stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Pill image index counter */}
                  {activeImages.length > 1 && (
                    <span className="absolute bottom-4 right-4 bg-white/90 dark:bg-black/90 text-black dark:text-white text-xs font-black px-3 py-1 rounded-full shadow-sm z-10 border border-black/10 backdrop-blur-sm">
                      {activeImageIndex + 1} / {activeImages.length}
                    </span>
                  )}

                  {/* Botones de navegación de la galería */}
                  {activeImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveImageIndex((prev) => (prev === 0 ? activeImages.length - 1 : prev - 1))}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/60 transition-colors z-10 cursor-pointer border-none"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImageIndex((prev) => (prev === activeImages.length - 1 ? 0 : prev + 1))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/60 transition-colors z-10 cursor-pointer border-none"
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

            {/* Carrusel de Miniaturas en Galería */}
            {advancedGalleryEnabled && activeImages.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                {activeImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 rounded-xl overflow-hidden bg-white shrink-0 transition-all duration-200 cursor-pointer border-0 outline-none focus:outline-none ${
                      idx === activeImageIndex ? 'scale-105 shadow-md opacity-100' : 'scale-95 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Columna Derecha: Información, Selección y Compra */}
          <div className="space-y-4 px-1 md:px-0">
            
            {/* Cabecera Desktop (Alineada a la Izquierda, Oculta en Móvil) */}
            <div className="hidden md:block space-y-2">
              <span className="text-xs text-muted uppercase tracking-widest font-black block leading-none">{product.categoria}</span>
              <h1 className="text-3xl font-black text-app leading-tight block">{product.nombre}</h1>
              {((isNewProduct && newProductTagEnabled) || (product.salesCount && product.salesCount > 0 && bestSellerTagEnabled)) && (
                <div className="flex items-center gap-2 mt-2">
                  {isNewProduct && newProductTagEnabled && (
                    <span className="font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-lg text-[10px] uppercase tracking-wider">
                      Nuevo
                    </span>
                  )}
                  {product.salesCount && product.salesCount > 0 && bestSellerTagEnabled && (
                    <span className="font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg text-[10px] uppercase tracking-wider">
                      +{product.salesCount} vendidos
                    </span>
                  )}
                </div>
              )}
              {/* Precios Desktop (Alineado a la Izquierda) */}
              <div className="pt-1">
                {product.tienePromocion && product.precioPromo < product.precioBase && (!currentVariant?.precio || Number(currentVariant.precio) === 0) ? (
                  <div className="space-y-0.5">
                    <span className="text-xs text-gray-400 line-through font-semibold block">
                      {formatCurrency(product.precioBase)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl md:text-3xl font-black text-primary">
                        {formatCurrency(actualPrice)}
                      </span>
                      <span className="text-[10px] font-black text-green-600 bg-green-500/10 px-2 py-0.5 rounded-md">
                        {product.promocion?.discountType === 'percentage'
                          ? `${product.promocion.discountValue}% OFF`
                          : 'OFERTA'}
                      </span>
                    </div>
                  </div>
                ) : currentVariant?.precio && Number(currentVariant.precio) > 0 && Number(currentVariant.precio) !== product.precioBase ? (
                  <div className="space-y-0.5">
                    <span className="text-xs text-gray-400 line-through font-semibold block">
                      {formatCurrency(product.precioBase)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl md:text-3xl font-black text-primary">
                        {formatCurrency(actualPrice)}
                      </span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                        Variante
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-2xl md:text-3xl font-black text-primary block">
                    {formatCurrency(actualPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Selección de Color */}
            {colores.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-app flex justify-between items-center">
                  Color 
                  <span className="text-xs font-bold text-primary">
                    {selectedColor && !selectedColor.startsWith('#') ? selectedColor.toUpperCase() : (selectedColor ? '' : <span className="text-muted font-normal">Selecciona una opción</span>)}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {colores.map(c => {
                    const cssColor = getCssColor(c)
                    const isWhite = cssColor === '#FFFFFF' || cssColor.toLowerCase() === '#fff'
                    const isSelected = selectedColor === c
     
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          setSelectedColor(prev => prev === c ? null : c)
                          setError('')
                        }}
                        title={c}
                        className={`w-10 h-10 rounded-full transition-all duration-200 active:scale-90 focus:outline-none outline-none border-0 ring-0 p-0 flex items-center justify-center shadow-xs overflow-hidden cursor-pointer ${
                          isSelected ? 'scale-115 brightness-105' : 'hover:scale-105 opacity-90 hover:opacity-100'
                        } ${isWhite ? 'border border-neutral-200 dark:border-neutral-800' : ''}`}
                        style={{ 
                          backgroundColor: cssColor,
                          boxShadow: isSelected ? `0 0 14px ${cssColor}, 0 0 4px ${cssColor}` : 'none'
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Selección de Talla */}
            {tallas.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-app flex justify-between items-center">
                  Talla <span className="text-xs font-normal text-muted">
                    {selectedTalla ? `Seleccionado: ${selectedTalla}` : 'Selecciona una opción'}
                  </span>
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
                      className={`h-10 px-4.5 rounded-xl text-sm font-bold transition-all border active:scale-95 ${
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



            {/* Llama de Última Unidad */}
            {currentVariant && currentVariant.stock > 0 && currentVariant.stock <= (commercialOptimization?.tools?.smartTags?.lastUnit?.threshold || 3) && (
              <div className="flex">
                <span className="inline-flex items-center gap-1.5 bg-[#ff5a00] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-xl shadow-sm border border-black/10">
                  🔥 {commercialOptimization?.tools?.smartTags?.lastUnit?.text || '¡ÚLTIMA UNIDAD!'}
                </span>
              </div>
            )}

            {/* Descripción Minimalista */}
            {product.descripcion && (
              <div className="space-y-2 pt-4 border-t-2 border-neutral-200/60">
                <span className="text-[11px] font-black text-app uppercase tracking-wider block">Detalles del Producto</span>
                <p className="text-sm text-app/80 leading-relaxed font-medium">
                  {product.descripcion}
                </p>
              </div>
            )}

            {/* Botones de Compra y Carrito Desktop (Inline, Ocultos en Móvil) */}
            <div className="hidden md:flex flex-col gap-3 pt-6 border-t border-neutral-200/60 w-full max-w-md">
              {error && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl font-semibold text-center border border-red-200">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-4 w-full">
                <div className="shrink-0">
                  <QuantitySelector
                    value={cantidad}
                    onChange={setCantidad}
                    min={1}
                    max={currentVariant?.stock || 10}
                    size="sm"
                    className="h-11 shrink-0"
                  />
                </div>
                <div className="flex-1 flex gap-2 h-11">
                  <button
                    onClick={() => handleAddToCart(false)}
                    disabled={currentVariant?.stock === 0}
                    className={`w-14 h-full rounded-xl font-bold transition-all duration-300 active:scale-95 flex items-center justify-center border shrink-0 ${
                      currentVariant?.stock === 0
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border-app bg-surface text-app hover:bg-surface-2 shadow-xs'
                    }`}
                    title="Agregar al carrito"
                  >
                    <div className="flex items-center gap-1 justify-center text-app">
                      <ShoppingBag size={18} className="stroke-[2.5]" />
                      <span className="text-xs font-black">+</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleAddToCart(true)}
                    disabled={currentVariant?.stock === 0}
                    className={`flex-1 h-full rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center justify-center shadow-md ${
                      currentVariant?.stock === 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-action text-white hover:opacity-95 shadow-action/10'
                    }`}
                  >
                    <span>Comprar Ahora</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Ayuda Asistente */}
            <div className="relative pt-2">
              <SmartHint 
                stepId="product_detail" 
                message="Aquí puedes ver más detalles del producto. Selecciona talla y color si aplica." 
                position="bottom" 
                delay={1000} 
              />
            </div>

          </div>
        </div>
      </div>

      {/* Pie de Página Fijo / Botones de Compra y Carrito Móvil (Oculto en Desktop) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 pb-6 bg-surface/90 backdrop-blur-md border-t border-app z-40">
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl font-semibold text-center border border-red-200 mb-2"
          >
            {error}
          </motion.p>
        )}
        <div className="max-w-md mx-auto w-full flex items-end justify-between gap-3">
          {/* Contador de unidades a la izquierda */}
          <div className="shrink-0">
            <QuantitySelector
              value={cantidad}
              onChange={setCantidad}
              min={1}
              max={currentVariant?.stock || 10}
              size="sm"
              className="h-11 shrink-0"
            />
          </div>

          {/* Botones de acción a la derecha */}
          <div className="flex-1 flex gap-2 h-11">
            <button
              onClick={() => handleAddToCart(false)}
              disabled={currentVariant?.stock === 0}
              className={`w-14 h-full rounded-xl font-bold transition-all duration-300 active:scale-95 flex items-center justify-center border shrink-0 ${
                currentVariant?.stock === 0
                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'border-app bg-surface text-app hover:bg-surface-2 shadow-xs'
              }`}
              title="Agregar al carrito"
            >
              <div className="flex items-center gap-1 justify-center text-app">
                <ShoppingBag size={18} className="stroke-[2.5]" />
                <span className="text-xs font-black">+</span>
              </div>
            </button>

            <button
              onClick={() => handleAddToCart(true)}
              disabled={currentVariant?.stock === 0}
              className={`flex-1 h-full rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center justify-center shadow-md ${
                currentVariant?.stock === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-action text-white hover:opacity-95 shadow-action/10'
              }`}
            >
              <span>Comprar Ahora</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast de agregado al carrito */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-surface border border-app shadow-2xl rounded-2xl p-4 flex items-center gap-3 z-[10000]"
          >
            <div className="w-8 h-8 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center shrink-0 text-success">
              <ShoppingBag size={18} />
            </div>
            <p className="font-bold text-xs text-app mt-0.5">Agregado al carrito exitosamente.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
      />
    </div>
  )
}
