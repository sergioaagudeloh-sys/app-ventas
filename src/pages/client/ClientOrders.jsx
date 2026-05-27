import { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Clock, Truck, CheckCircle, XCircle, ChevronDown, Repeat, MessageCircle, Archive, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClientOrders, useUpdateOrderStatus } from '../../hooks/useOrders'
import { useProducts } from '../../hooks/useInventory'
import * as orderService from '../../services/orderService'
import useAuthStore from '../../store/authStore'
import useCartStore from '../../store/cartStore'
import useAppConfigStore from '../../store/appConfigStore'
import { ORDER_STATES, ORDER_STATE_LABELS, PAYMENT_METHOD_LABELS, GUIDED_MESSAGES } from '../../constants'
import { formatCurrency } from '../../utils/formatters'

const STATE_ICONS = {
  [ORDER_STATES.PENDING]: Clock,
  [ORDER_STATES.COMPLETED]: CheckCircle,
  [ORDER_STATES.CANCELLED]: XCircle,
  [ORDER_STATES.CREDIT_APPROVED]: CreditCard,
}

const STATE_COLORS = {
  [ORDER_STATES.PENDING]: 'text-warning bg-warning/10 border-warning/20',
  [ORDER_STATES.COMPLETED]: 'text-success bg-success/10 border-success/20',
  [ORDER_STATES.CANCELLED]: 'text-red-500 bg-red-500/10 border-red-500/20',
  [ORDER_STATES.CREDIT_APPROVED]: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
}

const STATE_MESSAGES = {
  [ORDER_STATES.PENDING]: 'Tu pedido fue recibido y pronto será revisado.',
  [ORDER_STATES.COMPLETED]: 'Tu pedido fue completado correctamente.',
  [ORDER_STATES.CANCELLED]: 'Este pedido fue cancelado.',
  [ORDER_STATES.CREDIT_APPROVED]: 'Tu crédito ha sido aprobado y el pedido está confirmado.',
}

const EMPTY_STATE_MESSAGES = {
  Todos: {
    title: 'No hay pedidos aquí',
    description: 'Aquí aparecerán los pedidos que realices.'
  },
  [ORDER_STATES.PENDING]: {
    title: 'No hay pedidos aquí',
    description: 'Aquí aparecerán los pedidos pendientes.'
  },
  [ORDER_STATES.COMPLETED]: {
    title: 'No hay pedidos aquí',
    description: 'Aquí aparecerán los pedidos completados.'
  },
  [ORDER_STATES.CANCELLED]: {
    title: 'No hay pedidos aquí',
    description: 'Aquí aparecerán los pedidos cancelados.'
  },
  [ORDER_STATES.CREDIT_APPROVED]: {
    title: 'No hay pedidos aquí',
    description: 'Aquí aparecerán los pedidos con crédito aprobado.'
  }
}

