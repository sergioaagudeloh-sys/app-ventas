import { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Clock, Truck, CheckCircle, XCircle, ChevronDown, Repeat, MessageCircle, Archive, CreditCard, FileText, ShieldAlert, PackagePlus } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useClientOrders, useUpdateOrderStatus } from '../../hooks/useOrders'
import { useClientWholesaleRequests } from '../../hooks/useWholesale'
import { useProducts } from '../../hooks/useInventory'
import * as orderService from '../../services/orderService'
import * as wholesaleService from '../../services/wholesaleService'
import useAuthStore from '../../store/authStore'
import useCartStore from '../../store/cartStore'
import useAppConfigStore from '../../store/appConfigStore'
import { ORDER_STATES, ORDER_STATE_LABELS, PAYMENT_METHOD_LABELS, GUIDED_MESSAGES, SUPPORT_WHATSAPP } from '../../constants'
import { formatCurrency } from '../../utils/formatters'
import ClaimRequestModal from '../../components/client/claims/ClaimRequestModal'

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
  const { data: orders = [], isLoading: isLoadingOrders } = useClientOrders(user?.celular)
  const { data: wholesaleRequests = [], isLoading: isLoadingWholesale } = useClientWholesaleRequests(user?.celular)
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOrderStatus()
  const { data: activeProducts = [] } = useProducts(true)
  const { addItem, openCart } = useCartStore()
  const { whatsappAdmin, appName, appIcon, claimsEnabled, wholesaleSettings, orderTrackingEnabled } = useAppConfigStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [activeTab, setActiveTab] = useState('normal') // 'normal' o 'especial'
  const [showHidden, setShowHidden] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [expandedWholesaleId, setExpandedWholesaleId] = useState(null)
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(null)
  const [confirmContactOrder, setConfirmContactOrder] = useState(null)
  const [confirmRepeatOrder, setConfirmRepeatOrder] = useState(null)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [claimOrder, setClaimOrder] = useState(null)

  const isLoading = isLoadingOrders || isLoadingWholesale

  const visibleWholesaleCount = useMemo(() => {
    return wholesaleRequests.filter(r => {
      if (wholesaleSettings?.enabled === false && r.tipo !== 'encargo') {
        return false
      }
      return true
    }).length
  }, [wholesaleRequests, wholesaleSettings])

  // Si el cliente no tiene pedidos especiales visibles y estaba en esa pestaña, regresarlo a normal
  useEffect(() => {
    if (visibleWholesaleCount === 0 && activeTab === 'especial') {
      setActiveTab('normal')
    }
  }, [visibleWholesaleCount, activeTab])

  // Resetear showHidden al cambiar de pestaña
  useEffect(() => {
    setShowHidden(false)
  }, [activeTab])

  // Abrir y expandir automáticamente el pedido si viene desde una notificación
  useEffect(() => {
    if (location.state?.highlightOrderId) {
      setExpandedOrderId(location.state.highlightOrderId)
      
      // Limpiar el estado para evitar que se vuelva a abrir al recargar o navegar de vuelta
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate])
 
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

  const { activeWholesale, hiddenWholesale } = useMemo(() => {
    const active = []
    const hidden = []
    wholesaleRequests.forEach(r => {
      if (wholesaleSettings?.enabled === false && r.tipo !== 'encargo') {
        return
      }
      if (r.ocultoCliente === true) {
        hidden.push(r)
      } else {
        active.push(r)
      }
    })
    return { activeWholesale: active, hiddenWholesale: hidden }
  }, [wholesaleRequests, wholesaleSettings])

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
    const phone = whatsappAdmin?.replace(/\D/g, '') || SUPPORT_WHATSAPP?.replace(/\D/g, '') || ''
    const seller = useAppConfigStore.getState().sellerName || 'el Administrador'
    const shop = useAppConfigStore.getState().appName || 'la Tienda'
    const message = encodeURIComponent(`Hola ${seller} de *${shop}*, quiero consultar mi pedido ${orderNumber}`)
    window.open(`https://api.whatsapp.com/send/?phone=${phone}&text=${message}&type=phone_number&app_absent=0`, '_blank')
  }

  const handlePrintReceipt = (order) => {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)
    
    iframe.contentDocument.write(`
      <html>
        <head>
          <title>Factura Pedido ${order.orderNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #000; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .header img.logo { max-width: 150px; max-height: 80px; margin-bottom: 15px; object-fit: contain; }
            .header h1 { margin: 0 0 5px 0; font-size: 24px; text-transform: uppercase; }
            .header p { margin: 0 0 5px 0; font-size: 14px; color: #555; }
            .order-meta { margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc; font-weight: bold; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 14px; }
            .info-box { border: 1px solid #ccc; padding: 15px; border-radius: 8px; }
            .info-box h3 { margin-top: 0; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            th { text-align: left; padding: 10px; border-bottom: 2px solid #000; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .text-right { text-align: right; }
            .total-row { font-size: 18px; font-weight: bold; border-top: 2px solid #000; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${appIcon ? `<img src="${appIcon}" alt="Logo" class="logo" />` : ''}
            <h1>${appName || 'Factura de Venta'}</h1>
            ${whatsappAdmin ? `<p>WhatsApp: ${whatsappAdmin}</p>` : ''}
            
            <div class="order-meta">
              <p>Comprobante de Pedido #${order.orderNumber}</p>
              <p>Fecha: ${order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : new Date().toLocaleString()}</p>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>Datos del Cliente</h3>
              <p><strong>Nombre:</strong> ${order.cliente?.nombre || 'N/A'}</p>
              <p><strong>Celular:</strong> ${order.cliente?.celular || 'N/A'}</p>
            </div>
            <div class="info-box">
              <h3>Datos de Envío</h3>
              <p><strong>Dirección:</strong> ${order.cliente?.direccion || 'Recogida en Tienda'}</p>
              <p><strong>Ciudad/Barrio:</strong> ${order.cliente?.ciudad || ''} - ${order.cliente?.barrio || ''}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th class="text-right">Precio Unit.</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>
                    <strong>${item.nombre}</strong><br/>
                    <small style="color: #666;">
                      ${item.atributos && Object.values(item.atributos).length > 0
                        ? Object.values(item.atributos).join(' • ')
                        : item.talla || item.color 
                          ? [item.talla, item.color].filter(Boolean).join(' • ')
                          : ''}
                    </small>
                  </td>
                  <td>${item.cantidad}</td>
                  <td class="text-right">${formatCurrency(item.precio)}</td>
                  <td class="text-right">${formatCurrency(item.precio * item.cantidad)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3" class="text-right" style="padding-top: 15px;">TOTAL A PAGAR:</td>
                <td class="text-right" style="padding-top: 15px;">${formatCurrency(order.total)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            <p>Gracias por tu compra.</p>
            <p>Este documento es un comprobante de tu pedido.</p>
          </div>
        </body>
      </html>
    `)
    iframe.contentDocument.close()

    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 500)
  }

  const handleCancelOrder = (order) => {
    setConfirmCancelOrder(order)
  }

  const hasCompletedOrCancelled = orders.some(
    o => (o.estado === ORDER_STATES.COMPLETED || o.estado === ORDER_STATES.CANCELLED) && o.ocultoCliente !== true
  )

  const hasRejectedWholesale = wholesaleRequests.some(
    r => r.estado === 'rechazado' && r.ocultoCliente !== true
  )

  const handleExecuteClearHistory = async () => {
    try {
      const completedOrCancelled = orders.filter(
        o => (o.estado === ORDER_STATES.COMPLETED || o.estado === ORDER_STATES.CANCELLED) && o.ocultoCliente !== true
      )
      await orderService.clearClientOrderHistory(completedOrCancelled)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    } catch (error) {
      console.error("Error al vaciar historial:", error)
      alert("Hubo un error al vaciar el historial. Por favor intenta de nuevo.")
    }
  }

  const handleExecuteClearWholesaleHistory = async () => {
    try {
      const rejectedRequests = wholesaleRequests.filter(
        r => r.estado === 'rechazado' && r.ocultoCliente !== true
      )
      await wholesaleService.clearClientWholesaleHistory(rejectedRequests)
      queryClient.invalidateQueries({ queryKey: ['clientWholesaleRequests', user?.celular] })
    } catch (error) {
      console.error("Error al vaciar historial de especiales:", error)
      alert("Hubo un error al vaciar el historial de pedidos especiales. Por favor intenta de nuevo.")
    }
  }

  const getWholesaleStatusBadge = (state) => {
    switch (state) {
      case 'pendiente':
        return 'text-warning bg-warning/10 border-warning/20'
      case 'revisando':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
      case 'aprobado':
        return 'text-success bg-success/10 border-success/20'
      case 'rechazado':
        return 'text-red-500 bg-red-500/10 border-red-500/20'
      default:
        return 'text-muted bg-surface-2'
    }
  }

  const getWholesaleStatusLabel = (state) => {
    switch (state) {
      case 'pendiente': return 'Pendiente'
      case 'revisando': return 'En Revisión'
      case 'aprobado': return 'Aprobado'
      case 'rechazado': return 'Rechazado'
      default: return state
    }
  }

  const handleContactWholesale = (req) => {
    const phone = whatsappAdmin?.replace(/\D/g, '') || SUPPORT_WHATSAPP?.replace(/\D/g, '') || ''
    const concept = req.tipo === 'encargo' ? 'por encargo' : 'al por mayor'
    const seller = useAppConfigStore.getState().sellerName || 'el Administrador'
    const shop = useAppConfigStore.getState().appName || 'la Tienda'
    const message = encodeURIComponent(`Hola ${seller} de *${shop}*, te escribo para consultar el estado de mi solicitud ${concept} de "${req.productoNombre}" (Cantidad: ${req.cantidad}) que figura como *${getWholesaleStatusLabel(req.estado)}*.`)
    window.open(`https://api.whatsapp.com/send/?phone=${phone}&text=${message}&type=phone_number&app_absent=0`, '_blank')
  }

  const renderWholesaleCard = (req) => {
    const isExpanded = expandedWholesaleId === req.id
    const isEncargo = req.tipo === 'encargo'
    const stateBadge = getWholesaleStatusBadge(req.estado)
    const stateLabel = getWholesaleStatusLabel(req.estado)
    
    return (
      <motion.div
        key={req.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface border border-app rounded-3xl overflow-hidden shadow-sm transition-opacity duration-300"
      >
        <div 
          onClick={() => setExpandedWholesaleId(isExpanded ? null : req.id)}
          className="p-5 cursor-pointer hover:bg-surface-2/30 transition-colors"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider ${
                isEncargo 
                  ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' 
                  : 'text-primary bg-primary/10 border-primary/20'
              }`}>
                {isEncargo ? 'Por Encargo' : 'Al Por Mayor'}
              </span>
              <p className="text-xs text-muted mt-2">
                Solicitado: {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${stateBadge}`}>
              <Clock size={14} />
              {stateLabel}
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <h3 className="font-bold text-app text-sm leading-tight line-clamp-1">{req.productoNombre}</h3>
              <p className="text-xs text-muted mt-1">Cantidad: {req.cantidad} unidades</p>
            </div>
            <div className="text-right flex items-center gap-3">
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
              <div className="p-5 space-y-4">
                <div className="bg-surface border border-app rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Concepto:</span>
                    <span className="font-bold text-app">{isEncargo ? 'Pedido Especial sin Stock' : 'Compra Mayorista Mín. 12 Uds'}</span>
                  </div>
                  {req.observaciones && (
                    <div className="pt-2 border-t border-app">
                      <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1">Tus notas o especificaciones:</p>
                      <p className="text-xs text-app leading-relaxed italic bg-surface-2 p-2 rounded-lg">"{req.observaciones}"</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-app">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleContactWholesale(req) }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-green-500 text-white rounded-xl font-bold text-xs hover:bg-green-600 transition-colors shadow-sm"
                  >
                    <MessageCircle size={14} />
                    Consultar por WhatsApp
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
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
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-app font-medium">{order.items?.length || 0} productos</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted px-2 py-0.5 bg-surface-2 rounded-md border border-app">
                  {PAYMENT_METHOD_LABELS[order.metodoPago] || order.metodoPago}
                </span>
                {order.tipoEntrega === 'domicilio' ? (
                  <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md">
                    🛵 Domicilio{order.costoEnvio > 0 ? ` · +${formatCurrency(order.costoEnvio)}` : ''}
                  </span>
                ) : (
                  <span className="text-xs text-muted px-2 py-0.5 bg-surface-2 rounded-md border border-app">
                    🏪 Retiro en tienda
                  </span>
                )}
              </div>
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

                {/* Detalle de Entrega */}
                <div className="mb-5 p-4 bg-surface rounded-2xl border border-app">
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    {order.tipoEntrega === 'domicilio' ? '🛵' : '🏪'}
                    {order.tipoEntrega === 'domicilio' ? 'Entrega a Domicilio' : 'Retiro en Tienda'}
                  </h4>
                  {order.tipoEntrega === 'domicilio' ? (
                    <div className="space-y-0.5">
                      {order.cliente?.direccion && (
                        <p className="text-sm font-medium text-app">{order.cliente.direccion}</p>
                      )}
                      {order.cliente?.barrio && (
                        <p className="text-xs text-muted">{order.cliente.barrio}{order.cliente?.ciudad ? `, ${order.cliente.ciudad}` : ''}</p>
                      )}
                      {order.costoEnvio > 0 ? (
                        <p className="text-xs font-bold text-primary mt-1">Costo de envío: {formatCurrency(order.costoEnvio)}</p>
                      ) : (
                        <p className="text-xs text-muted italic mt-1">El costo de envío será acordado con el negocio.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Recoge tu pedido directamente en nuestra tienda.</p>
                  )}
                </div>

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
                        <p className="text-xs text-muted leading-tight">
                          {item.atributos && Object.values(item.atributos).length > 0
                            ? Object.values(item.atributos).join(' • ')
                            : item.talla || item.color 
                              ? [item.talla, item.color].filter(Boolean).join(' • ')
                              : 'Única'}
                        </p>
                        {item.descripcion && (
                          <p className="text-[11px] text-muted italic mt-1 bg-surface-2 px-1.5 py-0.5 rounded border border-app/20 w-fit">
                            Detalle: {item.descripcion}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted mb-0.5">x{item.cantidad}</p>
                        <p className="text-sm font-bold text-app">{formatCurrency(item.precio)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desglose Financiero con Domicilio para Cliente */}
                <div className="mt-4 pt-4 border-t border-app space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(order.subtotal || (order.total - (order.costoEnvio || 0)))}</span>
                  </div>
                  {order.tipoEntrega === 'domicilio' && (
                    <div className="flex justify-between text-muted">
                      <span>🛵 Domicilio:</span>
                      <span className="font-semibold text-primary">+{formatCurrency(order.costoEnvio || 0)}</span>
                    </div>
                  )}
                  {order.descuento > 0 && (
                    <div className="flex justify-between text-muted">
                      <span>🏷️ Descuento:</span>
                      <span className="font-semibold text-green-500">-{formatCurrency(order.descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-app font-black text-base pt-1 border-t border-app/50">
                    <span>Total a Pagar:</span>
                    <span className="text-primary">{formatCurrency(order.total)}</span>
                  </div>
                </div>

                {/* Botón de Seguimiento en Tiempo Real / En Vivo */}
                {orderTrackingEnabled && order.trackingToken && (
                  <div className="mt-4 pt-3 border-t border-app/50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/pedido/status?t=${order.trackingToken}`)
                      }}
                      className="w-full flex items-center justify-center gap-2 h-11 bg-primary text-white rounded-xl font-bold text-xs shadow-md hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      🚀 Ver Seguimiento en Tiempo Real
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botones de Acción Siempre Visibles */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="p-5 pt-0 border-t border-app bg-surface"
        >
          {order.estado === ORDER_STATES.COMPLETED && (
            <div className="flex flex-col gap-2 mb-3">
              <button
                onClick={(e) => { e.stopPropagation(); handlePrintReceipt(order) }}
                className="w-full flex items-center justify-center gap-2 h-11 bg-emerald-500 text-white rounded-xl font-bold text-xs min-[380px]:text-sm shadow-md hover:bg-emerald-600 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <FileText size={16} />
                Descargar Factura
              </button>
              {claimsEnabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); setClaimOrder(order) }}
                  className="w-full flex items-center justify-center gap-2 h-11 bg-surface border border-primary/30 text-primary rounded-xl font-bold text-xs min-[380px]:text-sm shadow-sm hover:bg-primary/[0.03] transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <ShieldAlert size={16} />
                  Solicitar Garantía / Cambio
                </button>
              )}
            </div>
          )}
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
    <div className="p-4 pb-6 w-full max-w-7xl mx-auto lg:px-8 overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-app leading-tight">Mis Pedidos</h1>
          <p className="text-sm text-muted">Aquí puedes consultar el estado de tus pedidos.</p>
        </div>
        {activeTab === 'normal' ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            {activeOrders.length > 0 && (
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full border-none h-fit flex items-center justify-center whitespace-nowrap">
                {activeOrders.length} activos
              </span>
            )}
            <button
              onClick={() => setShowConfirmClear(true)}
              disabled={!hasCompletedOrCancelled}
              className="flex items-center gap-1.5 px-3 h-9 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold active:scale-95 transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Archive size={14} />
              Archivar historial
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0">
            {activeWholesale.length > 0 && (
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full border-none h-fit flex items-center justify-center whitespace-nowrap">
                {activeWholesale.length} activos
              </span>
            )}
            <button
              onClick={() => setShowConfirmClear(true)}
              disabled={!hasRejectedWholesale}
              className="flex items-center gap-1.5 px-3 h-9 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold active:scale-95 transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Archive size={14} />
              Archivar historial
            </button>
          </div>
        )}
      </motion.div>

      {/* Selector Dinámico de Pestañas (Solo si hay pedidos especiales/encargos visibles) */}
      {visibleWholesaleCount > 0 && (
        <div className="flex gap-2 p-1 bg-surface-2 border border-slate-100 rounded-2xl mb-6">
          <button
            onClick={() => setActiveTab('normal')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'normal'
                ? 'bg-surface text-primary shadow-[0_2px_10px_-3px_rgba(156,39,176,0.2)]'
                : 'text-slate-500 hover:text-app'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Pedidos Comunes</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors duration-150 ${activeTab === 'normal' ? 'bg-primary/10 text-primary' : 'bg-slate-200/60 text-slate-500'}`}>
              {orders.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('especial')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'especial'
                ? 'bg-surface text-primary shadow-[0_2px_10px_-3px_rgba(156,39,176,0.2)]'
                : 'text-slate-500 hover:text-app'
            }`}
          >
            <PackagePlus className="w-4 h-4 shrink-0" />
            <span>Pedidos Especiales</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors duration-150 ${activeTab === 'especial' ? 'bg-primary/10 text-primary' : 'bg-slate-200/60 text-slate-500'}`}>
              {visibleWholesaleCount}
            </span>
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-surface rounded-3xl animate-pulse border border-app" />
          ))}
        </div>
      ) : activeTab === 'especial' ? (
        <>
          {activeWholesale.length === 0 && hiddenWholesale.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-20 h-20 mx-auto bg-surface-2 rounded-full flex items-center justify-center mb-4">
                <PackagePlus size={32} className="text-muted" />
              </div>
              <p className="text-app font-bold text-base mb-1">
                No hay pedidos especiales aquí
              </p>
              <p className="text-sm text-muted px-4">
                Aquí aparecerán las solicitudes de pedidos especiales que realices.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {activeWholesale.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <AnimatePresence>
                    {activeWholesale.map(req => renderWholesaleCard(req))}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 bg-surface rounded-3xl border border-app text-muted">
                  <p className="text-sm text-muted font-bold">No hay pedidos especiales activos.</p>
                </motion.div>
              )}
            </div>
          )}

          {/* Botón Ver Archivados Persistente para Especiales */}
          <div className="flex flex-col items-center gap-4 mt-6">
            {hiddenWholesale.length === 0 ? (
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
                {showHidden ? 'Ocultar archivados' : `Ver archivados (Últimos ${Math.min(3, hiddenWholesale.length)})`}
              </button>
            )}

            {/* Lista de Pedidos Especiales Ocultados */}
            <AnimatePresence>
              {showHidden && hiddenWholesale.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full space-y-4 overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-1 my-3">
                    <div className="h-[1px] bg-app flex-1 opacity-20"></div>
                    <span className="text-[10px] font-black text-muted uppercase tracking-widest">Especiales archivados</span>
                    <div className="h-[1px] bg-app flex-1 opacity-20"></div>
                  </div>
                  <div className="flex flex-col gap-4">
                    {hiddenWholesale.slice(0, 3).map(req => renderWholesaleCard(req))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
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
                {activeTab === 'normal'
                  ? '¿Estás seguro de que deseas archivar tu historial de pedidos completados y cancelados? Podrás seguir viéndolos y repetirlos desde la sección de archivados.'
                  : '¿Estás seguro de que deseas archivar tu historial de pedidos especiales rechazados? Podrás seguir viéndolos desde la sección de archivados.'}
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
                    if (activeTab === 'normal') {
                      await handleExecuteClearHistory()
                    } else {
                      await handleExecuteClearWholesaleHistory()
                    }
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

      {claimOrder && (
        <ClaimRequestModal
          isOpen={!!claimOrder}
          onClose={() => setClaimOrder(null)}
          order={claimOrder}
        />
      )}
    </div>
  )
}
