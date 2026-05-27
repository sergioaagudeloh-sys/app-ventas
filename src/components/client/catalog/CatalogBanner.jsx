import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAppConfigStore from '../../../store/appConfigStore'
import { useAds } from '../../../hooks/useAds'
import { useProducts } from '../../../hooks/useInventory'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function CatalogBanner({ onAction }) {
  const { catalogBanner } = useAppConfigStore()
  const { data: ads = [] } = useAds()
  const { data: products = [] } = useProducts(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Filtrar anuncios activos en el rango de fechas
  const activeAds = ads.filter(ad => {
    if (!ad.active) return false
    const today = new Date().toISOString().split('T')[0]
    return today >= ad.startDate && today <= ad.endDate
  })

  // Auto-rotación del carrusel
  useEffect(() => {
    if (activeAds.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAds.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [activeAds.length])

  // Si no hay anuncios activos, mostramos el banner estático por defecto
  if (activeAds.length === 0) {
    if (!catalogBanner || catalogBanner.type === 'none') {
      return null
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        style={{ willChange: 'opacity' }}
        className="max-w-7xl mx-auto px-4 md:px-8 mt-4"
      >
        <div 
          className="w-full h-36 sm:h-44 md:h-52 rounded-3xl overflow-hidden relative shadow-sm border border-app flex items-center justify-center"
          style={
            catalogBanner.type === 'gradient' 
              ? { background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }
              : {}
          }
        >
          {catalogBanner.type === 'image' && catalogBanner.value ? (
            <>
              <img 
                src={catalogBanner.value} 
                alt="Banner del catálogo" 
                className="absolute inset-0 w-full h-full object-cover animate-fade-in"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div className="absolute inset-0 bg-black/25" />
            </>
          ) : null}

          {catalogBanner.type === 'gradient' && (
            <h2 className="relative z-10 text-white font-bold text-xl sm:text-2xl md:text-3xl tracking-tight text-center px-4 drop-shadow-md">
              Descubre nuestra colección
            </h2>
          )}
        </div>
      </motion.div>
    )
  }

  // Si hay anuncios activos, mostramos el carrusel interactivo
  const currentAd = activeAds[currentIndex]
  const linkedProduct = currentAd.type === 'inventory' ? products.find(p => p.id === currentAd.productId) : null

  // Obtener imágenes o estilos del anuncio actual
  const bgStyle = currentAd.type === 'custom' && currentAd.colors?.bg 
    ? { background: currentAd.colors.bg } 
    : { background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }

  const textStyle = currentAd.type === 'custom' && currentAd.colors?.text
    ? { color: currentAd.colors.text }
    : { color: '#ffffff' }

  const bannerImg = currentAd.type === 'inventory' 
    ? (currentAd.customBanner || linkedProduct?.imageUrl) 
    : (currentAd.banner || currentAd.image)

  const handleBannerClick = () => {
    if (!onAction) return
    if (currentAd.type === 'inventory') {
      if (linkedProduct) {
        onAction({ type: 'product', value: linkedProduct })
      }
    } else {
      onAction({ 
        type: currentAd.ctaAction || 'modal', 
        value: currentAd.ctaValue, 
        ad: currentAd 
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      style={{ willChange: 'opacity' }}
      className="max-w-7xl mx-auto px-4 md:px-8 mt-4 relative group"
    >
      {/* Definición de Keyframes de Animaciones Premium */}
      <style>{`
        @keyframes shimmer-sweep {
          0% { transform: translateX(-150%) skewX(-25deg); }
          100% { transform: translateX(550%) skewX(-25deg); }
        }
        @keyframes glow-pulse {
          0%, 100% { 
            box-shadow: 0 0 15px 2px color-mix(in srgb, var(--color-primary) 35%, transparent);
            border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
          }
          50% { 
            box-shadow: 0 0 25px 6px color-mix(in srgb, var(--color-primary) 70%, transparent);
            border-color: color-mix(in srgb, var(--color-primary) 90%, transparent);
          }
        }
        .animate-shimmer-sweep {
          animation: shimmer-sweep 4s infinite linear;
        }
        .animate-glow-pulse {
          animation: glow-pulse 3s infinite ease-in-out;
        }
      `}</style>

      <div 
        onClick={handleBannerClick}
        className={`w-full h-40 sm:h-48 md:h-56 rounded-3xl overflow-hidden relative shadow-md flex items-center cursor-pointer select-none transition-all duration-300 hover:scale-[1.01] hover:shadow-lg active:scale-95 ${
          currentAd.glowEffect ? 'border-2 animate-glow-pulse' : 'border border-app'
        }`}
        style={!bannerImg ? bgStyle : {}}
      >
        {/* Haz de luz de Shimmer (Incita a hacer clic) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          <div className="w-[30%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent absolute top-0 left-0 animate-shimmer-sweep" />
        </div>

        {/* Imagen de fondo si existe */}
        {bannerImg && (
          <>
            <img 
              src={bannerImg} 
              alt={currentAd.title || 'Promoción'} 
              className="absolute inset-0 w-full h-full object-cover animate-fade-in transition-transform duration-700 group-hover:scale-105"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            {/* Overlay sutil para legibilidad de textos */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-transparent" />
          </>
        )}

        {/* Contenido del Anuncio */}
        <div className="relative z-10 px-6 sm:px-10 md:px-12 py-4 sm:py-5 flex flex-col justify-between h-full text-left max-w-lg" style={!bannerImg ? textStyle : { color: '#ffffff' }}>
          <div>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-primary/20 backdrop-blur-md text-primary-soft px-2.5 py-1 rounded-full w-max mb-1.5 sm:mb-2 border border-primary/20 flex items-center gap-1 animate-pulse">
              {currentAd.type === 'inventory' ? '⚡ Oferta Relámpago' : currentAd.category || 'Promoción Especial'}
            </span>
            <h2 className="font-extrabold text-base sm:text-lg md:text-xl tracking-tight leading-tight line-clamp-1 drop-shadow-sm">
              {currentAd.type === 'inventory' 
                ? (currentAd.customTitle || linkedProduct?.nombre || 'Oferta Especial') 
                : currentAd.title}
            </h2>
            <p className="text-[11px] sm:text-xs opacity-90 mt-1 line-clamp-2 max-w-sm drop-shadow-sm font-medium leading-normal">
              {currentAd.type === 'inventory' 
                ? (linkedProduct?.descripcion || 'Descuentos increíbles por tiempo limitado.') 
                : currentAd.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleBannerClick()
              }}
              className="px-4 py-2 bg-primary text-white text-[11px] font-bold rounded-xl shadow-lg shadow-primary/30 transition-all hover:opacity-90 active:scale-95 flex items-center justify-center border border-primary-soft hover:shadow-primary/50 h-9"
              style={{ borderRadius: 'var(--radius-base)' }}
            >
              {currentAd.type === 'inventory' ? 'Comprar Ahora' : (currentAd.ctaText || 'Aprovechar Oferta')}
            </button>
            
            {currentAd.type === 'inventory' && linkedProduct && (
              <span className="text-xs font-black text-white/90 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-white/10 h-9 flex items-center justify-center">
                {currentAd.discountType === 'percentage' 
                  ? `${currentAd.discountValue}% OFF` 
                  : `-$${currentAd.discountValue.toLocaleString()}`}
              </span>
            )}
          </div>
        </div>

        {/* Controles de Navegación del Carrusel (Solo si hay más de 1) */}
        {activeAds.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex((prev) => (prev - 1 + activeAds.length) % activeAds.length)
              }}
              className="absolute left-3 w-8 h-8 rounded-full bg-black/30 text-white backdrop-blur-md hover:bg-black/50 transition-colors flex items-center justify-center z-20 opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex((prev) => (prev + 1) % activeAds.length)
              }}
              className="absolute right-3 w-8 h-8 rounded-full bg-black/30 text-white backdrop-blur-md hover:bg-black/50 transition-colors flex items-center justify-center z-20 opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={16} />
            </button>

            {/* Puntos de Paginación */}
            <div className="absolute bottom-3 right-6 flex gap-1.5 z-20">
              {activeAds.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex(idx)
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-primary w-4' : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
