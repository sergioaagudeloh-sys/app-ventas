import { motion } from 'framer-motion'
import { Heart, Plus, Image as ImageIcon } from 'lucide-react'
import { formatCurrency, truncate } from '../../../utils/formatters'
import useFavoritesStore from '../../../store/favoritesStore'
import useAuthStore from '../../../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function ProductCard({ product, onOpenDetail, layout = 'grid' }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  
  const userId = user?.celular || user?.uid
  const { favoriteIds, toggleFavorite } = useFavoritesStore()
  
  const isFav = favoriteIds.includes(product.id)

  // Verificar si el producto está completamente agotado (todas las variantes en 0)
  const isOutOfStock = product.variantes?.length > 0 && product.variantes.every(v => v.stock <= 0)

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
        layout === 'list' ? 'flex flex-row h-32' : 'flex flex-col'
      } ${isOutOfStock ? 'opacity-70' : ''}`}
      style={{
        ...glowStyle,
        borderRadius: 'var(--radius-base)'
      }}
      onClick={() => onOpenDetail(product)}
    >
      {/* Imagen */}
      <div className={`relative bg-surface-2 overflow-hidden shrink-0 ${
        layout === 'list' ? 'w-32 h-32' : 'aspect-square w-full'
      }`}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.nombre}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isOutOfStock ? 'grayscale' : ''}`}
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
        ) : product.tienePromocion ? (
          <span 
            className="absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-primary text-white shadow-md z-10 border border-primary-soft"
            style={{ borderRadius: 'var(--radius-base)' }}
          >
            {product.isTemporal ? (
              'COMBO'
            ) : product.promocion?.discountType === 'percentage' ? (
              `-${product.promocion.discountValue}%`
            ) : (
              'OFERTA'
            )}
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
          aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <motion.div
            initial={false}
            animate={{ scale: isFav ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
          </motion.div>
        </motion.button>
      </div>

      {/* Info */}
      <div className={`p-4 flex-1 flex flex-col justify-between min-w-0`}>
        <div>
          <h3 className="font-bold text-app text-sm leading-tight mb-1 truncate" title={product.nombre}>
            {layout === 'list' ? product.nombre : truncate(product.nombre, 40)}
          </h3>
          <p className="text-xs text-muted mb-2">{product.categoria}</p>
          
          {layout === 'list' && (
            <p className="text-xs text-muted line-clamp-2 mt-1 mb-2">
              {product.descripcion || 'Sin descripción'}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-auto pt-2 gap-2">
          <div>
            {product.tienePromocion && product.precioPromo < product.precioBase ? (
              <>
                <p className="text-xs text-muted line-through font-semibold leading-none mb-1">
                  {formatCurrency(product.precioBase)}
                </p>
                <p className="font-bold text-primary text-base leading-none">
                  {formatCurrency(product.precioPromo)}
                </p>
              </>
            ) : (
              <p className={`font-bold text-base leading-none ${isOutOfStock ? 'text-muted' : 'text-primary'}`}>
                {formatCurrency(product.precioBase)}
              </p>
            )}
          </div>

          {/* Botón + solo si hay stock */}
          {!isOutOfStock && (
            <button
              className="w-8 h-8 rounded-full bg-action text-white flex items-center justify-center shadow-md shadow-action active:scale-90 transition-transform shrink-0"
              aria-label="Ver opciones"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

