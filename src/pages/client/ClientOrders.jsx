import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Clock, Truck, CheckCircle, XCircle, ChevronDown, Repeat, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClientOrders } from '../../hooks/useOrders'
import { useProducts } from '../../hooks/useInventory'
import useAuthStore from '../../store/authStore'
import useCartStore from '../../store/cartStore'
import useAppConfigStore from '../../store/appConfigStore'
import { ORDER_STATES, ORDER_STATE_LABELS, PAYMENT_METHOD_LABELS, GUIDED_MESSAGES } from '../../constants'
import { formatCurrency } from '../../utils/formatters'

const STATE_ICONS = {
  [ORDER_STATES.PENDING]: Clock,
  [ORDER_STATES.COMPLETED]: CheckCircle,
  [ORDER_STATES.CANCELLED]: XCircle,
}

const STATE_COLORS = {
  [ORDER_STATES.PENDING]: 'text-warning bg-warning/10 border-warning/20',
  [ORDER_STATES.COMPLETED]: 'text-success bg-success/10 border-success/20',
  [ORDER_STATES.CANCELLED]: 'text-red-500 bg-red-500/10 border-red-500/20',
}

const STATE_MESSAGES = {
  [ORDER_STATES.PENDING]: 'Tu pedido fue recibido y pronto será revisado.',
  [ORDER_STATES.COMPLETED]: 'Tu pedido fue completado correctamente.',
  [ORDER_STATES.CANCELLED]: 'Este pedido fue cancelado.',
}

export default function ClientOrders() {
  const { user } = useAuthStore()
  const { data: orders = [], isLoading } = useClientOrders(user?.celular)
  const { data: activeProducts = [] } = useProducts(true)
  const { addItem, setIsOpen } = useCartStore()
  const { config } = useAppConfigStore()
  const navigate = useNavigate()

  const [activeFilter, setActiveFilter] = useState('Todos')
  const [expandedOrderId, setExpandedOrderId] = useState(null)

  const filters = ['Todos', ORDER_STATES.PENDING, ORDER_STATES.COMPLETED, ORDER_STATES.CANCELLED]

  const filteredOrders = orders.filter(o => activeFilter === 'Todos' || o.estado === activeFilter)

  const handleRepeatOrder = (order) => {
    let someMissing = false
    order.items.forEach(oldItem => {
      const currentProduct = activeProducts.find(p => p.id === oldItem.productId)
      if (!currentProduct) {
        someMissing = true
        return
      }
      const currentVariant = currentProduct.variantes?.find(v => v.id === oldItem.variantId)
      if (!currentVariant || currentVariant.stock < 1) {
        someMissing = true
        return
      }

      addItem({
        ...currentProduct,
        selectedVariant: currentVariant,
        cartQuantity: 1
      })
    })

    if (someMissing) {
      alert('Algunos productos ya no están disponibles o están agotados, por lo que no se agregaron al carrito.')
    }
    
    setIsOpen(true)
    navigate('/tienda/catalogo')
  }

  const handleContactStore = (orderNumber) => {
    const phone = config?.contactPhone?.replace(/\D/g, '') || ''
    const message = encodeURIComponent(`Hola, quiero consultar mi pedido ${orderNumber}`)
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  return (
    <div className="p-4 pb-6 max-w-lg mx-auto md:max-w-3xl overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-app mb-1">Mis Pedidos</h1>
        <p className="text-sm text-muted">Aquí puedes consultar el estado de tus pedidos.</p>
      </motion.div>

      <div className="grid grid-cols-4 gap-1 sm:gap-2 w-full pb-2 mb-6">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`flex items-center justify-center text-center px-1 py-2 h-11 rounded-xl text-[10px] min-[360px]:text-[11px] sm:text-sm font-bold transition-all leading-none ${
              activeFilter === f
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface border border-app text-muted hover:text-app'
            }`}
          >
            {f === 'Todos' ? 'Todos' : ORDER_STATE_LABELS[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-surface rounded-3xl animate-pulse border border-app" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-20 h-20 mx-auto bg-surface-2 rounded-full flex items-center justify-center mb-4">
            <Package size={32} className="text-muted" />
          </div>
          <p className="text-app font-medium mb-1">No hay pedidos aquí</p>
          <p className="text-sm text-muted">Aquí aparecerán los pedidos que realices.</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id
              const StateIcon = STATE_ICONS[order.estado] || Clock
              const stateColor = STATE_COLORS[order.estado] || STATE_COLORS[ORDER_STATES.PENDING]
              
              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surface border border-app rounded-3xl overflow-hidden shadow-sm"
                >
                  <div 
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="p-5 cursor-pointer hover:bg-surface-2/30 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-mono font-bold text-app text-base">{order.orderNumber}</h3>
                        <p className="text-xs text-muted mt-0.5">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Reciente'}
                        </p>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${stateColor}`}>
                        <StateIcon size={14} />
                        {ORDER_STATE_LABELS[order.estado] || order.estado}
                      </div>
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm text-app font-medium mb-1">{order.items?.length || 0} productos</p>
                        <p className="text-xs text-muted px-2 py-0.5 bg-surface-2 rounded-md border border-app inline-block">
                          {PAYMENT_METHOD_LABELS[order.metodoPago] || order.metodoPago}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="text-lg font-black text-primary">{formatCurrency(order.total)}</p>
                        <ChevronDown size={20} className={`text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-app bg-surface-2/20"
                      >
                        <div className="p-5">
                          <div className={`p-3 rounded-xl border flex items-center gap-2 mb-5 ${stateColor}`}>
                            <StateIcon size={16} />
                            <p className="text-sm font-medium">{STATE_MESSAGES[order.estado] || 'Estado actualizado.'}</p>
                          </div>

                          <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Productos</h4>
                          <div className="space-y-3 mb-6">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="flex gap-3 items-center">
                                <div className="w-14 h-14 bg-surface rounded-xl border border-app overflow-hidden flex-shrink-0 relative">
                                  {item.imagen || item.imageUrl ? (
                                    <img src={item.imagen || item.imageUrl} alt={item.nombre} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-surface-2"><Package size={16} className="text-muted"/></div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-app leading-tight mb-1">{item.nombre}</p>
                                  <p className="text-xs text-muted">
                                    {item.atributos && Object.values(item.atributos).length > 0
                                      ? Object.values(item.atributos).join(' • ')
                                      : item.talla || item.color 
                                        ? [item.talla, item.color].filter(Boolean).join(' • ')
                                        : 'Única'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted mb-0.5">x{item.cantidad}</p>
                                  <p className="text-sm font-bold text-app">{formatCurrency(item.precio)}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-app">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleContactStore(order.orderNumber) }}
                              className="flex items-center justify-center gap-2 h-11 bg-surface border border-app text-app rounded-xl font-semibold text-sm hover:bg-surface-2 transition-colors"
                            >
                              <MessageCircle size={16} />
                              Contactar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRepeatOrder(order) }}
                              className="flex items-center justify-center gap-2 h-11 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-opacity active:scale-95"
                            >
                              <Repeat size={16} />
                              Repetir pedido
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
