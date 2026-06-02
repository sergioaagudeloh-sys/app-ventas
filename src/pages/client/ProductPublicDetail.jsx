import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, ChevronRight, ShoppingBag, QrCode, Share2, Copy, Check, MessageSquare, Phone, 
  MapPin, Clock, ArrowRight, Star, AlertTriangle, EyeOff, Info, RefreshCw, Sparkles,
  Heart
} from 'lucide-react'
import { useProduct, useCategories, useProducts } from '../../hooks/useInventory'
import useCartStore from '../../store/cartStore'
import useAppConfigStore from '../../store/appConfigStore'
import useAuthStore from '../../store/authStore'
import useFavoritesStore from '../../store/favoritesStore'
import { formatCurrency } from '../../utils/formatters'
import { openWhatsAppChat } from '../../services/whatsappService'
import { trackQREvent } from '../../services/qrAnalyticsService'
import { getClientByPhone, saveClientProfile } from '../../services/userService'
import CheckoutModal from '../../components/client/checkout/CheckoutModal'
import CartDrawer from '../../components/client/cart/CartDrawer'

const DEFAULT_COLOR_MAP = {
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
  if (DEFAULT_COLOR_MAP[normalized]) return DEFAULT_COLOR_MAP[normalized]
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  return '#' + (hash & 0x00FFFFFF).toString(16).toUpperCase().padStart(6, '0')
}

