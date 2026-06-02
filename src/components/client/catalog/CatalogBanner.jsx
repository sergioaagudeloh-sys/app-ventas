import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import useAppConfigStore from '../../../store/appConfigStore'
import { useAds } from '../../../hooks/useAds'
import { useProducts } from '../../../hooks/useInventory'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function CatalogBanner({ onAction }) {
  const { catalogBanner } = useAppConfigStore()
  const { data: ads = [] } = useAds()
  const { data: products = [] } = useProducts(true)

  // Filtrar anuncios activos en el rango de fechas
  const activeAds = ads.filter(ad => {
    if (!ad.active) return false
    const today = new Date().toISOString().split('T')[0]
    return today >= ad.startDate && today <= ad.endDate
  })

  // Configuración de Embla Carousel con plugin de Autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true },
    [Autoplay({ delay: 5000, stopOnInteraction: true })]
  )
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap())
    }
    emblaApi.on('select', onSelect)
    onSelect()
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev()
  const scrollNext = () => emblaApi && emblaApi.scrollNext()
  const scrollTo = (index) => emblaApi && emblaApi.scrollTo(index)

  // Lógica principal de ejecución de la acción
  const handleBannerClick = (e, ad, linkedProduct) => {
    if (e) {
      e.stopPropagation()
    }
    
    console.log("[CatalogBanner] Dispatching action for ad", ad.id || ad.title, ad)
    
    if (!onAction) {
      console.warn("[CatalogBanner] onAction is not defined!")
      return
    }

    if (ad.type === 'inventory') {
      if (linkedProduct) {
        onAction({ type: 'product', value: linkedProduct, ad: ad, fromBanner: true })
      } else {
        console.warn("[CatalogBanner] linkedProduct not found for inventory ad, falling back to modal view!")
        onAction({ 
          type: 'modal', 
          ad: ad,
          fromBanner: true
        })
      }
    } else {
      onAction({ 
        type: ad.ctaAction || 'modal', 
        value: ad.ctaValue, 
        ad: ad,
        fromBanner: true
      })
    }
  }

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

      {/* Viewport de Embla Carousel */}
      <div className="overflow-hidden w-full rounded-3xl" ref={emblaRef}>
        {/* Contenedor de Embla (flex) */}
        <div className="flex">
          {activeAds.map((ad, idx) => {
            const linkedProduct = ad.type === 'inventory' ? products.find(p => p.id === ad.productId) : null
            
            const bgStyle = ad.type === 'custom' && ad.colors?.bg 
              ? { background: ad.colors.bg } 
              : { background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }

            const textStyle = ad.type === 'custom' && ad.colors?.text
              ? { color: ad.colors.text }
              : { color: '#ffffff' }

            const bannerImg = ad.type === 'inventory' 
              ? (ad.customBanner || linkedProduct?.imageUrl) 
              : (ad.banner || ad.image)

            return (
              <div 
                key={ad.id || idx}
                className="flex-[0_0_100%] min-w-0"
              >
                <div 
                  onClick={(e) => handleBannerClick(e, ad, linkedProduct)}
                  className={`w-full h-40 sm:h-48 md:h-56 relative flex items-center cursor-pointer pointer-events-auto ${
                    ad.glowEffect ? 'border-none shadow-[0_20px_50px_rgba(156,39,176,0.15)]' : 'border border-app shadow-md'
                  }`}
                  style={!bannerImg ? bgStyle : {}}
                >
                  {/* Haz de luz de Shimmer (Incita a hacer clic) */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
                    <div className="w-[30%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent absolute top-0 left-0 animate-shimmer-sweep animate-pulse pointer-events-none" />
                  </div>

                  {/* Imagen de fondo si existe */}
                  {bannerImg && (
                    <>
                      <img 
                        src={bannerImg} 
                        alt={ad.title || 'Promoción'} 
                        className="absolute inset-0 w-full h-full object-cover animate-fade-in transition-transform duration-700 group-hover:scale-105 z-0"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                      {/* Overlay sutil vertical para legibilidad de textos */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 pointer-events-none" />
                      {/* Gradiente horizontal de protección al lado izquierdo */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent z-10 pointer-events-none" />
                    </>
                  )}

                  {/* Contenido del Anuncio */}
                  <div className="relative z-30 px-6 sm:px-10 md:px-12 py-4 sm:py-5 flex flex-col justify-center gap-y-4 h-full text-left max-w-lg" style={!bannerImg ? textStyle : { color: '#ffffff' }}>
                    <div>
                      {ad.type === 'inventory' ? (
                        <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm w-max mb-1.5 sm:mb-2 flex items-center gap-1 animate-pulse border-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
                          ⚡ Oferta Relámpago
                        </span>
                      ) : (
                        <span className="bg-white/20 backdrop-blur-xl border border-white/30 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm w-max mb-1.5 sm:mb-2 flex items-center gap-1 animate-pulse uppercase text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
                          {ad.category || 'Promoción Especial'}
                        </span>
                      )}
                      <h2 className="font-black text-2xl sm:text-3xl tracking-tight leading-tight line-clamp-1 drop-shadow-md">
                        {ad.type === 'inventory' 
                          ? (ad.customTitle || linkedProduct?.nombre || 'Oferta Especial') 
                          : ad.title}
                      </h2>
                      <p className="text-[10px] tracking-[0.3em] font-medium opacity-70 mb-2 uppercase drop-shadow-md mt-1 line-clamp-2 max-w-sm leading-normal">
                        {ad.type === 'inventory' 
                          ? (linkedProduct?.descripcion || 'Descuentos increíbles por tiempo limitado.') 
                          : ad.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBannerClick(e, ad, linkedProduct)
                        }}
                        className="px-4 h-8 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-md shadow-primary/20 hover:brightness-110 hover:shadow-[0_0_20px_rgba(156,39,176,0.4)] text-[11px] font-bold rounded-xl active:scale-95 transition-all duration-300 flex items-center justify-center text-white border-none cursor-pointer"
                      >
                        {ad.type === 'inventory' ? 'Comprar Ahora' : (ad.ctaText || 'Aprovechar Oferta')}
                      </button>
                      
                      {ad.type === 'inventory' && linkedProduct && (
                        <span className="text-xs font-black text-white/90 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-white/10 h-8 flex items-center justify-center">
                          {ad.discountType === 'percentage' 
                            ? `${ad.discountValue}% OFF` 
                            : `-$${ad.discountValue.toLocaleString()}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Controles de Navegación del Carrusel (Solo si hay más de 1) */}
      {activeAds.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              scrollPrev()
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white backdrop-blur-md hover:bg-black/50 transition-colors flex items-center justify-center z-20 opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              scrollNext()
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white backdrop-blur-md hover:bg-black/50 transition-colors flex items-center justify-center z-20 opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={16} />
          </button>

          {/* Puntos de Paginación */}
          <div className="absolute bottom-3 right-12 flex gap-1.5 z-20">
            {activeAds.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation()
                  scrollTo(idx)
                }}
                className={`w-4 h-4 rounded-full transition-all ${
                  idx === selectedIndex ? 'bg-primary w-6' : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Ver imagen ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
