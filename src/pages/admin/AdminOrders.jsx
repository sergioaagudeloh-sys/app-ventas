import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Clock, Package, CheckCircle, Search, ChevronDown, MapPin, FileText, XCircle, X, MessageCircle, DollarSign, Archive, CreditCard, Calendar, PackagePlus, Phone, ExternalLink, ShieldAlert, QrCode } from 'lucide-react'
import { useOrders, useUpdateOrderStatus } from '../../hooks/useOrders'
import { useCredits } from '../../hooks/useCredits'
import { useWholesaleRequests, useUpdateWholesaleStatus } from '../../hooks/useWholesale'
import { ORDER_STATES, ORDER_STATE_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, WHOLESALE_STATES } from '../../constants'
import { formatCurrency } from '../../utils/formatters'
import useAppConfigStore from '../../store/appConfigStore'
import usePortalStore from '../../store/portalStore'
import * as orderService from '../../services/orderService'
import { DatePickerPortal as CustomDatePickerPortal } from '../../components/ui/DatePicker'
import * as wholesaleService from '../../services/wholesaleService'
import { fuzzyMatch } from '../../utils/search'
import { subscribeToClaims } from '../../services/claimsService'
import LeafletMapPicker from '../../components/ui/LeafletMapPicker'
import OrderShareModal from '../../components/admin/orders/OrderShareModal'
import OrderDeliveryPanel from '../../components/admin/orders/OrderDeliveryPanel'
import NumberInput from '../../components/ui/NumberInput'

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

const NEXT_STATES = {
  [ORDER_STATES.PENDING]: ORDER_STATES.COMPLETED,
  [ORDER_STATES.COMPLETED]: null,
  [ORDER_STATES.CANCELLED]: null,
  [ORDER_STATES.CREDIT_APPROVED]: null,
}