export default function ProductPublicDetail() {
  const { productId } = useParams()
  const navigate = useNavigate()
  
  const { data: product, isLoading: isProductLoading, isError } = useProduct(productId)
  const { data: categories = [] } = useCategories()
  // Carga diferida: solo para productos relacionados al final de la página
  const { data: allProducts = [], isLoading: isAllProductsLoading } = useProducts(true)
  
  const { user } = useAuthStore()
  const { addItem, openCart } = useCartStore()
  const { favoriteIds, toggleFavorite } = useFavoritesStore()
  const config = useAppConfigStore()

  const isFav = useMemo(() => {
    return product ? favoriteIds.includes(product.id) : false
  }, [product, favoriteIds])
  const userId = user?.celular || user?.uid

  const handleFavoriteClick = (e) => {
    e.stopPropagation()
    if (!userId) {
      navigate('/login')
      return
    }
    toggleFavorite(userId, product.id)
  }

  // Módulos comerciales premium
  const commercialOptimization = config.commercialOptimization
  const optEnabled = commercialOptimization?.enabled === true
  const advancedGalleryEnabled = optEnabled && commercialOptimization?.tools?.advancedGallery?.enabled !== false
  const visualVariationsEnabled = optEnabled && commercialOptimization?.tools?.visualVariations?.enabled !== false
  
  const [selectedTalla, setSelectedTalla] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [showCheckout, setShowCheckout] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  
  // Registrar analíticas de escaneo al cargar la página
  useEffect(() => {
    if (productId) {
      trackQREvent(productId, 'scan')
      trackQREvent(productId, 'view')
    }
  }, [productId])

  // Lista de imágenes: Portada + Galería
  const imageGallery = useMemo(() => {
    if (!product) return []
    const list = []
    if (product.imageUrl) list.push(product.imageUrl)
    if (product.galeria && Array.isArray(product.galeria)) {
      product.galeria.forEach(url => {
        if (url && !list.includes(url)) list.push(url)
      })
    }
    return list
  }, [product])

  // Actualizar imagen activa al cambiar de variante de color
  useEffect(() => {
    if (selectedColor && product?.varianteImages?.[selectedColor]) {
      const colorImgUrl = product.varianteImages[selectedColor]
      const idx = imageGallery.indexOf(colorImgUrl)
      if (idx !== -1) {
        setActiveImageIndex(idx)
      } else {
        // Si no está en la galería, la insertamos temporalmente al principio
        setActiveImageIndex(0)
      }
    }
  }, [selectedColor, product, imageGallery])

  const [imagePreloaded, setImagePreloaded] = useState(false)

  // Resetear estados al cambiar de producto y pre-cargar imagen
  useEffect(() => {
    if (product) {
      setSelectedTalla(null)
      setSelectedColor(null)
      setCantidad(1)
      setActiveImageIndex(0)
      setErrorMsg('')
      setImagePreloaded(false)
      
      const vars = product.variantes?.filter(v => v.stock > 0) || []
      const t = Array.from(new Set(vars.map(v => v.talla).filter(Boolean)))
      const c = Array.from(new Set(vars.map(v => v.color).filter(Boolean)))
      
      if (t.length === 1) setSelectedTalla(t[0])
      if (c.length === 1) setSelectedColor(c[0])

      // Pre-cargar la imagen principal del producto
      if (product.imageUrl) {
        const img = new Image()
        img.src = product.imageUrl
        img.onload = () => {
          setImagePreloaded(true)
        }
        img.onerror = () => {
          // Si falla, permitimos la carga de todas formas
          setImagePreloaded(true)
        }
      } else {
        setImagePreloaded(true)
      }
    }
  }, [product])

  // Filtrar variantes con stock
  const availableVariants = useMemo(() => {
    if (!product || !product.variantes) return []
    return product.variantes.filter(v => (v.stock || 0) > 0)
  }, [product])

  // Tallas disponibles
  const tallas = useMemo(() => {
    const t = new Set(availableVariants.map(v => v.talla).filter(Boolean))
    return Array.from(t)
  }, [availableVariants])

  // Colores disponibles de acuerdo a la talla seleccionada
  const colores = useMemo(() => {
    let validVariants = availableVariants
    if (selectedTalla) {
      validVariants = validVariants.filter(v => v.talla === selectedTalla)
    }
    const c = new Set(validVariants.map(v => v.color).filter(Boolean))
    return Array.from(c)
  }, [availableVariants, selectedTalla])

  // Variante seleccionada actual
  const currentVariant = useMemo(() => {
    if (!product) return null
    return availableVariants.find(v => 
      (v.talla === selectedTalla || (!v.talla && !selectedTalla)) &&
      (v.color === selectedColor || (!v.color && !selectedColor))
    )
  }, [availableVariants, selectedTalla, selectedColor, product])

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

  const actualPrice = useMemo(() => {
    if (!product) return 0
    if (currentVariant?.precio && Number(currentVariant.precio) > 0) {
      return Number(currentVariant.precio)
    }
    return (product.tienePromocion && product.precioPromo < product.precioBase)
      ? product.precioPromo
      : product.precioBase
  }, [currentVariant, product])

  // Productos relacionados / complementarios
  const relatedProducts = useMemo(() => {
    if (!product) return []
    if (product.productosRelacionados?.length > 0) {
      return allProducts.filter(p => product.productosRelacionados.includes(p.id))
    }
    return allProducts
      .filter(p => p.categoriaId === product.categoriaId && p.id !== product.id)
      .slice(0, 4)
  }, [product, allProducts])

  // Resolver nombre de categoría
  const matchedCatName = useMemo(() => {
    if (!product) return ''
    const cat = categories.find(c => c.id === product.categoriaId)
    return cat ? cat.nombre : product.categoria || 'Sin Categoría'
  }, [product, categories])

  // Validaciones del Horario Comercial
  const isBusinessOpen = useMemo(() => {
    if (!config.businessHours) return true
    const { enabled, start, end } = config.businessHours
    if (!enabled) return true
    
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    
    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  }, [config.businessHours])

  const handleShare = () => {
    const shareUrl = window.location.href

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
      `📲 Compra directo aquí 👇`,
      shareUrl,
    ].filter(line => line !== null).join('\n')

    if (navigator.share) {
      navigator.share({
        title: product?.nombre || 'Comprar Producto',
        text: shareMessage,
        url: shareUrl
      }).catch(console.error)
    } else {
      // Fallback: copia el mensaje completo al portapapeles
      navigator.clipboard.writeText(shareMessage)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleAddToCart = (directCheckout = false) => {
    setErrorMsg('')
    if (tallas.length > 0 && !selectedTalla) {
      setErrorMsg('Por favor selecciona una talla')
      return
    }
    if (colores.length > 0 && !selectedColor) {
      setErrorMsg('Por favor selecciona un color')
      return
    }
    if (!currentVariant) {
      setErrorMsg('Esta combinación no está disponible actualmente')
      return
    }

    // Validar stock antes de continuar
    if (cantidad > currentVariant.stock) {
      setErrorMsg(`Solo quedan ${currentVariant.stock} unidades en stock de esta variante.`)
      return
    }

    // Validar Horario
    if (!isBusinessOpen && config.businessHours?.blockOrders) {
      setErrorMsg('La tienda está cerrada actualmente y no acepta pedidos en este momento.')
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
      maxStock: currentVariant.stock
    }, cantidad)

    trackQREvent(product.id, 'cart_add', { variantId: currentVariant.id, cantidad })

    if (directCheckout) {
      trackQREvent(product.id, 'checkout_start')
      setShowCheckout(true)
    } else {
      openCart()
    }
  }

  // Fallbacks de Estados del Producto
  const resolvedState = useMemo(() => {
    if (isError || !product) return 'eliminado'
    return product.estado || 'activo'
  }, [product, isError])

  if (isProductLoading || !product || !imagePreloaded) {
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6 text-center">
        <div className="relative w-20 h-20 flex items-center justify-center mb-6">
          {/* Círculo animado exterior con la paleta activa del negocio */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <ShoppingBag size={28} className="text-primary animate-pulse" />
        </div>
        <div className="space-y-2 max-w-xs animate-pulse">
          <h2 className="text-sm font-bold text-app uppercase tracking-widest">
            Preparando Compra
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Estamos conectando con la tienda para cargar {product?.nombre ? `"${product.nombre}"` : 'tu producto'}...
          </p>
        </div>
      </div>
    )
  }

  // Si el estado es de no disponible (oculto, archivado, descontinuado, eliminado)
  if (resolvedState !== 'activo' && resolvedState !== 'agotado') {
    const messages = {
      oculto: 'Este producto no se encuentra disponible actualmente.',
      archivado: 'Este producto ya no está a la venta.',
      descontinuado: 'Este producto ha sido descontinuado.',
      eliminado: 'Este producto ya no existe en nuestro catálogo.'
    }

    return (
      <div className="min-h-screen bg-app pb-24">
        {/* Header Fijo */}
        <header className="fixed top-0 inset-x-0 h-16 bg-surface/80 backdrop-blur-md border-b border-app flex items-center justify-between px-4 z-40">
          <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-surface hover:bg-surface-2 border border-app flex items-center justify-center text-app transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-black text-muted uppercase tracking-widest">{config.appName || 'Tienda Digital'}</span>
          <div className="w-10 h-10" />
        </header>

        <main className="max-w-md mx-auto pt-24 px-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mb-4">
            <Info size={32} />
          </div>
          <h2 className="text-xl font-black text-app uppercase tracking-wider mb-2">Producto No Disponible</h2>
          <p className="text-sm text-muted mb-8 leading-relaxed">
            {messages[resolvedState] || 'Este producto no se encuentra en exhibición.'}
            <br />
            ¡Pero mira estas alternativas recomendadas que tenemos para ti!
          </p>

          {/* Alternativas Recomendadas */}
          <div className="w-full space-y-4">
            <h3 className="text-xs font-bold text-muted text-left uppercase tracking-widest">Recomendados para ti</h3>
            <div className="grid grid-cols-2 gap-3">
              {allProducts.slice(0, 4).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => navigate(`/compra-qr/${p.id}`)}
                  className="bg-surface border border-app rounded-2xl p-2 cursor-pointer shadow-sm hover:shadow-md transition-all text-left"
                >
                  <div className="aspect-square rounded-xl bg-surface-2 overflow-hidden mb-2">
                    <img src={p.imageUrl} alt={p.nombre} className="w-full h-full object-cover" />
                  </div>
                  <p className="font-bold text-xs text-app truncate">{p.nombre}</p>
                  <p className="text-xs font-black text-primary mt-0.5">${Number(p.precioBase).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs mt-8">
            <button
              onClick={() => navigate('/tienda/catalogo')}
              className="h-12 bg-primary text-white font-bold rounded-2xl active:scale-95 transition-all shadow-md cursor-pointer border-none"
            >
              Explorar Tienda Completa
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app pb-32">
      {/* Header Fijo */}
      <header className="fixed top-0 inset-x-0 h-16 bg-surface/80 backdrop-blur-md border-b border-app flex items-center justify-between px-4 z-40">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full bg-surface hover:bg-surface-2 border border-app flex items-center justify-center text-app transition-colors cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-muted uppercase tracking-widest">Portal de Compra</span>
          <span className="text-xs font-bold text-app">{config.appName || 'Tienda Digital'}</span>
        </div>
        <button 
          onClick={handleShare}
          className="w-10 h-10 rounded-full bg-surface hover:bg-surface-2 border border-app flex items-center justify-center text-app transition-colors cursor-pointer relative"
        >
          {copiedLink ? <Check size={16} className="text-success" /> : <Share2 size={16} />}
        </button>
      </header>

      {/* Sub-Header de Ubicación/Entrega, matching Screenshots 1 & 4 */}
      <div className="fixed top-16 inset-x-0 bg-[#fff159] text-black/85 px-4 py-2 text-[11px] flex items-center gap-1.5 font-semibold z-30 shadow-xs border-b border-yellow-400/40">
        <MapPin size={13} className="text-black/60 shrink-0" />
        <span>Enviar a Calle 17 #11-51</span>
        <span className="text-[10px] text-black/40 font-bold ml-auto font-mono">›</span>
      </div>

      {/* Main Container, adjusted top padding for the fixed sub-header */}
      <main className="max-w-md mx-auto pt-28 px-4 space-y-5">
        
        {/* Ficha técnica y comercial SUPERIOR - arriba de la foto, matching Screenshots 1 & 4 */}
        <div className="space-y-2">
          {/* Metadatos Comerciales Superiores */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted font-medium">
            {isNewProduct ? (
              <span className="font-semibold text-[#333] dark:text-[#ccc]">
                Nuevo
              </span>
            ) : null}
            {isNewProduct && product.salesCount > 0 && (
              <span className="text-muted/30">|</span>
            )}
            {product.salesCount && product.salesCount > 0 ? (
              <span className="font-semibold">
                +{product.salesCount} vendidos
              </span>
            ) : null}
            
            <div className="flex items-center gap-0.5 ml-auto shrink-0 font-semibold">
              <span className="text-app">4.8</span>
              <span className="text-yellow-500 text-[10px]">★★★★★</span>
              <span className="text-[10px] text-muted font-normal">(12)</span>
            </div>
          </div>

          <h1 className="text-xl font-bold text-app leading-tight tracking-tight">{product.nombre}</h1>

          {/* Smart Badges Row matching Screenshot 1 */}
          {optEnabled && (
            <div className="flex items-center gap-2 pt-0.5 flex-wrap text-xs font-semibold">
              {product.salesCount && product.salesCount >= 5 ? (
                <span className="bg-[#ff5a00] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-sm">
                  MÁS VENDIDO
                </span>
              ) : product.tienePromocion ? (
                <span className="bg-[#2968c8] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-sm">
                  OFERTA IMPERDIBLE
                </span>
              ) : isNewProduct ? (
                <span className="bg-[#00a650] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-sm">
                  NUEVO
                </span>
              ) : null}
              
              <span className="text-primary hover:underline cursor-pointer text-xs">
                1º en {matchedCatName}
              </span>
            </div>
          )}
        </div>

        {/* Carrusel / Galería de Imágenes con Botones Flotantes matching Screenshots 1 & 4 */}
        <div className="relative w-full aspect-square bg-surface border border-app rounded-3xl overflow-hidden shadow-sm">
          {imageGallery.length > 0 ? (
            <>
              <img 
                src={imageGallery[activeImageIndex]} 
                alt={product.nombre} 
                className={`w-full h-full object-cover transition-all duration-300 ${resolvedState === 'agotado' ? 'opacity-40 grayscale' : ''}`}
              />

              {/* Pill image index counter matching Screenshot 1 (white bg pill) */}
              {imageGallery.length > 1 && (
                <span className="absolute top-3.5 left-3.5 bg-white text-black/80 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm z-10 border border-black/10">
                  {activeImageIndex + 1} / {imageGallery.length}
                </span>
              )}

              {/* Botón Izquierda de Galería */}
              {advancedGalleryEnabled && imageGallery.length > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveImageIndex(prev => (prev === 0 ? imageGallery.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-xs z-10"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              {/* Botón Derecha de Galería */}
              {advancedGalleryEnabled && imageGallery.length > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveImageIndex(prev => (prev === imageGallery.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-xs z-10"
                >
                  <ChevronRight size={18} />
                </button>
              )}

              {/* Floating Action Buttons on the Right, matching Screenshot 1 */}
              <div className="absolute right-3.5 top-3.5 flex flex-col gap-2 z-10">
                {/* Botón Favorito */}
                <button
                  onClick={handleFavoriteClick}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border border-black/10 shadow-md transition-all ${
                    isFav 
                      ? 'bg-white text-red-500' 
                      : 'bg-white text-black/60 hover:text-black'
                  }`}
                  title={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                >
                  <Heart size={16} fill={isFav ? 'currentColor' : 'none'} className="stroke-[2.5]" />
                </button>

                {/* Botón Compartir */}
                <button
                  onClick={handleShare}
                  className="w-9 h-9 rounded-full bg-white text-black/60 hover:text-black flex items-center justify-center border border-black/10 shadow-md transition-all"
                  title="Compartir"
                >
                  {copiedLink ? <Check size={16} className="text-success" /> : <Share2 size={16} className="stroke-[2.5]" />}
                </button>

                {/* Botón WhatsApp */}
                <button
                  onClick={() => openWhatsAppChat({ message: `Hola, me interesa comprar *${product.nombre}*` })}
                  className="w-9 h-9 rounded-full bg-white text-green-600 hover:text-green-700 flex items-center justify-center border border-black/10 shadow-md transition-all"
                  title="Preguntar por WhatsApp"
                >
                  <MessageSquare size={16} className="stroke-[2.5]" />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted">
              <ShoppingBag size={48} className="opacity-30 mb-2" />
            </div>
          )}

          {/* Badge Agotado */}
          {resolvedState === 'agotado' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
              <div className="bg-orange-500 text-white px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-1.5 animate-pulse">
                <AlertTriangle size={14} />
                <span>Temporalmente Agotado</span>
              </div>
            </div>
          )}
        </div>

        {/* Miniaturas en carrusel inferior (si aplica galería) */}
        {imageGallery.length > 1 && (
          <div className="flex justify-start gap-2 overflow-x-auto no-scrollbar pb-1 pt-1 shrink-0">
            {imageGallery.map((url, idx) => (
              <button
                key={url}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-12 h-12 rounded-xl overflow-hidden bg-white border-2 shrink-0 transition-all ${
                  idx === activeImageIndex ? 'border-primary scale-105 shadow-sm' : 'border-app opacity-80'
                }`}
              >
                <img src={url} alt="Miniatura" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Variantes y Opciones - Color e imágenes reales, matching Screenshots 1 & 4 */}
        {resolvedState === 'activo' && (
          <div className="space-y-4 pt-1">
            {/* Tallas */}
            {tallas.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-app uppercase tracking-wider">Talla:</span>
                  <span className="text-muted">
                    {selectedTalla ? `Seleccionado: ${selectedTalla}` : 'Selecciona una opción'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tallas.map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedTalla(t)
                        setErrorMsg('')
                      }}
                      className={`h-10 px-4 rounded-xl text-sm font-semibold transition-all border-2 active:scale-95 cursor-pointer ${
                        selectedTalla === t 
                          ? 'border-primary bg-primary text-white shadow-md' 
                          : 'border-app bg-surface-2 text-muted hover:border-primary/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colores */}
            {colores.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-app uppercase tracking-wider">Color:</span>
                  <span className="font-black text-app">
                    {selectedColor ? selectedColor.toUpperCase() : 'Selecciona una opción'}
                  </span>
                </div>
                
                {/* Variant Selector Grid matching Screenshots 1 & 4 */}
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
                          setErrorMsg('')
                        }}
                        className={`rounded-xl overflow-hidden transition-all active:scale-95 shrink-0 cursor-pointer ${
                          isSelected 
                            ? 'border-2 border-primary ring-2 ring-primary/20 scale-95 shadow-md' 
                            : 'border border-app opacity-85 hover:opacity-100 hover:border-primary/50'
                        } ${visualVariationsEnabled && variantImg ? 'w-14 h-16' : 'w-12 h-12 flex items-center justify-center bg-surface-2'}`}
                        title={c}
                      >
                        {visualVariationsEnabled && variantImg ? (
                          <img 
                            src={variantImg} 
                            alt={c}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span 
                            className={`w-9 h-9 rounded-full shadow-inner ${isWhite ? 'border border-app' : ''}`}
                            style={{ backgroundColor: cssColor }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Badge de stock ¡ÚLTIMA UNIDAD!, matching Screenshots 1 & 4 */}
            {currentVariant && currentVariant.stock > 0 && currentVariant.stock <= (commercialOptimization?.tools?.smartTags?.lastUnit?.threshold || 3) && (
              <div className="flex pt-1 animate-pulse">
                <span className="inline-flex items-center gap-1.5 bg-[#ff5a00] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shadow-sm border border-black/10">
                  🔥 {commercialOptimization?.tools?.smartTags?.lastUnit?.text || '¡ÚLTIMA UNIDAD!'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Ficha de Precios, Cuotas y Envíos, matching Screenshots 4 & 5 */}
        <div className="space-y-3.5 border-t border-app pt-5">
          <div className="space-y-0.5">
            {product.tienePromocion && product.precioPromo < product.precioBase && (!currentVariant?.precio || Number(currentVariant.precio) === 0) ? (
              <div>
                <span className="text-xs text-muted line-through font-semibold block mb-0.5">
                  {formatCurrency(product.precioBase)}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-3xl font-black text-app">
                    {formatCurrency(actualPrice)}
                  </span>
                  <span className="text-xs font-black text-[#00a650]">
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
                  <span className="text-3xl font-black text-app">
                    {formatCurrency(actualPrice)}
                  </span>
                  <span className="text-xs font-black text-[#00a650]">
                    {Math.round((1 - (Number(currentVariant.precio) / product.precioBase)) * 100)}% OFF
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-3xl font-black text-app block">
                {formatCurrency(actualPrice)}
              </span>
            )}
          </div>

          {/* Cuotas sin interés dinámicas, matching Screenshots 4 & 5 */}
          {actualPrice > 0 && (
            <div className="space-y-1.5 pt-0.5">
              <p className="text-xs text-[#00a650] font-bold flex items-center gap-1 leading-none">
                en {actualPrice < 100000 ? 3 : 6} cuotas de {formatCurrency(Math.round(actualPrice / (actualPrice < 100000 ? 3 : 6)))} con 0% de interés
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted">
                <span className="hover:underline cursor-pointer text-primary font-semibold">Medios de pago</span>
                <span className="text-muted/40">|</span>
                <div className="flex items-center gap-1 opacity-75">
                  <span className="bg-surface-2 px-1 rounded border border-app text-[8px] font-bold">VISA</span>
                  <span className="bg-surface-2 px-1 rounded border border-app text-[8px] font-bold">MC</span>
                  <span className="bg-surface-2 px-1 rounded border border-app text-[8px] font-bold">AMEX</span>
                  <span className="bg-surface-2 px-1 rounded border border-app text-[8px] font-bold">PSE</span>
                </div>
              </div>
            </div>
          )}

          {/* Banner de beneficios premium / cuotas extras matching Screenshots 4 */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-primary/10 border border-purple-500/20 flex items-center justify-between gap-3 shadow-inner">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-app uppercase tracking-wider">CUOTAS EXTRA SIN INTERÉS</p>
              <p className="text-[9px] text-muted leading-tight">Accede a 12 cuotas con 0% y envíos prioritarios gratis</p>
            </div>
            <div className="bg-primary text-white text-[8px] font-black px-2 py-1 rounded-lg shrink-0 uppercase cursor-pointer hover:opacity-90 active:scale-95 transition-all">
              SUSCRIBIRME
            </div>
          </div>

          {/* Detalles de Envío / Devolución matching Screenshots 2, 4 & 5 */}
          <div className="pt-3 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center text-[#00a650] shrink-0 mt-0.5 text-xs font-bold">
                ⚡
              </div>
              <div>
                <p className="text-xs font-bold text-[#00a650]">Llega gratis mañana</p>
                <p className="text-[10px] text-muted">Beneficio de envío rápido Full para tu ubicación actual</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-primary shrink-0 mt-0.5 text-xs font-bold">
                🔄
              </div>
              <div>
                <p className="text-xs font-bold text-primary">Devolución gratis</p>
                <p className="text-[10px] text-muted">Tienes 30 días desde que lo recibes para arrepentirte sin costos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Descripción corta */}
        {product.descripcion && (
          <div className="border-t border-app pt-5">
            <p className="text-sm text-muted leading-relaxed font-medium">{product.descripcion}</p>
          </div>
        )}

        {/* Detalles comerciales enriquecidos / descripción larga */}
        {product.descripcionLarga && (
          <div className="border-t border-app pt-5 space-y-2">
            <h3 className="text-xs font-bold text-app uppercase tracking-wider">Especificaciones del Producto</h3>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{product.descripcionLarga}</p>
          </div>
        )}

        {product.beneficios?.length > 0 && (
          <div className="border-t border-app pt-5 space-y-2">
            <h3 className="text-xs font-bold text-app uppercase tracking-wider">Beneficios Destacados</h3>
            <ul className="space-y-1.5 text-sm text-muted">
              {product.beneficios.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {product.garantiaInfo && (
          <div className="border-t border-app pt-5 p-4 rounded-2xl bg-surface-2 border border-app flex gap-3">
            <Info size={20} className="text-primary shrink-0" />
            <div>
              <p className="text-xs font-bold text-app uppercase tracking-wider">Garantía Asegurada</p>
              <p className="text-xs text-muted leading-relaxed mt-0.5">{product.garantiaInfo}</p>
            </div>
          </div>
        )}

        {/* Productos Relacionados — carga diferida sin bloquear el contenido principal */}
        {isAllProductsLoading ? (
          <div className="border-t border-app pt-6 space-y-4">
            <div className="w-32 h-3 rounded bg-surface-2 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-surface border border-app rounded-2xl p-2">
                  <div className="aspect-square rounded-xl bg-surface-2 animate-pulse mb-2" />
                  <div className="w-3/4 h-3 rounded bg-surface-2 animate-pulse mb-1" />
                  <div className="w-1/2 h-3 rounded bg-surface-2 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : relatedProducts.length > 0 ? (
          <div className="border-t border-app pt-6 space-y-4">
            <h3 className="text-xs font-bold text-app uppercase tracking-widest">Te podría interesar</h3>
            <div className="grid grid-cols-2 gap-3">
              {relatedProducts.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => navigate(`/compra-qr/${p.id}`)}
                  className="bg-surface border border-app rounded-2xl p-2 cursor-pointer shadow-sm hover:shadow-md transition-all"
                >
                  <div className="aspect-square rounded-xl bg-surface-2 overflow-hidden mb-2">
                    <img src={p.imageUrl} alt={p.nombre} className="w-full h-full object-cover" />
                  </div>
                  <p className="font-bold text-xs text-app truncate">{p.nombre}</p>
                  <p className="text-xs font-black text-primary mt-0.5">${Number(p.precioBase).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

      </main>

      {/* Footer Fijo de Compra */}
      <footer className="fixed bottom-0 inset-x-0 bg-surface/90 backdrop-blur-md border-t border-app p-4 pb-6 flex flex-col gap-3 z-30">
        {resolvedState === 'agotado' ? (
          <div className="max-w-md mx-auto w-full space-y-3">
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2.5">
              <AlertTriangle size={16} className="text-orange-500 shrink-0" />
              <p className="text-xs text-orange-600 font-semibold leading-snug">
                Producto temporalmente agotado. ¿Deseas hacer una cotización especial o encargo?
              </p>
            </div>
            {config.wholesaleSettings?.enabled !== false ? (
              <button
                onClick={() => {
                  const message = `🛍️ Hola, me gustaría solicitar una cotización especial/encargo para *${product.nombre}*. ¿Está disponible para producción?`
                  openWhatsAppChat({ message })
                }}
                className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer border-none"
              >
                <MessageSquare size={18} />
                <span>Solicitar Cotización vía WhatsApp</span>
              </button>
            ) : (
              <button
                onClick={() => openWhatsAppChat({ message: `Hola, me interesa saber si tendrán existencias de *${product.nombre}* pronto.` })}
                className="w-full h-14 bg-surface hover:bg-surface-2 border border-app text-app rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <MessageSquare size={18} />
                <span>Preguntar por Stock</span>
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto w-full space-y-3">
            {errorMsg && (
              <p className="text-xs text-white bg-red-500 p-2.5 rounded-xl font-bold text-center animate-pulse">
                {errorMsg}
              </p>
            )}
            
            {/* Controles del Carrito */}
            <div className="flex gap-3 items-center">
              {/* Selector de cantidad */}
              <div className="h-14 flex items-center justify-between border border-app rounded-2xl bg-surface-2 px-3 gap-3 shrink-0">
                <button 
                  onClick={() => setCantidad(prev => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg text-app hover:bg-surface flex items-center justify-center font-black transition-colors cursor-pointer border-none bg-transparent"
                >
                  -
                </button>
                <span className="text-sm font-black text-app w-6 text-center">{cantidad}</span>
                <button 
                  onClick={() => setCantidad(prev => Math.min(currentVariant?.stock || 99, prev + 1))}
                  className="w-8 h-8 rounded-lg text-app hover:bg-surface flex items-center justify-center font-black transition-colors cursor-pointer border-none bg-transparent"
                >
                  +
                </button>
              </div>

              {/* Botón Comprar Ahora */}
              <button
                onClick={() => handleAddToCart(true)}
                className="flex-1 h-14 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all cursor-pointer border-none"
              >
                <ShoppingBag size={16} />
                <span>Comprar Ahora</span>
              </button>
            </div>
          </div>
        )}
      </footer>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Checkout Modal */}
      <CheckoutModal 
        isOpen={showCheckout} 
        onClose={() => setShowCheckout(false)} 
      />
    </div>
  )
}
