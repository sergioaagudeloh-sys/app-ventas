import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Package, Trash2, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useFavoritesStore from '../../store/favoritesStore'
import { useProducts, useCategories } from '../../hooks/useInventory'
import useAuthStore from '../../store/authStore'
import useCartStore from '../../store/cartStore'
import { formatCurrency, truncate } from '../../utils/formatters'
import ProductDetailModal from '../../components/client/catalog/ProductDetailModal'
import ProductCard from '../../components/client/catalog/ProductCard'

export default function ClientFavorites() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const userId = user?.celular || user?.uid
  
  const { favoriteIds, toggleFavorite } = useFavoritesStore()
  const { data: activeProducts = [] } = useProducts(true)
  const { data: categories = [] } = useCategories()
  const { addItem, setIsOpen } = useCartStore()
  
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Cruzamos los IDs con los productos reales y resolvemos la categoría dinámica
  const favoriteProducts = favoriteIds.map(id => {
    const p = activeProducts.find(prod => prod.id === id)
    if (p) {
      const matchedCat = categories.find(c => c.id === p.categoriaId)
      return {
        ...p,
        categoria: matchedCat ? matchedCat.nombre : p.categoria
      }
    }
    return { id, isDeleted: true }
  })

  // Redirigir a login si no hay sesión
  useEffect(() => {
    if (!userId) {
      navigate('/login')
    }
  }, [userId, navigate])

  const handleRemove = (e, productId) => {
    e.stopPropagation()
    toggleFavorite(userId, productId)
  }

  const handleAddToCart = (e, product) => {
    e.stopPropagation()
    if (product.variantes?.length > 1) {
      // Si tiene variantes, lo mandamos al catálogo con el modal abierto
      navigate('/tienda/catalogo', { state: { openProduct: product.id } })
    } else {
      addItem({
        ...product,
        selectedVariant: product.variantes?.[0] || null,
        cartQuantity: 1
      })
      setIsOpen(true)
    }
  }

  if (!userId) return null

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-app mb-1">Tus productos favoritos</h1>
        <p className="text-sm text-muted">Guarda aquí los productos que más te interesan.</p>
      </motion.div>

      {/* Grid */}
      {favoriteProducts.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-24 h-24 mx-auto bg-surface-2 rounded-full flex items-center justify-center mb-6">
            <Heart size={40} className="text-muted" />
          </div>
          <p className="text-app font-medium text-lg mb-2">Aún no tienes favoritos</p>
          <p className="text-sm text-muted mb-8 max-w-sm mx-auto">
            Aquí aparecerán los productos que guardes como favoritos. Explora el catálogo y guarda los que más te gusten.
          </p>
          <button 
            onClick={() => navigate('/tienda/catalogo')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-md hover:opacity-90 transition-opacity"
          >
            Explorar productos
          </button>
        </motion.div>
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          <AnimatePresence>
            {favoriteProducts.map((product) => {
              // Si el producto fue eliminado de la BD
              if (product.isDeleted) {
                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-surface rounded-3xl p-4 border border-app shadow-sm flex flex-col items-center justify-center text-center aspect-square"
                  >
                    <Package size={24} className="text-muted mb-2" />
                    <p className="text-xs text-muted mb-4">Este producto ya no está disponible.</p>
                    <button
                      onClick={(e) => handleRemove(e, product.id)}
                      className="px-4 py-1.5 bg-surface-2 rounded-lg text-xs font-bold text-muted hover:text-red-500 transition-colors"
                    >
                      Quitar
                    </button>
                  </motion.div>
                )
              }

              // Calcular si está agotado
              const isOutOfStock = product.stock <= 0 || (product.variantes && product.variantes.every(v => v.stock <= 0))

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenDetail={setSelectedProduct}
                />
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal de Detalle de Producto */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  )
}
