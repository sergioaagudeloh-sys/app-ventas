import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Clock, Package, CheckCircle, Search, ChevronDown, MapPin, FileText, XCircle, MessageCircle, DollarSign } from 'lucide-react'
import { useOrders, useUpdateOrderStatus } from '../../hooks/useOrders'
import { ORDER_STATES, ORDER_STATE_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '../../constants'
import { formatCurrency } from '../../utils/formatters'
import useAppConfigStore from '../../store/appConfigStore'

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

const NEXT_STATES = {
  [ORDER_STATES.PENDING]: ORDER_STATES.COMPLETED,
  [ORDER_STATES.COMPLETED]: null,
  [ORDER_STATES.CANCELLED]: null,
}

export default function AdminOrders() {
  const { data: orders = [], isLoading } = useOrders()
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus()
  const { appName, appIcon, whatsappAdmin } = useAppConfigStore()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('Todos')
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)

  // ─── Métricas Rápidas ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    let pendientes = 0
    let completados = 0
    let totalCreditos = 0

    orders.forEach(o => {
      if (o.estado === ORDER_STATES.PENDING) pendientes++
      if (o.estado === ORDER_STATES.COMPLETED) {
        completados++
        if (o.metodoPago === PAYMENT_METHODS.CREDIT) totalCreditos += o.total
      }
    })

    return [
      { label: 'Pendientes', value: pendientes, icon: Clock, color: 'text-warning' },
      { label: 'Completados', value: completados, icon: CheckCircle, color: 'text-success' },
      { label: 'Créditos', value: formatCurrency(totalCreditos), icon: DollarSign, color: 'text-primary' },
    ]
  }, [orders])

  // ─── Filtrado ──────────────────────────────────────────────────────────
  const filters = ['Todos', ORDER_STATES.PENDING, ORDER_STATES.COMPLETED, ORDER_STATES.CANCELLED]

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.cliente?.celular?.includes(searchTerm)
    
    const matchesFilter = activeFilter === 'Todos' || order.estado === activeFilter

    return matchesSearch && matchesFilter
  })

  // ─── Acciones ──────────────────────────────────────────────────────────
  const handleStatusChange = (order, newStatus, e) => {
    if (e) e.stopPropagation()
    
    if (newStatus === ORDER_STATES.COMPLETED) {
      const confirmMsg = `¿Estás seguro de marcar el pedido ${order.orderNumber} como Completado?\n\nEsta acción descontará definitivamente el stock del inventario${order.metodoPago === PAYMENT_METHODS.CREDIT ? ' y generará el crédito asociado' : ''}.`
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 max-w-6xl mx-auto pb-24 overflow-x-hidden">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
          <ClipboardList size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-app truncate">Gestión de Pedidos</h1>
          <p className="text-sm text-muted leading-tight mt-1">Administra y controla los pedidos del negocio.</p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {metrics.map((m, i) => {
          const Icon = m.icon
          return (
            <div key={i} className="bg-surface border border-app rounded-2xl p-3 md:p-4 flex flex-col justify-between h-24 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] md:text-xs font-bold text-muted uppercase tracking-wider truncate mr-1">{m.label}</span>
                <Icon size={16} className={`flex-shrink-0 ${m.color}`} />
              </div>
              <span className={`text-lg md:text-xl font-black truncate ${m.color}`}>{m.value}</span>
            </div>
          )
        })}
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
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
        <div className="grid grid-cols-4 gap-1 sm:gap-2 w-full pb-2 md:pb-0">
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
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-10 text-muted">Cargando pedidos...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-10 bg-surface rounded-3xl border border-app text-muted">No se encontraron pedidos.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {filteredOrders.map(order => {
              const StateIcon = STATE_ICONS[order.estado] || Clock
              const stateColors = STATE_COLORS[order.estado] || STATE_COLORS[ORDER_STATES.PENDING]
              const isExpanded = expandedOrderId === order.id
              const nextStateName = NEXT_STATES[order.estado]

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surface rounded-3xl border border-app shadow-sm overflow-hidden"
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
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-app text-base">{order.orderNumber}</span>
                          <span className="text-muted text-xs px-2 py-0.5 bg-surface-2 rounded-full border border-app">
                            {PAYMENT_METHOD_LABELS[order.metodoPago] || order.metodoPago}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-app mt-1">
                          {order.cliente?.nombre} <span className="text-muted font-normal">• {order.cliente?.celular}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-app sm:border-0 pt-4 sm:pt-0 mt-4 sm:mt-0 w-full sm:w-auto">
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
                              <p className="text-sm text-app font-medium">{order.cliente?.direccion || 'Recogida en tienda'}</p>
                              {order.cliente?.barrio && <p className="text-sm text-muted">{order.cliente?.barrio}, {order.cliente?.ciudad}</p>}
                              <p className="text-sm text-app mt-2">
                                {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'Reciente'}
                              </p>
                            </div>
                            
                            {order.notas && (
                              <div>
                                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileText size={14}/> Notas</h4>
                                <p className="text-sm text-app italic bg-surface p-3 rounded-xl border border-app/50">{order.notas}</p>
                              </div>
                            )}

                            {/* Acciones del Administrador */}
                            <div className="bg-surface p-4 rounded-2xl border border-app/50">
                              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Acciones Rápidas</h4>
                              <div className="grid grid-cols-2 gap-3">
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
                                        className="col-span-2 h-12 mt-1 flex justify-center items-center bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
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

                                <button
                                  onClick={(e) => { e.stopPropagation(); handlePrintReceipt(order) }}
                                  className="col-span-2 flex items-center justify-center gap-2 h-11 bg-surface-2 text-app border border-app rounded-xl text-sm font-bold hover:bg-surface transition-colors mt-2"
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
                                <div key={idx} className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-app/50">
                                  <div className="w-12 h-12 bg-surface-2 rounded-lg flex-shrink-0 overflow-hidden border border-app/50 relative">
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
                                  </div>
                                  <div className="text-right pr-2">
                                    <p className="text-xs text-muted mb-0.5">x{item.cantidad}</p>
                                    <p className="text-sm font-bold text-primary">{formatCurrency(item.precio)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
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

    </motion.div>
  )
}
