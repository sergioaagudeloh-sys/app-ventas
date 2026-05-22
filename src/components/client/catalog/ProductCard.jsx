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

  const handleFavoriteClick = (e) => {
    e.stopPropagation() // Evitar abrir el modal de detalle
    
    if (!userId) {
      navigate('/login')
      return
    }

    toggleFavorite(userId, product.id)
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`bg-surface rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer border border-app group ${
        layout === 'list' ? 'flex flex-row h-32' : 'flex flex-col'
      }`}
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
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted">
            <ImageIcon size={32} className="opacity-50 mb-2" />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}

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
        <h3 className="font-bold text-app text-sm leading-tight mb-1 truncate" title={product.nombre}>
          {layout === 'list' ? product.nombre : truncate(product.nombre, 40)}
        </h3>
        
        {layout === 'list' && (
          <p className="text-xs text-muted line-clamp-2 mt-1 mb-2">
            {product.descripcion || 'Sin descripción'}
          </p>
        )}
        
        <div className="flex items-end justify-between mt-auto">
          <p className="font-bold text-primary text-base">
            {formatCurrency(product.precioBase)}
          </p>
          <button
            className="w-8 h-8 rounded-full bg-action text-white flex items-center justify-center shadow-md shadow-action active:scale-90 transition-transform shrink-0"
            aria-label="Ver opciones"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
