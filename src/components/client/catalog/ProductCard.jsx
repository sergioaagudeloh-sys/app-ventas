import { motion } from 'framer-motion'
import { Heart, Plus, Image as ImageIcon } from 'lucide-react'
import { formatCurrency, truncate } from '../../../utils/formatters'
import useFavoritesStore from '../../../store/favoritesStore'
import useAuthStore from '../../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import useAppConfigStore from '../../../store/appConfigStore'

import { getCssColor } from '../../../utils/colors'

export default function ProductCard({ product, onOpenDetail, layout = 'grid' }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { commercialOptimization } = useAppConfigStore()
  
  const userId = user?.celular || user?.uid
  const { favoriteIds, toggleFavorite } = useFavoritesStore()
  
  const isFav = favoriteIds.includes(product.id)

  // Verificar si el producto está completamente agotado (todas las variantes en 0)
  const isOutOfStock = product.variantes?.length > 0 && product.variantes.every(v => v.stock <= 0)

  // Optimización Comercial
  const optEnabled = commercialOptimization?.enabled === true
  const smartTagsEnabled = optEnabled && commercialOptimization?.tools?.smartTags?.enabled !== false
  const smartTags = commercialOptimization?.tools?.smartTags || {}
  
  // Calcular stock consolidado
  const stockConsolidado = product.variantes?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0
  
  // Calcular si es nuevo (creado en los últimos N días)
  const isNewProduct = useMemo(() => {
    if (!product.createdAt) return false
    const createdDate = typeof product.createdAt.toMillis === 'function' 
      ? product.createdAt.toMillis() 
      : (product.createdAt instanceof Date ? product.createdAt.getTime() : new Date(product.createdAt).getTime())
    const limitDays = smartTags.newProduct?.daysLimit || 7
    const diffTime = Math.abs(Date.now() - createdDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= limitDays
  }, [product.createdAt, smartTags.newProduct?.daysLimit])

  // Obtener etiqueta activa de mayor prioridad
  const activeSmartTag = useMemo(() => {
    if (!smartTagsEnabled) return null

    // 1. Última Unidad (Prioridad Alta)
    if (smartTags.lastUnit?.enabled !== false && stockConsolidado > 0 && stockConsolidado <= (smartTags.lastUnit?.threshold || 3)) {
      return {
        text: smartTags.lastUnit?.text || 'Última Unidad',
        bg: smartTags.lastUnit?.bg || '#3b82f6',
        textCol: smartTags.lastUnit?.textCol || '#ffffff'
      }
    }

    // 2. Oferta Imperdible (Si tiene descuento o es combo)
    const hasPromo = product.tienePromocion || product.discountActive
    if (smartTags.unmissableOffer?.enabled !== false && hasPromo) {
      return {
        text: smartTags.unmissableOffer?.text || 'Oferta Imperdible',
        bg: smartTags.unmissableOffer?.bg || '#f59e0b',
        textCol: smartTags.unmissableOffer?.textCol || '#ffffff'
      }
    }

    // 3. Más Vendido (Basado en salesCount real)
    const salesVal = product.salesCount || 0
    if (smartTags.bestSeller?.enabled !== false && salesVal >= (smartTags.bestSeller?.minSales || 5)) {
      return {
        text: smartTags.bestSeller?.text || 'Más Vendido',
        bg: smartTags.bestSeller?.bg || '#ef4444',
        textCol: smartTags.bestSeller?.textCol || '#ffffff'
      }
    }

    // 4. Nuevo
    if (smartTags.newProduct?.enabled !== false && isNewProduct) {
      return {
        text: smartTags.newProduct?.text || 'Nuevo',
        bg: smartTags.newProduct?.bg || '#10b981',
        textCol: smartTags.newProduct?.textCol || '#ffffff'
      }
    }

    return null
  }, [smartTagsEnabled, smartTags, stockConsolidado, product.tienePromocion, product.discountActive, product.salesCount, isNewProduct])

  // Indicador de variantes
  const variationIndicatorsEnabled = optEnabled && commercialOptimization?.tools?.variationIndicators?.enabled !== false
  const uniqueColors = useMemo(() => {
    if (!product.variantes) return []
    const colors = new Set(product.variantes.map(v => v.color).filter(Boolean))
    return Array.from(colors).slice(0, 5)
  }, [product.variantes])

  const handleFavoriteClick = (e) => {
    e.stopPropagation()
    
    if (!userId) {
      navigate('/login')
      return
    }

    toggleFavorite(userId, product.id)
  }

  // Estilos dinámicos para el efecto brillo (Glow) usando color-mix
  const glowStyle = product.tienePromocion && product.promocion?.glowEffect
    ? {
        boxShadow: '0 0 15px color-mix(in srgb, var(--color-primary) 35%, transparent)',
        borderColor: 'color-mix(in srgb, var(--color-primary) 50%, transparent)',
      }
    : {}

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`bg-surface overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer border border-app group ${
        layout === 'list' ? 'flex flex-row h-32' : 'flex flex-col h-full'
      } ${isOutOfStock ? 'opacity-70' : ''}`}
      style={{
        ...glowStyle,
        borderRadius: 'var(--radius-base)'
      }}
      onClick={() => {
        if (product.isTemporal) {
          onOpenDetail(product)
        } else {
          navigate('/producto/' + product.id)
        }
      }}
    >
      {/* Imagen */}
      <div className={`relative bg-surface-2 overflow-hidden shrink-0 ${
        layout === 'list' ? 'w-32 h-32' : 'aspect-square w-full'
      }`}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.nombre}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ viewTransitionName: 'product-image' }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted">
            <ImageIcon size={32} className="opacity-50 mb-2" />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}

        {/* Badge Agotado (tiene prioridad sobre la promo) */}
        {isOutOfStock ? (
          <span
            className="absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-slate-500 text-white shadow-md z-10"
            style={{ borderRadius: 'var(--radius-base)' }}
          >
            AGOTADO
          </span>
        ) : activeSmartTag ? (
          <span 
            className="absolute top-3 left-3 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase shadow-md z-10 border border-black/10 text-center flex items-center justify-center shrink-0"
            style={{ 
              borderRadius: 'var(--radius-base)',
              backgroundColor: activeSmartTag.bg,
              color: activeSmartTag.textCol
            }}
          >
            {activeSmartTag.text}
          </span>
        ) : product.tienePromocion && product.isTemporal ? (
          <span 
            className="absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-primary text-white shadow-md z-10 border border-primary-soft"
            style={{ borderRadius: 'var(--radius-base)' }}
          >
            COMBO
          </span>
        ) : null}

        {/* Botón Favorito Absoluto */}
        <motion.button
          onClick={handleFavoriteClick}
          whileTap={{ scale: 0.8 }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
            isFav
              ? 'bg-white/90 text-red-500 shadow-md'
              : 'bg-black/20 text-white hover:bg-black/40'
          }`}
          aria-label={isFav ? `Quitar ${product.nombre} de favoritos` : `Agregar ${product.nombre} a favoritos`}
        >
          <motion.div
            initial={false}
            animate={{ scale: isFav ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
          </motion.div>
        </motion.button>

        {/* Floating Quick Buy button matching screenshots */}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col gap-1 min-w-0">
        <div>
          <h3 className="text-gray-800 font-semibold group-hover:text-primary transition-colors duration-200 text-sm leading-tight line-clamp-2 mb-0.5" title={product.nombre}>
            {product.nombre}
          </h3>
          <p className="text-xs text-muted">{product.categoria}</p>

          {/* Indicador de Variantes en Tarjeta */}
          {variationIndicatorsEnabled && uniqueColors.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 pb-1 flex-wrap">
              {uniqueColors.map((color, idx) => {
                const hex = getCssColor(color)
                return (
                  <span 
                    key={idx}
                    title={color}
                    className="w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/15 shadow-inner shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                )
              })}
              {product.variantes?.length > uniqueColors.length && (
                <span className="text-[10px] text-muted font-black font-mono">
                  +{product.variantes.length - uniqueColors.length}
                </span>
              )}
            </div>
          )}
          
          {layout === 'list' && (
            <p className="text-xs text-muted line-clamp-2 mt-1 mb-2">
              {product.descripcion || 'Sin descripción'}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          <div className="min-w-0">
            {product.tienePromocion && product.precioPromo < product.precioBase ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-lg font-bold text-primary leading-none">
                  {formatCurrency(product.precioPromo)}
                </p>
                <span className="text-xs text-gray-600 line-through leading-none">
                  {formatCurrency(product.precioBase)}
                </span>
                <span className="text-[9px] font-black text-green-700 bg-green-600/10 px-1.5 py-0.5 rounded">
                  {product.promocion?.discountType === 'percentage'
                    ? `${product.promocion.discountValue}%`
                    : 'OFERTA'}
                </span>
              </div>
            ) : (
              <p className={`text-lg font-bold leading-none ${isOutOfStock ? 'text-gray-500 line-through' : 'text-primary'}`}>
                {formatCurrency(product.precioBase)}
              </p>
            )}
          </div>

          {!isOutOfStock && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (product.isTemporal) {
                  onOpenDetail(product)
                } else {
                  navigate('/producto/' + product.id)
                }
              }}
              className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 hover:shadow-lg hover:scale-110 active:scale-90 transition-all duration-200 shrink-0"
              aria-label={`Ver opciones de ${product.nombre}`}
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

