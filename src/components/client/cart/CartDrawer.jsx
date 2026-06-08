import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, ShoppingBag, ArrowRight, Image as ImageIcon, Minus, Plus } from 'lucide-react'
import { formatCurrency, truncate } from '../../../utils/formatters'
import useCartStore from '../../../store/cartStore'
import useGuidedStore from '../../../store/guidedStore'
import CheckoutModal from '../checkout/CheckoutModal'
import SmartHint from '../guided/SmartHint'
import useAppConfigStore from '../../../store/appConfigStore'
import useAuthStore from '../../../store/authStore'
import ProductDetailModal from '../catalog/ProductDetailModal'
import QuantitySelector from '../../ui/QuantitySelector'

export default function CartDrawer() {
  const { isOpen, closeCart, items, addItem, removeItem, deleteItem, getTotal } = useCartStore()
  const { hasCompletedStep, markStepCompleted } = useGuidedStore()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const navigate = useNavigate()

  // Estados del recomendador comercial
  const { commercialOptimization } = useAppConfigStore()
  const { user, role } = useAuthStore()
  const [recommendedProducts, setRecommendedProducts] = useState([])
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)

  const optEnabled = commercialOptimization?.enabled === true
  const cartRecsEnabled = optEnabled && commercialOptimization?.tools?.cartRecommendations?.enabled !== false
  const historyRecsEnabled = optEnabled && commercialOptimization?.tools?.historyRecommendations?.enabled !== false
  const recsTitle = commercialOptimization?.tools?.cartRecommendations?.title || 'Recomendado para ti'
  
  const isClient = role === 'client'
  const clientPhone = isClient && user?.celular

  useEffect(() => {
    if (!isOpen) {
      setRecommendedProducts([])
      return
    }
    if (!cartRecsEnabled && !historyRecsEnabled) return

    let isMounted = true
    const fetchRecs = async () => {
      setLoadingRecs(true)
      try {
        const { getProducts } = await import('../../../services/inventoryService')
        const allProducts = await getProducts(true)

        if (!isMounted) return

        // Obtener los items más recientes del carrito directamente desde el estado de Zustand
        const currentItems = useCartStore.getState().items
        const cartProductIds = currentItems.map(item => item.productId)

        let historyCategories = []
        if (historyRecsEnabled && clientPhone) {
          const { getClientOrders } = await import('../../../services/orderService')
          const orders = await getClientOrders(clientPhone)
          const categories = new Set()
          orders.forEach(order => {
            order.items?.forEach(item => {
              const prod = allProducts.find(p => p.id === item.productId)
              if (prod?.categoria) {
                categories.add(prod.categoria)
              }
            })
          })
          historyCategories = Array.from(categories)
        }

        let candidates = allProducts.filter(p => {
          if (cartProductIds.includes(p.id)) return false
          const isOutOfStock = p.variantes?.length > 0 && p.variantes.every(v => v.stock <= 0)
          if (isOutOfStock) return false
          return true
        })

        const cartCategories = Array.from(new Set(
          currentItems.map(item => {
            const prod = allProducts.find(p => p.id === item.productId)
            return prod?.categoria
          }).filter(Boolean)
        ))

        const scoredCandidates = candidates.map(p => {
          let score = 0
          
          if (cartCategories.includes(p.categoria)) {
            score += 100
          }

          if (historyCategories.includes(p.categoria)) {
            score += 50
          }

          if (p.salesCount && p.salesCount > 0) {
            score += Math.min(p.salesCount, 30)
          }

          if (p.tienePromocion && p.precioPromo < p.precioBase) {
            score += 20
          }

          if (p.destacado === true) {
            score += 10
          }

          return { product: p, score }
        })

        scoredCandidates.sort((a, b) => b.score - a.score)
        const topRecs = scoredCandidates.slice(0, 6).map(sc => sc.product)

        setRecommendedProducts(topRecs)
      } catch (err) {
        console.error('Error fetching recommendations:', err)
      } finally {
        if (isMounted) setLoadingRecs(false)
      }
    }

    fetchRecs()

    return () => {
      isMounted = false
    }
  }, [isOpen, cartRecsEnabled, historyRecsEnabled, clientPhone])

  const handleContinueShopping = () => {
    closeCart()
    navigate('/tienda/catalogo')
  }

  const handleCheckoutClick = () => {
    // Guided Mode
    markStepCompleted('view_cart')
    
    closeCart()
    setIsCheckoutOpen(true)
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeCart}
              className="absolute inset-0 bg-black/50"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ ease: [0.25, 1, 0.5, 1], duration: 0.35 }}
              className="relative w-full max-w-md bg-surface h-full shadow-2xl flex flex-col will-change-transform"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-100 bg-surface z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ShoppingBag size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Tu Carrito</h2>
                </div>
                <button
                  onClick={closeCart}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto p-6 bg-app">
                {items.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mb-6 border border-app shadow-sm">
                      <ShoppingBag size={40} className="text-muted opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold text-app mb-2">Tu carrito está vacío</h3>
                    <p className="text-muted max-w-xs">
                      Aún no has agregado productos. Explora nuestro catálogo y encuentra algo que te guste.
                    </p>

                    <div className="relative w-full max-w-[280px] mt-2">
                      <SmartHint 
                        stepId="cart_empty" 
                        message="Agrega productos para comenzar tu pedido." 
                        position="bottom" 
                        delay={500} 
                      />
                    </div>
                    <button
                      onClick={handleContinueShopping}
                      className="mt-8 bg-transparent border-none text-gray-400 font-bold text-sm tracking-wide uppercase transition-colors hover:text-gray-700 active:scale-95"
                    >
                      Seguir Comprando
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={`${item.productId}-${item.variantId}`} className="bg-white rounded-2xl p-2 pr-4 border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] flex gap-4 items-center relative">
                        {/* Img */}
                        <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted"><ImageIcon size={20} /></div>
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 flex flex-col gap-0.5">
                          <div>
                            <h4 className="font-bold text-gray-900 text-[15px] leading-tight pr-6">{truncate(item.nombre, 35)}</h4>
                            <p className="text-[11px] text-muted mt-1 font-medium">
                              {item.talla && `Talla ${item.talla}`} {item.talla && item.color && '·'} {item.color && item.color}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-end mt-2">
                            <p className="text-primary font-black text-base leading-none">
                              {formatCurrency(item.precio * item.cantidad)}
                            </p>
                            
                            {/* Contador de Cantidad Refinado */}
                            <QuantitySelector
                              value={item.cantidad}
                              onChange={(newQty) => {
                                const diff = newQty - item.cantidad
                                if (diff > 0) {
                                  addItem({ productId: item.productId, variantId: item.variantId }, diff)
                                } else if (diff < 0) {
                                  removeItem(item.productId, item.variantId, Math.abs(diff))
                                }
                              }}
                              min={1}
                              max={item.maxStock || 10}
                              className="scale-[0.7] origin-right shrink-0"
                            />
                          </div>
                        </div>

                        {/* Eliminar TODO el stack de esa variante */}
                        <button
                          onClick={() => deleteItem(item.productId, item.variantId)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all opacity-50 hover:opacity-100 absolute top-2.5 right-2.5"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recomendaciones en Carrito / Historial */}
                {cartRecsEnabled && recommendedProducts.length > 0 && (
                  <div className="mt-8 border-t border-app pt-6 shrink-0">
                    <h3 className="text-sm font-extrabold text-app mb-4 flex items-center justify-between">
                      <span>{recsTitle}</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                        Ofertas para ti
                      </span>
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
                      {recommendedProducts.map((p) => {
                        const pPrice = (p.tienePromocion && p.precioPromo < p.precioBase)
                          ? p.precioPromo
                          : p.precioBase

                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedProductDetail(p)}
                            className="w-36 bg-surface border border-app rounded-2xl p-2.5 flex flex-col cursor-pointer shrink-0 snap-start hover:border-primary/40 hover:shadow-md transition-all duration-300 active:scale-95 group"
                          >
                            <div className="w-full h-24 bg-surface-2 rounded-xl overflow-hidden shrink-0 relative mb-2">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.nombre}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted">
                                  <ImageIcon size={20} className="opacity-40" />
                                </div>
                              )}
                              {p.tienePromocion && p.precioPromo < p.precioBase && (
                                <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                                  PROMO
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-app line-clamp-2 leading-tight flex-1">
                              {p.nombre}
                            </h4>
                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-app/50 shrink-0">
                              <span className="text-xs font-extrabold text-primary">
                                {formatCurrency(pPrice)}
                              </span>
                              <span className="text-[10px] text-primary bg-primary/5 group-hover:bg-primary group-hover:text-white px-2 py-0.5 rounded-lg transition-colors font-bold">
                                Ver
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Fijo */}
              {items.length > 0 && (
                <div className="p-6 border-t border-gray-100 bg-white z-10 shrink-0 shadow-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted font-medium">Total Estimado</span>
                    <span className="text-2xl font-black text-gray-900">{formatCurrency(getTotal())}</span>
                  </div>

                  <div className="relative">
                    <SmartHint 
                      stepId="cart_checkout" 
                      message="Verifica que toda la información esté correcta antes de realizar el pedido." 
                      position="top" 
                      delay={1000} 
                    />
                  </div>

                  <button
                    onClick={handleCheckoutClick}
                    className="w-full h-[60px] rounded-full bg-action text-white font-black uppercase tracking-widest transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 shadow-xl"
                  >
                    Ir a Pagar <ArrowRight size={20} />
                  </button>

                  <button
                    onClick={handleContinueShopping}
                    className="bg-transparent border-none text-gray-500 font-bold text-[13px] uppercase tracking-widest hover:text-gray-800 transition-colors mt-3 text-center block w-full mx-auto"
                  >
                    Seguir agregando productos
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />

      {selectedProductDetail && (
        <ProductDetailModal
          product={selectedProductDetail}
          isOpen={!!selectedProductDetail}
          onClose={() => setSelectedProductDetail(null)}
        />
      )}
    </>
  )
}