// Componente principal premium para el historial y seguimiento de pedidos en tiempo real del cliente
export default function ClientOrders() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { data: orders = [], isLoading } = useClientOrders(user?.celular)
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOrderStatus()
  const { data: activeProducts = [] } = useProducts(true)
  const { addItem, openCart } = useCartStore()
  const { whatsappAdmin } = useAppConfigStore()
  const navigate = useNavigate()

  const [showHidden, setShowHidden] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(null)
  const [confirmContactOrder, setConfirmContactOrder] = useState(null)
  const [confirmRepeatOrder, setConfirmRepeatOrder] = useState(null)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
 
  const activeFilter = 'Todos'
  const matchesFilter = () => true

  const { activeOrders, hiddenOrders } = useMemo(() => {
    const active = []
    const hidden = []
    orders.forEach(o => {
      if (matchesFilter(o)) {
        if (o.ocultoCliente === true) {
          hidden.push(o)
        } else {
          active.push(o)
        }
      }
    })
    return { activeOrders: active, hiddenOrders: hidden }
  }, [orders, activeFilter])

  const handleRepeatOrder = (order) => {
    try {
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
          productId: currentProduct.id,
          variantId: currentVariant.id,
          nombre: currentProduct.nombre,
          precio: currentProduct.precioBase || oldItem.precio,
          talla: currentVariant.talla || null,
          color: currentVariant.color || null,
          imageUrl: currentProduct.imageUrl || null,
          maxStock: currentVariant.stock,
        }, oldItem.cantidad || 1)
      })

      if (someMissing) {
        alert('Algunos productos ya no están disponibles o están agotados, por lo que no se agregaron al carrito.')
      }
      
      openCart()
      navigate('/tienda/catalogo')
    } catch (e) {
      console.error(e)
    }
  }

  const handleContactStore = (orderNumber) => {
    const phone = whatsappAdmin?.replace(/\D/g, '') || ''
    const message = encodeURIComponent(`Hola, quiero consultar mi pedido ${orderNumber}`)
    window.open(`https://api.whatsapp.com/send/?phone=${phone}&text=${message}&type=phone_number&app_absent=0`, '_blank')
  }

  const handleCancelOrder = (order) => {
    setConfirmCancelOrder(order)
  }

  const hasCompletedOrCancelled = orders.some(
    o => o.estado === ORDER_STATES.COMPLETED || o.estado === ORDER_STATES.CANCELLED
  )

  const handleExecuteClearHistory = async () => {
    try {
      const completedOrCancelled = orders.filter(
        o => o.estado === ORDER_STATES.COMPLETED || o.estado === ORDER_STATES.CANCELLED
      )
      await orderService.clearClientOrderHistory(completedOrCancelled)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    } catch (error) {
      console.error("Error al vaciar historial:", error)
      alert("Hubo un error al vaciar el historial. Por favor intenta de nuevo.")
    }
  }

  const renderOrderCard = (order) => {
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
        className={`bg-surface border border-app rounded-3xl overflow-hidden shadow-sm transition-opacity duration-300 ${
          order.ocultoCliente ? 'opacity-65 hover:opacity-100' : ''
        }`}
      >
        <div 
          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
          className="p-5 cursor-pointer hover:bg-surface-2/30 transition-colors"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-app text-base">{order.orderNumber}</h3>
                {order.ocultoCliente && (
                  <span className="text-[9px] font-bold text-muted bg-surface-2 border border-app px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Vaciado
                  </span>
                )}
              </div>
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
                {order.estado === ORDER_STATES.CANCELLED && order.metodoPago === 'credito' ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 mb-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      <CreditCard size={14} />
                      Información sobre tu Crédito
                    </div>
                    <p className="text-xs leading-relaxed font-medium">
                      ¡Hola! Para habilitar compras a crédito (fiado), nuestro sistema requiere construir primero una relación de confianza y compras previas completadas con éxito. Te invitamos a seguir disfrutando de nuestros productos mediante pago directo (efectivo o transferencia), o a escribirle directamente a nuestro administrador para conocer más detalles sobre tu cuenta. ¡Queremos seguir creciendo juntos!
                    </p>
                  </div>
                ) : (
                  <div className={`p-3 rounded-xl border flex items-center gap-2 mb-5 ${stateColor}`}>
                    <StateIcon size={16} />
                    <p className="text-sm font-medium">{STATE_MESSAGES[order.estado] || 'Estado actualizado.'}</p>
                  </div>
                )}

                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Productos</h4>
                <div className="space-y-3">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botones de Acción Siempre Visibles */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="p-5 pt-0 border-t border-app bg-surface"
        >
          <div className="grid grid-cols-3 gap-2 pt-4">
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmContactOrder(order) }}
              className="flex items-center justify-center gap-1.5 h-11 bg-surface border border-app text-app rounded-xl font-semibold text-xs min-[380px]:text-sm hover:bg-surface-2 transition-colors cursor-pointer animate-none"
            >
              <MessageCircle size={16} />
              Contactar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmCancelOrder(order) }}
              disabled={order.estado !== ORDER_STATES.PENDING || isUpdating}
              className="flex items-center justify-center gap-1.5 h-11 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-semibold text-xs min-[380px]:text-sm hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer animate-none"
            >
              <XCircle size={16} />
              Cancelar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmRepeatOrder(order) }}
              className="flex items-center justify-center gap-1.5 h-11 bg-primary text-white rounded-xl font-bold text-xs min-[380px]:text-sm shadow-md hover:opacity-90 transition-opacity active:scale-95 cursor-pointer animate-none"
            >
              <Repeat size={16} />
              Repetir
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="p-4 pb-6 max-w-lg mx-auto md:max-w-3xl overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-app leading-tight">Mis Pedidos</h1>
          <p className="text-sm text-muted">Aquí puedes consultar el estado de tus pedidos.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {activeOrders.length > 0 && (
            <span className="h-9 px-3 bg-primary-soft border border-primary-soft text-primary rounded-xl text-xs font-bold flex items-center justify-center whitespace-nowrap">
              {activeOrders.length} activos
            </span>
          )}
          <button
            onClick={() => setShowConfirmClear(true)}
            disabled={!hasCompletedOrCancelled}
            className="flex items-center gap-1.5 px-3 h-9 bg-primary-soft text-primary border border-primary-soft rounded-xl text-xs font-bold hover:bg-primary/20 active:scale-95 transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Archive size={14} />
            Archivar historial
          </button>
        </div>
      </motion.div>



      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-surface rounded-3xl animate-pulse border border-app" />
          ))}
        </div>
      ) : (
        <>
          {activeOrders.length === 0 && hiddenOrders.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-20 h-20 mx-auto bg-surface-2 rounded-full flex items-center justify-center mb-4">
                <Package size={32} className="text-muted" />
              </div>
              <p className="text-app font-bold text-base mb-1">
                {EMPTY_STATE_MESSAGES[activeFilter]?.title || 'No hay pedidos aquí'}
              </p>
              <p className="text-sm text-muted px-4">
                {EMPTY_STATE_MESSAGES[activeFilter]?.description || 'Aquí aparecerán los pedidos que realices.'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Lista de Pedidos Activos */}
              {activeOrders.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <AnimatePresence>
                    {activeOrders.map(order => renderOrderCard(order))}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 bg-surface rounded-3xl border border-app text-muted">
                  <p className="text-sm text-muted font-bold">No hay pedidos activos.</p>
                </motion.div>
              )}
            </div>
          )}

          {/* Botón Ver Archivados Persistente (Siempre Visible) */}
          <div className="flex flex-col items-center gap-4 mt-6">
            {hiddenOrders.length === 0 ? (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-2 border border-app text-muted rounded-xl text-xs font-bold opacity-50 cursor-not-allowed uppercase tracking-wider"
              >
                Ver archivados (0)
              </button>
            ) : (
              <button
                onClick={() => setShowHidden(!showHidden)}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-app hover:bg-surface-2 text-app rounded-xl text-xs font-bold shadow-sm hover:border-primary transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                {showHidden ? 'Ocultar archivados' : `Ver archivados (Últimos ${Math.min(3, hiddenOrders.length)})`}
              </button>
            )}

            {/* Lista de Pedidos Ocultados */}
            <AnimatePresence>
              {showHidden && hiddenOrders.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full space-y-4 overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-1 my-3">
                    <div className="h-[1px] bg-app flex-1 opacity-20"></div>
                    <span className="text-[10px] font-black text-muted uppercase tracking-widest">Pedidos archivados</span>
                    <div className="h-[1px] bg-app flex-1 opacity-20"></div>
                  </div>
                  <div className="flex flex-col gap-4">
                    {hiddenOrders.slice(0, 3).map(order => renderOrderCard(order))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Modal de Confirmación de Cancelación */}
      <AnimatePresence>
        {confirmCancelOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setConfirmCancelOrder(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface border border-app rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <XCircle size={32} className="text-red-500" />
              </div>
              <h2 className="text-xl font-black text-app text-center mb-2">Cancelar Pedido</h2>
              <p className="text-sm text-muted text-center mb-6">
                ¿Estás seguro de que deseas cancelar el pedido <span className="font-mono font-bold text-app">{confirmCancelOrder.orderNumber}</span>?
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmCancelOrder(null)}
                  className="h-12 flex justify-center items-center rounded-xl font-bold text-app bg-surface-2 hover:bg-surface border border-app transition-colors animate-none"
                >
                  Regresar
                </button>
                <button
                  onClick={() => {
                    updateStatus({ id: confirmCancelOrder.id, newStatus: ORDER_STATES.CANCELLED, currentOrder: confirmCancelOrder })
                    setConfirmCancelOrder(null)
                  }}
                  disabled={isUpdating}
                  className="h-12 flex justify-center items-center rounded-xl font-bold text-white bg-red-500 shadow-md hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 animate-none"
                >
                  {isUpdating ? 'Cancelando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación de Contactar */}
      <AnimatePresence>
        {confirmContactOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setConfirmContactOrder(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface border border-app rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                <MessageCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-black text-app text-center mb-2">Contactar Soporte</h2>
              <p className="text-sm text-muted text-center mb-6">
                ¿Estás seguro de que deseas chatear por WhatsApp para consultar sobre tu pedido <span className="font-mono font-bold text-app">{confirmContactOrder.orderNumber}</span>? Se abrirá la aplicación de mensajería en tu dispositivo.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmContactOrder(null)}
                  className="h-12 flex justify-center items-center rounded-xl font-bold text-app bg-surface-2 hover:bg-surface border border-app transition-colors animate-none"
                >
                  Regresar
                </button>
                <button
                  onClick={() => {
                    handleContactStore(confirmContactOrder.orderNumber)
                    setConfirmContactOrder(null)
                  }}
                  className="h-12 flex justify-center items-center rounded-xl font-bold text-white bg-green-500 shadow-md hover:bg-green-600 transition-all active:scale-95 animate-none"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación de Repetir Pedido */}
      <AnimatePresence>
        {confirmRepeatOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setConfirmRepeatOrder(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface border border-app rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <Repeat size={32} className="text-primary" />
              </div>
              <h2 className="text-xl font-black text-app text-center mb-2">Repetir Pedido</h2>
              <p className="text-sm text-muted text-center mb-6">
                ¿Estás seguro de que deseas repetir el pedido <span className="font-mono font-bold text-app">{confirmRepeatOrder.orderNumber}</span>? Todos los productos disponibles en este pedido se añadirán a tu carrito actual y te llevaremos al catálogo.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmRepeatOrder(null)}
                  className="h-12 flex justify-center items-center rounded-xl font-bold text-app bg-surface-2 hover:bg-surface border border-app transition-colors animate-none"
                >
                  Regresar
                </button>
                <button
                  onClick={() => {
                    handleRepeatOrder(confirmRepeatOrder)
                    setConfirmRepeatOrder(null)
                  }}
                  className="h-12 flex justify-center items-center rounded-xl font-bold text-white bg-primary shadow-md hover:opacity-90 transition-all active:scale-95 animate-none"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación de Archivar Historial */}
      <AnimatePresence>
        {showConfirmClear && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowConfirmClear(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface border border-app rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-4 border border-primary-soft">
                <Archive size={32} className="text-primary" />
              </div>
              <h2 className="text-xl font-black text-app text-center mb-2">Archivar Historial</h2>
              <p className="text-sm text-muted text-center mb-6">
                ¿Estás seguro de que deseas archivar tu historial de pedidos completados y cancelados? Podrás seguir viéndolos y repetirlos desde la sección de archivados.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="h-12 flex justify-center items-center rounded-xl font-bold text-app bg-surface-2 hover:bg-surface border border-app transition-colors"
                >
                  Regresar
                </button>
                <button
                  onClick={async () => {
                    setShowConfirmClear(false)
                    await handleExecuteClearHistory()
                  }}
                  className="h-12 flex justify-center items-center rounded-xl font-bold text-white bg-primary shadow-md hover:opacity-90 transition-all active:scale-95"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