export default function AdminOrders() {
  const { data: orders = [], isLoading } = useOrders()
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus()
  const { appName, appIcon, whatsappAdmin, deliverySettings, claimsEnabled, creditsEnabled, couponsEnabled } = useAppConfigStore()
  const { data: credits = [] } = useCredits('activo')
  const { data: wholesaleRequests = [] } = useWholesaleRequests()
  const { mutate: updateWholesaleStatus } = useUpdateWholesaleStatus()
  const navigate = useNavigate()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingClaimsCount, setPendingClaimsCount] = useState(0)
  const [selectedOrderForShare, setSelectedOrderForShare] = useState(null)
  
  // Consumir el store del portal para validación de permisos por rol de empleado
  const { portalEmployee } = usePortalStore()

  useEffect(() => {
    const unsubscribe = subscribeToClaims((claimsList) => {
      const pendingCount = claimsList.filter(c => c.status === 'PENDING').length
      setPendingClaimsCount(pendingCount)
    })
    return () => unsubscribe()
  }, [])

  const [activeFilter, setActiveFilter] = useState('Todos')
  const [showArchived, setShowArchived] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [filterDate, setFilterDate] = useState('')
  const [isArchiving, setIsArchiving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [showWholesaleModal, setShowWholesaleModal] = useState(false)
  const [tempDeliveryCosts, setTempDeliveryCosts] = useState({})
  const [savedPriceModal, setSavedPriceModal] = useState({ isOpen: false, orderNumber: '', value: 0 })
  const triggerRef = useRef(null)

  const pendingWholesaleCount = useMemo(() => {
    return wholesaleRequests.filter(r => r.estado === 'pendiente').length
  }, [wholesaleRequests])
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [currentArchivedPage, setCurrentArchivedPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  // ─── Métricas Rápidas ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    let pendientes = 0
    let completados = 0
    const totalFiados = credits.reduce((sum, c) => sum + c.saldoPendiente, 0)

    orders.forEach(o => {
      if (!creditsEnabled && o.metodoPago === PAYMENT_METHODS.CREDIT) return
      if (o.estado === ORDER_STATES.PENDING) pendientes++
      if (o.estado === ORDER_STATES.COMPLETED) completados++
    })

    const items = [
      { label: 'Pendientes', value: pendientes, icon: Clock, color: 'text-warning' },
      { label: 'Completados', value: completados, icon: CheckCircle, color: 'text-success' },
    ]

    if (creditsEnabled) {
      items.push({ label: 'Créditos', value: formatCurrency(totalFiados), icon: CreditCard, color: 'text-primary', path: '/admin/credito' })
    }

    return items
  }, [orders, credits, creditsEnabled])

  // ─── Filtrado ──────────────────────────────────────────────────────────
  const filters = ['Todos', ORDER_STATES.PENDING, ORDER_STATES.COMPLETED, ORDER_STATES.CREDIT_APPROVED, ORDER_STATES.CANCELLED]

  const matchesSearchAndFilter = (order) => {
    if (!creditsEnabled && order.metodoPago === PAYMENT_METHODS.CREDIT) return false
    
    const matchesSearch = 
      fuzzyMatch(order.orderNumber, searchTerm) ||
      fuzzyMatch(order.cliente?.nombre, searchTerm) ||
      fuzzyMatch(order.cliente?.celular, searchTerm)
    
    let matchesFilter = false
    if (activeFilter === 'Todos') {
      matchesFilter = true
    } else {
      matchesFilter = order.estado === activeFilter
    }

    // Filtrar adicionalmente por fecha si se seleccionó una y estamos en Completado
    let matchesDate = true
    if (activeFilter === ORDER_STATES.COMPLETED && filterDate) {
      if (order.createdAt) {
        const dateObj = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
        const orderDateStr = dateObj.toISOString().split('T')[0] // Formato YYYY-MM-DD
        matchesDate = orderDateStr === filterDate
      } else {
        matchesDate = false
      }
    }

    return matchesSearch && matchesFilter && matchesDate
  }

  const { activeOrders, archivedOrders } = useMemo(() => {
    const active = []
    const archived = []
    orders.forEach(order => {
      if (matchesSearchAndFilter(order)) {
        if (order.archivado === true) {
          archived.push(order)
        } else {
          active.push(order)
        }
      }
    })
    return { activeOrders: active, archivedOrders: archived }
  }, [orders, searchTerm, activeFilter, filterDate])

  // Resetear páginas actuales si cambian los filtros o el término de búsqueda
  useMemo(() => {
    setCurrentPage(1)
    setCurrentArchivedPage(1)
  }, [searchTerm, activeFilter, filterDate])

  // Obtener pedidos para la página actual
  const paginatedActiveOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return activeOrders.slice(startIndex, endIndex)
  }, [activeOrders, currentPage])

  const totalPages = useMemo(() => {
    return Math.ceil(activeOrders.length / ITEMS_PER_PAGE)
  }, [activeOrders])

  // Obtener pedidos archivados para la página actual
  const paginatedArchivedOrders = useMemo(() => {
    const startIndex = (currentArchivedPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return archivedOrders.slice(startIndex, endIndex)
  }, [archivedOrders, currentArchivedPage])

  const totalArchivedPages = useMemo(() => {
    return Math.ceil(archivedOrders.length / ITEMS_PER_PAGE)
  }, [archivedOrders])

  const handleArchiveCompleteds = async () => {
    // Filtrar pedidos que sean de estado Completado o Cancelado y no estén archivados
    const toArchive = orders.filter(o => 
      (o.estado === ORDER_STATES.COMPLETED || o.estado === ORDER_STATES.CANCELLED) && 
      !o.archivado
    )

    if (toArchive.length === 0) {
      alert('No hay pedidos completados o cancelados activos para archivar.')
      return
    }

    if (window.confirm(`¿Estás seguro de que deseas archivar ${toArchive.length} pedidos completados/cancelados?`)) {
      try {
        setIsArchiving(true)
        await orderService.archiveOrders(toArchive)
        alert('Pedidos archivados correctamente.')
      } catch (err) {
        console.error(err)
        alert('Ocurrió un error al archivar los pedidos.')
      } finally {
        setIsArchiving(false)
      }
    }
  }

  // ─── Acciones ──────────────────────────────────────────────────────────
  const handleStatusChange = (order, newStatus, e) => {
    if (e) e.stopPropagation()
    
    if (newStatus === ORDER_STATES.COMPLETED) {
      const confirmMsg = `¿Estás seguro de marcar el pedido ${order.orderNumber} como Completado?\n\nEsta acción descontará definitivamente el stock del inventario.`
      setConfirmDialog({ 
        order, 
        newStatus, 
        message: confirmMsg, 
        title: 'Completar Pedido', 
        iconColor: 'text-green-500', 
        iconBg: 'bg-green-500/10',
        iconBorder: 'border-green-500/20',
        btnBg: 'bg-green-500'
      })
    } else if (newStatus === ORDER_STATES.CREDIT_APPROVED) {
      const confirmMsg = `¿Estás seguro de Aprobar el Crédito para el pedido ${order.orderNumber}?\n\nEsta acción descontará definitivamente el stock del inventario y generará la cuenta por cobrar en la pestaña de créditos.`
      setConfirmDialog({ 
        order, 
        newStatus, 
        message: confirmMsg, 
        title: 'Aprobar Crédito', 
        iconColor: 'text-blue-500', 
        iconBg: 'bg-blue-500/10',
        iconBorder: 'border-blue-500/20',
        btnBg: 'bg-blue-500'
      })
    } else if (newStatus === ORDER_STATES.CANCELLED) {
      setConfirmDialog({ 
        order, 
        newStatus, 
        message: `¿Seguro que quieres cancelar el pedido ${order.orderNumber}?`, 
        title: 'Cancelar Pedido', 
        iconColor: 'text-red-500', 
        iconBg: 'bg-red-500/10',
        iconBorder: 'border-red-500/20',
        btnBg: 'bg-red-500'
      })
    } else {
      updateStatus({ id: order.id, newStatus, currentOrder: order })
    }
  }

  const confirmStatusChange = () => {
    if (confirmDialog) {
      updateStatus({ id: confirmDialog.order.id, newStatus: confirmDialog.newStatus, currentOrder: confirmDialog.order })
      setConfirmDialog(null)
    }
  }

  const handlePrintReceipt = (order) => {
    // Usamos un iframe oculto para evitar el bloqueo de ventanas emergentes (pop-ups)
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
              <h3>Datos de Entrega / Mesa</h3>
              ${order.tipoEntrega === 'mesa'
                ? `<p><strong>Tipo:</strong> Consumo en Salón</p><p><strong>Mesa:</strong> ${order.tableName || 'N/A'}</p>`
                : `<p><strong>Dirección:</strong> ${order.cliente?.direccion || 'Recogida en Tienda'}</p>
                   <p><strong>Ciudad/Barrio:</strong> ${order.cliente?.ciudad || ''} - ${order.cliente?.barrio || ''}</p>`
              }
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

    // Esperar a que renderice y luego imprimir
    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      // Limpiar el iframe del documento después de imprimir
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 500)
  }

  const handleContactClient = (phone, orderNumber) => {
    const cleanPhone = phone?.replace(/\D/g, '') || ''
    const message = encodeURIComponent(`Hola, te escribimos de la tienda sobre tu pedido ${orderNumber}`)
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank')
  }

  const renderOrderCard = (order) => {
    const StateIcon = STATE_ICONS[order.estado] || Clock
    const stateColors = STATE_COLORS[order.estado] || STATE_COLORS[ORDER_STATES.PENDING]
    const isExpanded = expandedOrderId === order.id
    const nextStateName = order.estado === ORDER_STATES.PENDING
      ? (order.metodoPago === PAYMENT_METHODS.CREDIT ? ORDER_STATES.CREDIT_APPROVED : ORDER_STATES.COMPLETED)
      : null

    return (
      <motion.div
        key={order.id}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-surface rounded-3xl border border-app shadow-sm overflow-hidden transition-opacity duration-300 ${
          order.archivado ? 'opacity-65 hover:opacity-100' : ''
        }`}
      >
        {/* Tarjeta Resumen */}
        <div
          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
          className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between cursor-pointer hover:bg-surface-2/50 transition-colors"
        >
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-bold text-xs uppercase tracking-wider w-fit ${stateColors}`}>
              <StateIcon size={14} />
              {ORDER_STATE_LABELS[order.estado] || order.estado}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-app text-base">{order.orderNumber}</span>
                <span className="text-muted text-xs px-2 py-0.5 bg-surface-2 rounded-full border border-app">
                  {PAYMENT_METHOD_LABELS[order.metodoPago] || order.metodoPago}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
                  order.tipoEntrega === 'domicilio'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : order.tipoEntrega === 'digital'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : order.tipoEntrega === 'mesa'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  {order.tipoEntrega === 'domicilio' ? '🛵 Domicilio' : order.tipoEntrega === 'digital' ? '📱 Digital' : order.tipoEntrega === 'mesa' ? `🛎️ Mesa: ${order.tableName || 'Salón'}` : '🏪 Retiro'}
                </span>
                {order.archivado && (
                  <span className="text-[10px] font-bold text-muted bg-surface-2 border border-app px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Archivado
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-app mt-1">
                {order.cliente?.nombre} <span className="text-muted font-normal">• {order.cliente?.celular}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-app sm:border-0 pt-4 sm:pt-0 mt-4 sm:mt-0 w-full sm:w-auto">
            {/* Botón Compartir Seguimiento por QR (Excluye Cocinero y Bodeguero por seguridad/permisos si están logueados) */}
            {(!portalEmployee || (portalEmployee.rol !== 'cocinero' && portalEmployee.rol !== 'bodeguero')) && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedOrderForShare(order)
                }}
                title="Compartir Seguimiento en Vivo"
                className="w-10 h-10 rounded-xl bg-surface hover:bg-surface-2 border border-app flex items-center justify-center text-muted hover:text-primary transition-all cursor-pointer shadow-xs shrink-0 active:scale-90"
              >
                <QrCode size={18} />
              </button>
            )}
            <div className="text-left sm:text-right flex-1 sm:flex-none">
              <p className="text-xs text-muted mb-0.5">{order.items?.length || 0} art(s).</p>
              <p className="font-black text-primary text-lg">{formatCurrency(order.total)}</p>
            </div>
            <ChevronDown size={20} className={`flex-shrink-0 text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Detalles Expandidos */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-app bg-surface-2/30"
            >
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Columna Info Cliente & Acciones */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5"><MapPin size={14}/> Envío y Fecha</h4>
                    <p className="text-sm text-app font-medium">
                      {order.tipoEntrega === 'mesa'
                        ? `🛎️ Consumo en Salón — ${order.tableName || 'Mesa'}`
                        : order.cliente?.direccion || 'Recogida en tienda'}
                    </p>
                    {order.tipoEntrega !== 'mesa' && order.cliente?.barrio && <p className="text-sm text-muted">{order.cliente?.barrio}, {order.cliente?.ciudad}</p>}
                    
                    {/* Leaflet Map Visualizer for Admin */}
                    {order.tipoEntrega === 'domicilio' && order.cliente?.coords && (
                      <div className="mt-3 mb-3">
                        <LeafletMapPicker
                          address={order.cliente.direccion}
                          coords={order.cliente.coords}
                          readOnly={true}
                        />
                        <div className="mt-2">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${order.cliente.coords.lat},${order.cliente.coords.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold transition-all active:scale-95 hover:opacity-90 cursor-pointer"
                          >
                            🗺️ Abrir Ruta en Google Maps
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Precio del Domicilio Editable si el método de entrega a domicilio está habilitado */}
                    {order.tipoEntrega === 'domicilio' && (deliverySettings?.shipping?.enabled ?? true) && (
                      <div className="mt-4 p-4 bg-surface rounded-2xl border border-app shadow-sm">
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          🛵 Valor del Domicilio
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-bold">$</span>
                            <NumberInput
                              min={0}
                              value={tempDeliveryCosts[order.id] !== undefined ? tempDeliveryCosts[order.id] : (order.costoEnvio || undefined)}
                              onChange={(val) => setTempDeliveryCosts(prev => ({ ...prev, [order.id]: val }))}
                              className="w-full pl-7 pr-3 h-10 bg-surface-2 border border-app rounded-xl text-sm font-bold text-app focus:outline-none focus:border-primary transition-colors"
                              placeholder="Ej: 5000"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              const newCost = parseFloat(tempDeliveryCosts[order.id]) || 0
                              try {
                                await orderService.updateOrderDeliveryCost(
                                  order.id,
                                  newCost,
                                  order.total,
                                  order.costoEnvio
                                )
                                // Mostrar el modal deslizable de confirmación
                                setSavedPriceModal({
                                  isOpen: true,
                                  orderNumber: order.orderNumber,
                                  value: newCost
                                })
                              } catch (error) {
                                console.error('Error al actualizar costo de envío:', error)
                                alert('No se pudo actualizar el costo de envío.')
                              }
                            }}
                            className="px-4 h-10 bg-primary text-white rounded-xl text-xs font-bold transition-all active:scale-95 hover:opacity-90 shrink-0 cursor-pointer"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-app mt-3">
                      {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'Reciente'}
                    </p>

                    {/* Panel de Gestión de Entrega (Mensajero Propio) */}
                    {order.tipoEntrega === 'domicilio' && deliverySettings?.customDelivery?.enabled && (
                      <OrderDeliveryPanel order={order} />
                    )}

                  </div>
                  
                  {order.notes && (
                    <div>
                      <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileText size={14}/> Notas</h4>
                      <p className="text-sm text-app italic bg-surface-2/50 p-3 rounded-xl border border-app">{order.notas}</p>
                    </div>
                  )}

                  {/* Acciones del Administrador */}
                  <div className="bg-surface p-5 rounded-3xl border-0 shadow-sm">
                    <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Acciones Rápidas</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {order.metodoPago === 'credito' ? (
                        // ─── DISEÑO ESPECIAL PARA PEDIDOS A CRÉDITO ───
                        <>
                          <button
                            onClick={(e) => handleContactClient(order.cliente?.celular, order.orderNumber)}
                            className="col-span-2 flex items-center justify-center gap-2 h-11 bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl text-sm font-bold hover:bg-green-500/20 transition-colors"
                          >
                            <MessageCircle size={16} /> WhatsApp
                          </button>

                          {order.estado !== ORDER_STATES.COMPLETED && order.estado !== ORDER_STATES.CANCELLED && order.estado !== ORDER_STATES.CREDIT_APPROVED ? (
                            <>
                              <button
                                onClick={(e) => handleStatusChange(order, ORDER_STATES.CANCELLED, e)}
                                disabled={isPending}
                                className="col-span-1 h-12 flex justify-center items-center bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[13px] font-bold hover:bg-red-500/20 active:scale-95 disabled:opacity-50 transition-all"
                              >
                                Rechazar Crédito
                              </button>
                              <button
                                onClick={(e) => handleStatusChange(order, ORDER_STATES.CREDIT_APPROVED, e)}
                                disabled={isPending}
                                className="col-span-1 h-12 flex justify-center items-center bg-blue-600 text-white rounded-xl text-[13px] font-bold shadow-md hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all"
                              >
                                Aprobar Crédito
                              </button>
                            </>
                          ) : order.estado === ORDER_STATES.CREDIT_APPROVED && (
                            <div className="col-span-2 flex justify-center items-center h-11 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-xl text-sm font-bold">
                              ✓ Crédito Aprobado
                            </div>
                          )}
                        </>
                      ) : (
                        // ─── DISEÑO ESTÁNDAR PARA OTROS MÉTODOS DE PAGO ───
                        <>
                          <button
                            onClick={(e) => handleContactClient(order.cliente?.celular, order.orderNumber)}
                            className="col-span-1 flex items-center justify-center gap-2 h-11 bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl text-sm font-bold hover:bg-green-500/20 transition-colors"
                          >
                            <MessageCircle size={16} /> WhatsApp
                          </button>

                          {order.estado !== ORDER_STATES.COMPLETED && order.estado !== ORDER_STATES.CANCELLED ? (
                            <>
                              <button
                                onClick={(e) => handleStatusChange(order, ORDER_STATES.CANCELLED, e)}
                                disabled={isPending}
                                className="col-span-1 h-11 flex justify-center items-center bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                              {nextStateName && (
                                <button
                                  onClick={(e) => handleStatusChange(order, nextStateName, e)}
                                  disabled={isPending}
                                  className="col-span-2 h-12 mt-1 flex justify-center items-center rounded-xl text-sm font-bold shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all text-white bg-primary"
                                >
                                  Mover a {ORDER_STATE_LABELS[nextStateName]}
                                </button>
                              )}
                            </>
                          ) : order.estado === ORDER_STATES.COMPLETED && order.metodoPago === PAYMENT_METHODS.TRANSFER && (
                            <div className="col-span-1 flex justify-center items-center h-11 bg-success/10 text-success border border-success/20 rounded-xl text-sm font-bold">
                              ✓ Pago Validado
                            </div>
                          )}
                        </>
                      )}

                      <button
                        onClick={(e) => { e.stopPropagation(); handlePrintReceipt(order) }}
                        className="col-span-2 flex items-center justify-center gap-2 h-11 bg-surface border border-app rounded-xl text-sm font-bold hover:bg-surface-2 transition-colors mt-2"
                      >
                        <FileText size={16} /> Generar Factura PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Columna Productos */}
                <div>
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5"><Package size={14}/> Productos</h4>
                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-surface p-3 rounded-2xl border border-app hover:bg-surface-2/30 transition-colors shadow-sm">
                        <div className="w-12 h-12 bg-surface-2 rounded-xl flex-shrink-0 overflow-hidden border border-app relative">
                          {item.imagen || item.imageUrl ? (
                            <img src={item.imagen || item.imageUrl} alt={item.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={16} className="text-muted absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-app leading-tight mb-0.5">{item.nombre}</p>
                          <p className="text-xs text-muted leading-tight">
                            {item.atributos && Object.values(item.atributos).length > 0
                              ? Object.values(item.atributos).join(' • ')
                              : item.talla || item.color 
                                ? [item.talla, item.color].filter(Boolean).join(' • ')
                                : 'Única'}
                          </p>
                          {item.descripcion && (
                            <p className="text-[11px] text-muted italic mt-1 bg-surface-2/50 px-1.5 py-0.5 rounded border border-app w-fit">
                              Detalle: {item.descripcion}
                            </p>
                          )}
                        </div>
                        <div className="text-right pr-2">
                          <p className="text-xs text-muted mb-0.5">x{item.cantidad}</p>
                          <p className="text-sm font-bold text-primary">{formatCurrency(item.precio)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desglose de Totales Financieros */}
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
                    {order.descuento > 0 && couponsEnabled && (
                      <div className="flex justify-between text-muted">
                        <span>🏷️ Descuento:</span>
                        <span className="font-semibold text-green-500">-{formatCurrency(order.descuento)}</span>
                      </div>
                    )}
                     <div className="flex justify-between text-app font-black text-base pt-1 border-t border-app">
                      <span>Total General:</span>
                      <span className="text-primary">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>
                
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 max-w-6xl mx-auto pb-24 overflow-x-hidden">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
            <ClipboardList size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-app truncate">Gestión de Pedidos</h1>
            <p className="text-sm text-muted leading-tight mt-1">Administra y controla los pedidos del negocio.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {claimsEnabled && (
            <button
              onClick={() => navigate('/admin/reclamos')}
              className="relative flex-1 sm:flex-initial flex items-center justify-center gap-2 h-[50px] px-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-all font-bold text-xs sm:text-sm cursor-pointer select-none active:scale-95 min-w-0"
            >
              <ShieldAlert size={16} className="shrink-0" />
              <span className="truncate">Garantías y Reclamos</span>
              {pendingClaimsCount > 0 && (
                <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-orange-600 text-white text-[10px] font-black absolute -top-2 -right-2 ring-2 ring-surface animate-pulse">
                  {pendingClaimsCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setShowWholesaleModal(true)}
            className="relative flex-1 sm:flex-initial flex items-center justify-center gap-2 h-[50px] px-4 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all font-bold text-xs sm:text-sm cursor-pointer select-none active:scale-95 min-w-0"
          >
            <PackagePlus size={16} className="shrink-0" />
            <span className="truncate">Solicitudes por Encargo</span>
            {pendingWholesaleCount > 0 && (
              <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-black absolute -top-2 -right-2 ring-2 ring-surface animate-pulse">
                {pendingWholesaleCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Métricas con Rediseño Simétrico */}
      <div className={`grid ${creditsEnabled ? 'grid-cols-3' : 'grid-cols-2'} gap-3 md:gap-6 mb-6`}>
        {metrics.map((m, i) => {
          const Icon = m.icon
          const isClickable = !!m.path
          let iconBg = 'bg-warning/10 text-warning border-warning/20'
          if (m.label === 'Completados') iconBg = 'bg-success/10 text-success border-success/20'

          if (m.label === 'Créditos') {
            return (
              <motion.button
                key={i}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  boxShadow: [
                    "0 0 6px rgba(124, 58, 237, 0.25)",
                    "0 0 18px rgba(124, 58, 237, 0.55)",
                    "0 0 6px rgba(124, 58, 237, 0.25)"
                  ]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                onClick={() => navigate(m.path)}
                className="bg-surface border border-primary/30 rounded-2xl p-4 flex flex-col justify-center items-center min-h-[100px] md:min-h-[120px] relative overflow-hidden group text-center w-full select-none cursor-pointer"
              >
                {/* Degradado suave de fondo en hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <span className="text-[9px] md:text-xs font-bold text-primary uppercase tracking-wider mb-2 text-center leading-none">
                  {m.label}
                </span>
                
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="w-8 h-8 md:w-11 md:h-11 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20 transition-transform duration-300 group-hover:scale-110">
                    <Icon size={16} className="md:size-5" />
                  </div>
                  <span className="text-[9px] md:text-[11px] font-bold text-muted mt-1 leading-tight group-hover:text-primary transition-colors">
                    Ver Créditos
                  </span>
                </div>
              </motion.button>
            )
          }

          return (
            <div
              key={i}
              className={`bg-surface border border-app rounded-2xl p-4 flex flex-col justify-center items-center min-h-[100px] md:min-h-[120px] shadow-sm relative text-center w-full`}
            >
              <span className="text-[9px] md:text-xs font-bold text-muted uppercase tracking-wider mb-3.5 text-center leading-none">
                {m.label}
              </span>
              
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <span className={`text-xl md:text-3xl font-black tracking-tight leading-none ${m.color}`}>
                  {m.value}
                </span>
                <div className={`w-7 h-7 md:w-10 md:h-10 rounded-xl ${iconBg} border flex items-center justify-center flex-shrink-0`}>
                  <Icon size={14} className="md:size-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col gap-4 mb-3">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar por #pedido, nombre o celular..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
        </div>

        <div className="flex flex-row overflow-x-auto scrollbar-none gap-2 pb-2 md:pb-0 max-w-full -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => { 
                setActiveFilter(f); 
                setShowArchived(false);
                setCurrentPage(1);
                setCurrentArchivedPage(1);
                if (f !== ORDER_STATES.COMPLETED) setFilterDate('');
              }}
              className={`flex-shrink-0 px-4 py-2 h-11 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === f
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface border border-app text-muted hover:text-app'
              }`}
            >
              {f === 'Todos' ? 'Todos' : ORDER_STATE_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-10 text-muted">Cargando pedidos...</div>
      ) : activeOrders.length === 0 && archivedOrders.length === 0 ? (
        <div className="text-center py-10 bg-surface rounded-3xl border border-app text-muted">No se encontraron pedidos.</div>
      ) : (
        <div className="space-y-6">
           {/* Lista de Pedidos Activos Paginados */}
          {paginatedActiveOrders.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence>
                {paginatedActiveOrders.map(order => renderOrderCard(order))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-10 bg-surface rounded-3xl border border-app text-muted">
              No hay pedidos activos en este estado.
            </div>
          )}

          {/* Componente de Paginación Premium */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface border border-app p-4 rounded-2xl shadow-sm mt-4">
              <span className="text-xs font-bold text-muted">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, activeOrders.length)} de {activeOrders.length} pedidos
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 h-9 rounded-xl border border-app bg-surface hover:bg-surface-2 text-xs font-bold text-app transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 cursor-pointer"
                >
                  Anterior
                </button>
                
                {Array.from({ length: totalPages }, (_, idx) => {
                  const pageNum = idx + 1
                  // Mostrar primera, última, y páginas adyacentes a la actual
                  if (
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    Math.abs(pageNum - currentPage) <= 1
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-primary text-white shadow-sm'
                            : 'border border-app bg-surface hover:bg-surface-2 text-app'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  }
                  
                  // Mostrar elipsis para indicar páginas intermedias omitidas
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="text-xs text-muted px-1">...</span>
                  }
                  
                  return null
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 h-9 rounded-xl border border-app bg-surface hover:bg-surface-2 text-xs font-bold text-app transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* Contenedor de Botones de Archivados e Historial al final de la vista de listado - Exclusivo para COMPLETADOS */}
          {activeFilter === ORDER_STATES.COMPLETED && (
            <div className="flex flex-col items-center gap-4 mt-8 pt-4 border-t border-app w-full">
              <div className="flex flex-row flex-wrap justify-center items-center gap-3 w-full">
                {/* Botón de Archivar Completados activos */}
                <button
                  onClick={handleArchiveCompleteds}
                  disabled={isArchiving}
                  className="flex items-center justify-center gap-2 h-11 px-5 bg-surface border border-app hover:bg-surface-2 text-app rounded-xl text-xs font-bold shadow-sm hover:border-primary transition-all active:scale-95 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                >
                  <Archive size={14} className="text-muted" />
                  <span>{isArchiving ? 'Archivando...' : 'Archivar Historial'}</span>
                </button>

                {/* Botón "Ver archivados" con datepicker premium */}
                <button
                  ref={triggerRef}
                  onClick={() => setPickerOpen(v => !v)}
                  className={`flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-xs font-bold shadow-sm border transition-all active:scale-95 cursor-pointer uppercase tracking-wider ${
                    filterDate 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-surface border border-app hover:bg-surface-2 text-app hover:border-primary'
                  }`}
                >
                  <Calendar size={14} />
                  <span>
                    {filterDate 
                      ? `Archivados: ${new Date(filterDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
                      : 'Ver archivados'}
                  </span>
                </button>

                <CustomDatePickerPortal
                  open={pickerOpen}
                  setOpen={setPickerOpen}
                  value={filterDate}
                  onChange={(val) => {
                    setFilterDate(val)
                    if (val) setShowArchived(true)
                  }}
                  triggerRef={triggerRef}
                />

                {/* Botón para limpiar filtro de fecha si hay uno seleccionado */}
                {filterDate && (
                  <button
                    onClick={() => {
                      setFilterDate('')
                      setShowArchived(false)
                    }}
                    className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl text-xs font-bold border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                  >
                    <span>Limpiar Fecha</span>
                  </button>
                )}
              </div>

              {/* Listado de Pedidos Archivados (anteriores) filtrados */}
              <AnimatePresence>
                {(showArchived || filterDate) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full space-y-4 overflow-hidden mt-4"
                  >
                    <div className="flex items-center gap-3 px-1 my-3">
                      <div className="h-[1px] bg-app flex-1 opacity-20"></div>
                      <span className="text-[10px] font-black text-muted uppercase tracking-widest">
                        {filterDate 
                          ? `Pedidos Archivados del ${new Date(filterDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
                          : 'Todos los pedidos archivados'}
                      </span>
                      <div className="h-[1px] bg-app flex-1 opacity-20"></div>
                    </div>

                    {paginatedArchivedOrders.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          {paginatedArchivedOrders.map(order => renderOrderCard(order))}
                        </div>

                        {/* Paginador para Pedidos Archivados */}
                        {totalArchivedPages > 1 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface border border-app p-4 rounded-2xl shadow-sm mt-4">
                            <span className="text-xs font-bold text-muted">
                              Mostrando {((currentArchivedPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentArchivedPage * ITEMS_PER_PAGE, archivedOrders.length)} de {archivedOrders.length} archivados
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setCurrentArchivedPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentArchivedPage === 1}
                                className="px-3 h-9 rounded-xl border border-app bg-surface hover:bg-surface-2 text-xs font-bold text-app transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 cursor-pointer"
                              >
                                Anterior
                              </button>
                              
                              {Array.from({ length: totalArchivedPages }, (_, idx) => {
                                const pageNum = idx + 1
                                if (
                                  pageNum === 1 || 
                                  pageNum === totalArchivedPages || 
                                  Math.abs(pageNum - currentArchivedPage) <= 1
                                ) {
                                  return (
                                    <button
                                      key={pageNum}
                                      onClick={() => setCurrentArchivedPage(pageNum)}
                                      className={`w-9 h-9 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer ${
                                        currentArchivedPage === pageNum
                                          ? 'bg-primary text-white shadow-sm'
                                          : 'border border-app bg-surface hover:bg-surface-2 text-app'
                                      }`}
                                    >
                                      {pageNum}
                                    </button>
                                  )
                                }
                                
                                if (pageNum === 2 || pageNum === totalArchivedPages - 1) {
                                  return <span key={pageNum} className="text-xs text-muted px-1">...</span>
                                }
                                
                                return null
                              })}

                              <button
                                onClick={() => setCurrentArchivedPage(prev => Math.min(prev + 1, totalArchivedPages))}
                                disabled={currentArchivedPage === totalArchivedPages}
                                className="px-3 h-9 rounded-xl border border-app bg-surface hover:bg-surface-2 text-xs font-bold text-app transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 cursor-pointer"
                              >
                                Siguiente
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-muted">
                        No hay pedidos archivados para esta fecha.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmación Moderno */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setConfirmDialog(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface border border-app rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <div className={`w-16 h-16 rounded-2xl ${confirmDialog.iconBg} flex items-center justify-center mx-auto mb-4 border ${confirmDialog.iconBorder}`}>
                {confirmDialog.newStatus === ORDER_STATES.COMPLETED ? <CheckCircle size={32} className={confirmDialog.iconColor} /> : <XCircle size={32} className={confirmDialog.iconColor} />}
              </div>
              <h2 className="text-xl font-black text-app text-center mb-2">{confirmDialog.title}</h2>
              <p className="text-sm text-muted text-center mb-6 whitespace-pre-wrap">{confirmDialog.message}</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="h-12 flex justify-center items-center rounded-xl font-bold text-app bg-surface-2 hover:bg-surface border border-app transition-colors"
                >
                  Regresar
                </button>
                <button
                  onClick={confirmStatusChange}
                  disabled={isPending}
                  className={`h-12 flex justify-center items-center rounded-xl font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${confirmDialog.btnBg}`}
                >
                  {isPending ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Solicitudes al por Mayor */}
      <WholesaleRequestsModal
        isOpen={showWholesaleModal}
        onClose={() => setShowWholesaleModal(false)}
        onUpdateStatus={(id, status) => updateWholesaleStatus({ id, newStatus: status })}
      />

      {/* Banner deslizable: confirmación de precio de domicilio guardado */}
      <AnimatePresence>
        {savedPriceModal.isOpen && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            onAnimationComplete={() => {
              if (savedPriceModal.isOpen) {
                setTimeout(() => setSavedPriceModal(prev => ({ ...prev, isOpen: false })), 2800)
              }
            }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-sm px-4"
          >
            <div className="flex items-center gap-3 bg-surface border border-app shadow-2xl rounded-2xl p-4">
              <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shrink-0">
                <CheckCircle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-app leading-tight">¡Domicilio guardado!</p>
                <p className="text-[10px] text-muted mt-0.5 truncate">
                  Pedido {savedPriceModal.orderNumber} · Costo: {formatCurrency(savedPriceModal.value)}
                </p>
              </div>
              <button
                onClick={() => setSavedPriceModal(prev => ({ ...prev, isOpen: false }))}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors text-muted shrink-0 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal especializado de Compartición de Seguimiento (QR / Enlace / WhatsApp) */}
      <OrderShareModal
        isOpen={!!selectedOrderForShare}
        onClose={() => setSelectedOrderForShare(null)}
        order={selectedOrderForShare}
      />

    </motion.div>
  )
}

function WholesaleRequestsModal({ isOpen, onClose, onUpdateStatus }) {
  const [filter, setFilter] = useState('Todos')
  const [typeFilter, setTypeFilter] = useState('mayorista') // 'mayorista' o 'encargo' (sin opción 'Todos')
  const [requests, setRequests] = useState([])
  const [lastDoc, setLastDoc] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Bloquear scroll de la página trasera cuando está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Resetear filtro de estado cuando cambia el tipo de pestaña para evitar inconsistencias
  useEffect(() => {
    setFilter('Todos')
  }, [typeFilter])

  const fetchPage = async (reset = false) => {
    if (isLoading) return
    setIsLoading(true)
    const cursor = reset ? null : lastDoc
    try {
      const res = await wholesaleService.getWholesaleRequestsPaged(typeFilter, filter, 10, cursor)
      if (reset) {
        setRequests(res.requests)
      } else {
        setRequests(prev => [...prev, ...res.requests])
      }
      setLastDoc(res.lastDoc)
      setHasMore(res.hasMore)
    } catch (error) {
      console.error("Error fetching wholesale requests page:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Carga inicial y cambio de filtros
  useEffect(() => {
    if (isOpen) {
      fetchPage(true)
    } else {
      setRequests([])
      setLastDoc(null)
      setHasMore(false)
    }
  }, [isOpen, typeFilter, filter])

  if (!isOpen) return null

  const getStatusBadge = (state) => {
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

  const getStatusLabel = (state) => {
    switch (state) {
      case 'pendiente': return 'Pendiente'
      case 'revisando': return 'En Revisión'
      case 'aprobado': return 'Aprobado'
      case 'rechazado': return 'Rechazado'
      default: return state
    }
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Panel deslizable lateral */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-md h-full bg-surface border-l border-app shadow-2xl flex flex-col z-10"
      >
        {/* Cabecera */}
        <div className="p-6 border-b border-app flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <PackagePlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-app">Solicitudes Especiales</h2>
              <p className="text-xs text-muted">Pedidos especiales y ventas al por mayor.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-2 hover:bg-surface border border-app text-muted hover:text-app transition-all cursor-pointer active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas de Selección Exclusiva de Tipo (Paso 1) */}
        <div className="px-5 pt-5 pb-3 border-b border-app bg-surface-2/30 flex gap-2">
          <button
            onClick={() => setTypeFilter('mayorista')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer ${
              typeFilter === 'mayorista'
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-surface border-app text-muted hover:text-app'
            }`}
          >
            <Package size={16} />
            Ventas al por Mayor
          </button>
          <button
            onClick={() => setTypeFilter('encargo')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer ${
              typeFilter === 'encargo'
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-surface border-app text-muted hover:text-app'
            }`}
          >
            <PackagePlus size={16} />
            Pedidos por Encargo
          </button>
        </div>

        {/* Filtros de Estado para el Tipo Seleccionado (Paso 2) */}
        <div className="px-5 py-3 border-b border-app flex flex-col gap-2 bg-surface-2/10">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Filtrar por estado:</p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {['Todos', 'pendiente', 'revisando', 'aprobado', 'rechazado'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  filter === f
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface border-app text-muted hover:text-app'
                }`}
              >
                {f === 'Todos' ? 'Todos los estados' : getStatusLabel(f)}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {requests.length === 0 && !isLoading ? (
            <div className="text-center py-12 text-muted bg-surface-2/30 rounded-2xl border border-dashed border-app">
              <p className="text-2xl mb-2">📦</p>
              <p className="text-xs font-bold">No hay solicitudes en esta categoría.</p>
            </div>
          ) : (
            <>
              {requests.map(req => {
                const formattedDate = req.createdAt
                  ? (req.createdAt.toDate ? req.createdAt.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : new Date(req.createdAt).toLocaleDateString('es-ES'))
                  : 'Reciente'

                const isEncargo = req.tipo === 'encargo'
                const concept = isEncargo ? 'por encargo' : 'al por mayor'
                const waMsg = encodeURIComponent(`Hola ${req.clienteNombre}, te escribo del soporte de la tienda sobre tu solicitud ${concept} del producto "${req.productoNombre}" (Cantidad: ${req.cantidad}).`)

                return (
                  <div key={req.id} className="bg-surface-2/40 border border-app rounded-2xl p-4 shadow-xs relative space-y-3">
                    
                    {/* Fila superior: Tipo + Estado */}
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider ${
                        isEncargo 
                          ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' 
                          : 'text-primary bg-primary/10 border-primary/20'
                      }`}>
                        {isEncargo ? 'Por Encargo' : 'Al Por Mayor'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider ${getStatusBadge(req.estado)}`}>
                        {getStatusLabel(req.estado)}
                      </span>
                    </div>

                    {/* Detalle Producto */}
                    <div>
                      <h3 className="font-bold text-app text-sm leading-tight">{req.productoNombre}</h3>
                      <p className="text-[10px] text-muted font-semibold mt-1">Solicitado: {formattedDate}</p>
                    </div>

                    {/* Cantidad y observaciones */}
                    <div className="bg-surface border border-app rounded-xl p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted font-medium">Cantidad requerida:</span>
                        <span className="font-black text-primary text-sm">{req.cantidad} unidades</span>
                      </div>
                      {req.observaciones && (
                        <div className="pt-2 border-t border-app">
                          <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1">Notas del cliente:</p>
                          <p className="text-xs text-app leading-relaxed italic bg-surface-2 p-2 rounded-lg">"{req.observaciones}"</p>
                        </div>
                      )}
                    </div>

                    {/* Fila de cliente y contacto */}
                    <div className="flex items-center justify-between pt-2 border-t border-app">
                      <div>
                        <p className="text-xs font-bold text-app">{req.clienteNombre}</p>
                        <p className="text-[10px] text-muted font-medium">Cel: {req.clienteCelular}</p>
                      </div>
                      <a
                        href={`https://wa.me/${req.clienteCelular.replace(/\D/g, '')}?text=${waMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors font-bold text-xs shadow-xs"
                      >
                        <Phone size={12} />
                        Chat WhatsApp
                      </a>
                    </div>

                    {/* Selector de estados para el admin */}
                    <div className="flex items-center gap-2 pt-2 border-t border-app">
                      <span className="text-[10px] font-bold text-muted uppercase">Estado:</span>
                      <div className="flex-1 grid grid-cols-3 gap-1">
                        {['revisando', 'aprobado', 'rechazado'].map(st => {
                          const isFinalState = req.estado === 'aprobado' || req.estado === 'rechazado'
                          const handleStatusUpdate = async () => {
                            // Actualizar estado en DB
                            await onUpdateStatus(req.id, st)
                            // Actualizar localmente la solicitud en el estado
                            setRequests(prev => prev.map(item => item.id === req.id ? { ...item, estado: st } : item))

                            // Mensaje de notificación asistida
                            const cleanPhone = req.clienteCelular.replace(/\D/g, '')
                            const concept = req.tipo === 'encargo' ? 'por encargo' : 'al por mayor'
                            const stLabel = st === 'revisando' ? 'En Revisión 🔍' : st === 'aprobado' ? 'Aprobado ✅' : 'Rechazado ❌'
                            
                            let customMsg = `Hola ${req.clienteNombre}, te escribimos para informarte que tu solicitud ${concept} de "${req.productoNombre}" (Cantidad: ${req.cantidad}) ha sido cambiada al estado: *${stLabel}*.`
                            
                            if (st === 'aprobado') {
                              customMsg += ` ¡Ya puedes proceder con tu orden!`
                            } else if (st === 'revisando') {
                              customMsg += ` Estamos verificando la disponibilidad y cotización.`
                            }

                            const encoded = encodeURIComponent(customMsg)
                            window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank')
                          }

                          const isActive = req.estado === st
                          const isDisabled = isActive || isFinalState

                          return (
                            <button
                              key={st}
                              disabled={isDisabled}
                              onClick={handleStatusUpdate}
                              className={`h-7 rounded-lg text-[9px] font-extrabold transition-all border cursor-pointer uppercase ${
                                isActive
                                  ? 'bg-app border-app text-muted opacity-50 pointer-events-none'
                                  : isDisabled
                                  ? 'bg-surface border-app text-muted/40 opacity-40 pointer-events-none'
                                  : 'bg-surface border-app text-app hover:border-primary/50'
                              }`}
                            >
                              {st === 'revisando' ? 'Revisar' : st === 'aprobado' ? 'Aprobar' : 'Rechazar'}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Botón de Paginación */}
              {hasMore && (
                <div className="pt-2 pb-6 flex justify-center">
                  <button
                    onClick={() => fetchPage(false)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : null}
                    Cargar más solicitudes
                  </button>
                </div>
              )}

              {isLoading && requests.length > 0 && (
                <div className="py-4 text-center text-xs text-muted font-bold">
                  Cargando más...
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
