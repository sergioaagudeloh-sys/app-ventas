import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, ShoppingBag, ArrowRight, Image as ImageIcon, Minus, Plus } from 'lucide-react'
import { formatCurrency, truncate } from '../../../utils/formatters'
import useCartStore from '../../../store/cartStore'
import useGuidedStore from '../../../store/guidedStore'
import CheckoutModal from '../checkout/CheckoutModal'
import SmartHint from '../guided/SmartHint'

export default function CartDrawer() {
  const { isOpen, closeCart, items, addItem, removeItem, deleteItem, getTotal } = useCartStore()
  const { hasCompletedStep, markStepCompleted } = useGuidedStore()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const navigate = useNavigate()

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
              onClick={closeCart}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-surface h-full shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-app bg-surface z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ShoppingBag size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-app">Tu Carrito</h2>
                </div>
                <button
                  onClick={closeCart}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-app transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto p-6 bg-app">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
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
                      className="mt-8 px-6 py-3 bg-surface border border-app text-app rounded-xl font-bold transition-all active:scale-95"
                    >
                      Seguir Comprando
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={`${item.productId}-${item.variantId}`} className="bg-surface rounded-2xl p-3 border border-app flex gap-4 items-center shadow-sm relative overflow-hidden">
                        {/* Img */}
                        <div className="w-20 h-24 rounded-xl bg-surface-2 overflow-hidden flex-shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted"><ImageIcon size={20} /></div>
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 py-1 pr-1 flex flex-col justify-between min-h-[96px]">
                          <div>
                            <h4 className="font-bold text-app text-sm leading-tight pr-6">{truncate(item.nombre, 35)}</h4>
                            <p className="text-[11px] text-muted mt-1 font-medium">
                              {item.talla && `Talla ${item.talla}`} {item.talla && item.color && '·'} {item.color && item.color}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 gap-2">
                            <p className="font-black text-primary text-sm">
                              {formatCurrency(item.precio * item.cantidad)}
                            </p>
                            
                            {/* Contador de Cantidad Refinado */}
                            <div className="flex items-center bg-surface-2/50 rounded-lg p-0.5 border border-app h-7">
                              <button
                                onClick={() => removeItem(item.productId, item.variantId)}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-app hover:bg-surface transition-colors active:scale-95"
                                disabled={item.cantidad <= 1}
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-6 text-center font-bold text-app text-xs">{item.cantidad}</span>
                              <button
                                onClick={() => addItem({ productId: item.productId, variantId: item.variantId })}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-app hover:bg-surface transition-colors active:scale-95"
                                disabled={item.cantidad >= 10}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Eliminar TODO el stack de esa variante */}
                        <button
                          onClick={() => deleteItem(item.productId, item.variantId)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-error hover:bg-error/10 transition-colors absolute top-2 right-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Fijo */}
              {items.length > 0 && (
                <div className="p-6 border-t border-app bg-surface z-10 shrink-0">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-muted font-medium">Total Estimado</span>
                    <span className="text-2xl font-black text-primary">{formatCurrency(getTotal())}</span>
                  </div>

                  <div className="relative mb-2">
                    <SmartHint 
                      stepId="cart_checkout" 
                      message="Verifica que toda la información esté correcta antes de realizar el pedido." 
                      position="top" 
                      delay={1000} 
                    />
                  </div>

                  <button
                    onClick={handleCheckoutClick}
                    className="w-full h-14 bg-action text-white rounded-2xl font-bold text-base transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 shadow-lg shadow-action"
                  >
                    Ir a Pagar <ArrowRight size={20} />
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
    </>
  )
}
