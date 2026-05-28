import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ShoppingCart,
  User,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Check,
  CheckCircle2,
  Printer,
  ChevronRight,
  CreditCard,
  Wallet,
  Coins,
  FileText,
  X,
  Package,
  CalendarDays,
  ShoppingBag,
  Store,
  RefreshCw
} from 'lucide-react'
import ReactDOM from 'react-dom'
import { useProducts, useCategories } from '../../hooks/useInventory'
import { useCreatePhysicalOrder } from '../../hooks/useOrders'
import { getClientByPhone, saveClientProfile } from '../../services/userService'
import useAuthStore from '../../store/authStore'
import useAppConfigStore from '../../store/appConfigStore'
import { formatCurrency } from '../../utils/formatters'
import { ORDER_STATES, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../../constants'

// Mapeador de colores visual
const COLOR_MAP = {
  'rojo': '#EF4444',
  'azul': '#3B82F6',
  'verde': '#10B981',
  'amarillo': '#EAB308',
  'naranja': '#F97316',
  'morado': '#8B5CF6',
  'rosa': '#EC4899',
  'negro': '#171717',
  'blanco': '#FFFFFF',
  'gris': '#6B7280',
  'cafe': '#78350F',
  'café': '#78350F',
  'beige': '#F5F5DC',
  'celeste': '#38BDF8',
  'vino': '#7F1D1D',
  'dorado': '#D4AF37',
  'plateado': '#C0C0C0',
  'marron': '#78350F',
  'marrón': '#78350F',
  'beige': '#F5F5DC',
}

function getCssColor(colorName) {
  if (!colorName) return '#ccc'
  const normalized = colorName.toLowerCase().trim()
  if (COLOR_MAP[normalized]) return COLOR_MAP[normalized]
  
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  return '#' + (hash & 0x00FFFFFF).toString(16).toUpperCase().padStart(6, '0')
}

export default function AdminSales() {
  const navigate = useNavigate()
  const { data: products = [], isLoading: loadingProducts } = useProducts(true)
  const { data: categories = [] } = useCategories()
  const { user: currentAdmin } = useAuthStore()
  const { mutateAsync: createPhysicalOrder, isPending: isSubmitting } = useCreatePhysicalOrder()
  const { appName, appIcon, whatsappAdmin, bankInfo, bankInfo2 } = useAppConfigStore()

  // Estados del POS
  const [cart, setCart] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('products') // 'products' o 'cart' en mobile
  
  // Cliente
  const [celular, setCelular] = useState('')
  const [clientName, setClientName] = useState('')
  const [foundClient, setFoundClient] = useState(null)
  const [clientSearchStatus, setClientSearchStatus] = useState('') // 'searching', 'found', 'not_found', ''
  const [isRegisteringClient, setIsRegisteringClient] = useState(false)

  // Checkout
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CASH)
  const [notes, setNotes] = useState('')
  
  // Modales
  const [selectedProductForModal, setSelectedProductForModal] = useState(null)
  const [lastOrderDetails, setLastOrderDetails] = useState(null)
  const [expandedQrUrl, setExpandedQrUrl] = useState(null)
  const [stockAlert, setStockAlert] = useState(null)

  // ─── MODO DE VENTA ────────────────────────────────────────────────────────
  // null = aún no elegido (muestra selector), 'inventory' = catálogo, 'custom' = producto libre
  const [saleMode, setSaleMode] = useState(null)
  const [customItem, setCustomItem] = useState({ nombre: '', precio: '', cantidad: '1' })

  const addCustomItemToCart = () => {
    const precio = parseFloat(customItem.precio)
    const cantidad = parseInt(customItem.cantidad)
    if (!customItem.nombre.trim() || isNaN(precio) || precio <= 0 || isNaN(cantidad) || cantidad <= 0) {
      setStockAlert({ message: 'Completa nombre, precio y cantidad válidos.' })
      return
    }
    setCart(prev => [...prev, {
      productId: `custom-${Date.now()}`,
      variantId: `custom-${Date.now()}`,
      nombre: customItem.nombre.trim(),
      precio,
      talla: null,
      color: null,
      cantidad,
      maxStock: 99999,
      imageUrl: null
    }])
    setCustomItem({ nombre: '', precio: '', cantidad: '1' })
  }

  // Búsqueda en tiempo real de cliente
  useEffect(() => {
    const cleanCelular = celular.replace(/\D/g, '')
    if (cleanCelular.length < 10) {
      setFoundClient(null)
      setClientSearchStatus('')
      return
    }

    const performSearch = async () => {
      setClientSearchStatus('searching')
      try {
        const client = await getClientByPhone(cleanCelular)
        if (client) {
          setFoundClient(client)
          setClientName(client.nombre)
          setClientSearchStatus('found')
        } else {
          setFoundClient(null)
          setClientSearchStatus('not_found')
          setClientName('')
        }
      } catch (e) {
        console.error(e)
        setClientSearchStatus('')
      }
    }

    const timer = setTimeout(performSearch, 350)
    return () => clearTimeout(timer)
  }, [celular])

  // Registro rápido de cliente
  const handleRegisterClient = async () => {
    const cleanCelular = celular.replace(/\D/g, '')
    if (!cleanCelular || !clientName.trim()) return
    setIsRegisteringClient(true)
    try {
      await saveClientProfile(cleanCelular, clientName.trim())
      setFoundClient({ id: cleanCelular, nombre: clientName.trim(), celular: cleanCelular })
      setClientSearchStatus('found')
    } catch (e) {
      console.error(e)
      setStockAlert({ message: 'Error al registrar el cliente.' })
    } finally {
      setIsRegisteringClient(false)
    }
  }

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'Todos' || p.categoriaId === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

  // Helpers de variantes
  const hasMultipleVariants = (product) => {
    if (!product.variantes || product.variantes.length === 0) return false
    if (product.variantes.length === 1) {
      const v = product.variantes[0]
      return !!(v.talla || v.color)
    }
    return true
  }

  const getProductTotalStock = (product) => {
    if (!product.variantes) return 0
    return product.variantes.reduce((sum, v) => sum + (v.stock || 0), 0)
  }

  // Agregar al carrito
  const handleAddProductClick = (product) => {
    if (hasMultipleVariants(product)) {
      setSelectedProductForModal(product)
    } else {
      const variant = product.variantes?.[0] || { id: 'default', stock: 9999, talla: null, color: null }
      if (variant.stock <= 0) {
        setStockAlert({ message: 'Este producto no tiene stock disponible.' })
        return
      }
      addToCart(product, variant, 1)
    }
  }

  const addToCart = (product, variant, qty) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.productId === product.id && item.variantId === variant.id)
      if (existingIdx !== -1) {
        const newCart = [...prev]
        const newQty = newCart[existingIdx].cantidad + qty
        if (newQty > variant.stock) {
          setTimeout(() => setStockAlert({ message: `Stock insuficiente. Máximo disponible: ${variant.stock} unidad(es).` }), 0)
          return prev
        }
        newCart[existingIdx].cantidad = newQty
        return newCart
      } else {
        if (qty > variant.stock) {
          setTimeout(() => setStockAlert({ message: `Stock insuficiente. Disponible: ${variant.stock} unidad(es).` }), 0)
          return prev
        }
        return [...prev, {
          productId: product.id,
          variantId: variant.id,
          nombre: product.nombre,
          precio: product.precioBase,
          talla: variant.talla || null,
          color: variant.color || null,
          cantidad: qty,
          maxStock: variant.stock,
          imageUrl: product.imageUrl || null
        }]
      }
    })
  }

  const updateCartQty = (idx, delta) => {
    setCart(prev => {
      const item = prev[idx]
      const newQty = item.cantidad + delta
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx)
      }
      if (newQty > item.maxStock) {
        setTimeout(() => setStockAlert({ message: `Stock insuficiente. Máximo disponible: ${item.maxStock} unidad(es).` }), 0)
        return prev
      }
      const newCart = [...prev]
      newCart[idx].cantidad = newQty
      return newCart
    })
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
  }

  // Finalizar venta transaccional
  const handleFinalizeSale = async () => {
    if (cart.length === 0) return
    if (!foundClient) {
      alert('Por favor selecciona o registra un cliente primero.')
      return
    }

    try {
      const getDeviceType = () => {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
        if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) return "Mobile";
        return "Desktop";
      }

      const orderData = {
        cliente: {
          nombre: foundClient.nombre,
          celular: foundClient.celular,
        },
        metodoPago: paymentMethod,
        notas: notes,
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          nombre: item.nombre,
          precio: item.precio,
          talla: item.talla,
          color: item.color,
          cantidad: item.cantidad,
          imageUrl: item.imageUrl
        })),
        total: getCartTotal(),
        dispositivo: getDeviceType()
      }

      const adminId = currentAdmin?.uid || currentAdmin?.email || 'admin'
      const result = await createPhysicalOrder({ orderData, adminId })

      setLastOrderDetails({
        ...orderData,
        orderNumber: result.orderNumber,
        createdAt: new Date()
      })

      // Resetear POS
      setCart([])
      setCelular('')
      setClientName('')
      setFoundClient(null)
      setClientSearchStatus('')
      setNotes('')
    } catch (e) {
      console.error(e)
      alert(`Error al procesar la venta: ${e.message}`)
    }
  }

  // Imprimir Comprobante
  const handlePrintReceipt = (order) => {
    if (!order) return
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const paymentLabel = paymentMethod === PAYMENT_METHODS.CREDIT ? 'Crédito (Fiado)' : paymentMethod === PAYMENT_METHODS.TRANSFER ? 'Transferencia' : 'Efectivo'

    iframe.contentDocument.write(`
      <html>
        <head>
          <title>Comprobante #${order.orderNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #111; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 15px; margin-bottom: 15px; }
            .logo { max-width: 70px; border-radius: 12px; margin-bottom: 8px; }
            h1 { font-size: 20px; margin: 0 0 5px 0; }
            p { font-size: 13px; margin: 2px 0; color: #555; }
            .order-meta { margin-top: 10px; font-weight: bold; font-family: monospace; }
            .info-box { font-size: 13px; margin-bottom: 15px; background: #f9f9f9; padding: 8px; border-radius: 8px; }
            .info-box h3 { margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; color: #777; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th { text-align: left; border-bottom: 1px solid #ddd; padding: 6px 0; color: #666; font-size: 11px; text-transform: uppercase; }
            td { padding: 8px 0; border-bottom: 1px solid #f1f1f1; vertical-align: top; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; font-size: 15px; border-top: 2px dashed #ccc; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${appIcon ? `<img src="${appIcon}" alt="Logo" class="logo" />` : ''}
            <h1>${appName || 'Factura de Venta'}</h1>
            ${whatsappAdmin ? `<p>WhatsApp: ${whatsappAdmin}</p>` : ''}
            <div class="order-meta">
              <p>Comprobante POS #${order.orderNumber}</p>
              <p>Fecha: ${order.createdAt.toLocaleString()}</p>
            </div>
          </div>
          
          <div class="info-box">
            <h3>Datos del Cliente</h3>
            <p><strong>Nombre:</strong> ${order.cliente?.nombre || 'N/A'}</p>
            <p><strong>Celular:</strong> ${order.cliente?.celular || 'N/A'}</p>
          </div>

          <div class="info-box">
            <h3>Detalles de Pago</h3>
            <p><strong>Método:</strong> ${paymentLabel}</p>
            <p><strong>Tipo:</strong> Venta Física (POS)</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-right">Cant.</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>
                    <strong>${item.nombre}</strong><br/>
                    <small style="color: #666;">
                      ${[item.talla, item.color].filter(Boolean).join(' • ')}
                    </small>
                  </td>
                  <td class="text-right">${item.cantidad}</td>
                  <td class="text-right">${formatCurrency(item.precio * item.cantidad)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="2" class="text-right" style="padding-top: 15px;">TOTAL:</td>
                <td class="text-right" style="padding-top: 15px;">${formatCurrency(order.total)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            <p>¡Gracias por tu visita!</p>
            <p>Venta registrada correctamente en el sistema.</p>
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

  return (
    <div className="min-h-screen bg-app flex flex-col p-4 md:p-6 w-full max-w-[100vw]">

      {/* ─── SELECTOR DE MODO DE VENTA (Bottom Sheet) ──────────────────────── */}
      <AnimatePresence>
        {saleMode === null && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99998, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
            />
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="relative z-10 bg-surface rounded-t-3xl w-full max-w-lg p-6 pb-8 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            >
              <button 
                onClick={() => navigate(-1)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-app transition-colors shadow-sm hover:scale-105 active:scale-95"
              >
                <X size={16} />
              </button>
              <div className="w-10 h-1 rounded-full bg-app/20 mx-auto mb-2" />
              <p className="text-sm font-bold text-app text-center">¿Qué tipo de venta vas a realizar?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSaleMode('inventory')}
                  className="flex flex-col items-center gap-3 p-5 bg-surface-2 hover:bg-primary/10 border border-app hover:border-primary rounded-2xl transition-all active:scale-95 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Store size={24} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-app">Inventario</p>
                    <p className="text-[10px] text-muted">Productos del catálogo</p>
                  </div>
                </button>
                <button
                  onClick={() => setSaleMode('custom')}
                  className="flex flex-col items-center gap-3 p-5 bg-surface-2 hover:bg-emerald-500/10 border border-app hover:border-emerald-500 rounded-2xl transition-all active:scale-95 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText size={24} className="text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-app">Personalizado</p>
                    <p className="text-[10px] text-muted">Producto libre / sin stock</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* ─── ENCABEZADO ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-md">
            <ShoppingCart size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-app">Ventas Directas</h1>
            <p className="text-xs text-muted">{saleMode === 'custom' ? 'Modo: Producto personalizado' : 'POS Inteligente de Mostrador'}</p>
          </div>
        </div>
        {/* Toggle de modo */}
        {saleMode !== null && (
          <button
            onClick={() => setSaleMode(null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-app text-xs font-bold text-muted hover:text-app transition-colors"
          >
            <RefreshCw size={12} /> Cambiar modo
          </button>
        )}
        
        {/* Toggle de pestañas en Mobile */}
        <div className="flex md:hidden bg-surface rounded-2xl p-1 border border-app w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'products' ? 'bg-primary text-white shadow-sm' : 'text-muted'
            }`}
          >
            Productos ({filteredProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'cart' ? 'bg-primary text-white shadow-sm' : 'text-muted'
            }`}
          >
            Resumen
            {cart.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {cart.reduce((sum, item) => sum + item.cantidad, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* ─── PANEL IZQUIERDO: CATÁLOGO o FORMULARIO PERSONALIZADO ────── */}
        <div className={`md:col-span-7 xl:col-span-8 flex flex-col gap-4 ${activeTab !== 'products' ? 'hidden md:flex' : 'flex'}`}>

          {/* ── MODO PERSONALIZADO ───────────────────────────────────────── */}
          {saleMode === 'custom' && (
            <div className="bg-surface rounded-3xl p-5 border border-app shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-app">
                <FileText size={16} className="text-emerald-500" />
                <p className="text-sm font-bold text-app">Agregar producto personalizado</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Nombre del producto</label>
                  <input
                    type="text"
                    value={customItem.nombre}
                    onChange={e => setCustomItem(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Camiseta personalizada azul"
                    className="w-full h-11 px-4 rounded-2xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Precio unitario</label>
                    <input
                      type="number"
                      min="0"
                      value={customItem.precio}
                      onChange={e => setCustomItem(p => ({ ...p, precio: e.target.value }))}
                      placeholder="0"
                      className="w-full h-11 px-4 rounded-2xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={customItem.cantidad}
                      onChange={e => setCustomItem(p => ({ ...p, cantidad: e.target.value }))}
                      className="w-full h-11 px-4 rounded-2xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
                <button
                  onClick={addCustomItemToCart}
                  className="w-full h-11 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all bg-emerald-500 hover:bg-emerald-600"
                >
                  <Plus size={16} /> Agregar al carrito
                </button>
              </div>
            </div>
          )}
          
          {/* Buscador y categorías */}
          {saleMode !== 'custom' && (
            <>
              <div className="bg-surface rounded-3xl p-5 border border-app shadow-sm space-y-4">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre, talla o color..."
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-surface-2 border border-app text-sm text-app placeholder-muted focus:outline-none focus:border-primary transition-colors"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-surface-2 flex items-center justify-center text-muted hover:text-app"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Categorías */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                  <button
                    onClick={() => setSelectedCategory('Todos')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                      selectedCategory === 'Todos'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface-2 text-app border-app hover:bg-surface-2/75'
                    }`}
                  >
                    Todos
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-surface-2 text-app border-app hover:bg-surface-2/75'
                      }`}
                    >
                      {cat.nombre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grilla de productos */}
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-3xl border border-app shadow-sm">
                  <Loader2 className="animate-spin text-primary mb-3" size={32} />
                  <p className="text-xs text-muted">Cargando catálogo...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-3xl border border-app shadow-sm">
                  <Package className="text-muted mb-3 animate-pulse" size={40} />
                  <p className="text-sm font-semibold text-app">No se encontraron productos</p>
                  <p className="text-xs text-muted">Prueba con otra palabra clave o categoría.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map(product => {
                    const stock = getProductTotalStock(product)
                    return (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAddProductClick(product)}
                        className="bg-surface rounded-3xl border border-app overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col group relative"
                      >
                        {/* Imagen */}
                        <div className="aspect-square bg-surface-2 flex items-center justify-center overflow-hidden relative">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.nombre}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <Package size={32} className="text-muted/65" />
                          )}
                          
                          {/* Stock Badge */}
                          <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm border ${
                            stock <= 0
                              ? 'bg-red-500 text-white border-red-600'
                              : stock <= 5
                              ? 'bg-warning text-white border-warning'
                              : 'bg-surface text-app border-app'
                          }`}>
                            {stock <= 0 ? 'Agotado' : `${stock} und.`}
                          </span>
                        </div>

                        {/* Contenido */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                          <p className="font-bold text-sm text-app line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                            {product.nombre}
                          </p>
                          <div>
                            <p className="text-[10px] text-muted mb-1">
                              {product.variantes?.length || 1} variante(s)
                            </p>
                            <p className="font-black text-primary text-base">
                              {formatCurrency(product.precioBase)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── PANEL DERECHO: CLIENTE Y CHECKOUT UNIFICADO (visible en desktop o si activeTab === 'cart') ─── */}
        <div className={`md:col-span-5 xl:col-span-4 ${activeTab !== 'cart' ? 'hidden md:flex' : 'flex'}`}>
          <div className="bg-surface rounded-3xl border border-app shadow-sm flex flex-col divide-y divide-app w-full overflow-hidden">
            {/* ─── CLIENTE ─── */}
            <div className="p-5 space-y-4">
            <h3 className="font-bold text-sm text-app flex items-center gap-2">
              <User size={16} className="text-primary" />
              Búsqueda / Registro de Cliente
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">Número de Celular</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    placeholder="Ej. 3001234567"
                    className="w-full h-11 pl-4 pr-10 rounded-2xl bg-surface-2 border border-app text-sm text-app placeholder-muted focus:outline-none focus:border-primary transition-colors"
                  />
                  {clientSearchStatus === 'searching' && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-primary" />
                    </span>
                  )}
                  {clientSearchStatus === 'found' && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-success">
                      <CheckCircle2 size={16} />
                    </span>
                  )}
                </div>
              </div>

              {/* Mensajes contextuales del cliente */}
              <AnimatePresence mode="wait">
                {clientSearchStatus === 'found' && foundClient && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-success-soft rounded-xl p-3"
                  >
                    <p className="text-xs font-bold text-success">Cliente encontrado correctamente.</p>
                    <p className="text-sm font-black text-app mt-1">{foundClient.nombre}</p>
                    <p className="text-xs text-muted">Celular: {foundClient.celular}</p>
                  </motion.div>
                )}

                {clientSearchStatus === 'not_found' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-warning-soft rounded-xl p-3 space-y-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-warning">El cliente no está registrado.</p>
                      <p className="text-[10px] text-muted">Ingresa su nombre para registrarlo ahora mismo:</p>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Nombre completo del cliente"
                        className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app placeholder-muted focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleRegisterClient}
                      disabled={!clientName.trim() || isRegisteringClient}
                      className="w-full h-10 rounded-xl bg-primary text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isRegisteringClient ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Registrar Cliente
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </div>

            {/* ─── CARRITO DE LA VENTA ─── */}
            <div className="p-5 flex flex-col gap-4">
            <h3 className="font-bold text-sm text-app flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-primary" />
                Resumen de Venta
              </span>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-red-500 font-semibold hover:underline"
                >
                  Vaciar
                </button>
              )}
            </h3>

            {/* Listado de ítems */}
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart size={32} className="text-muted/65 mb-2 animate-bounce" />
                <p className="text-xs text-muted">Agrega productos del catálogo para iniciar la venta.</p>
              </div>
            ) : (
              <div className="divide-y divide-app max-h-[300px] overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={`${item.productId}-${item.variantId}`} className="py-3 flex gap-3 first:pt-0 last:pb-0">
                    {/* Imagen miniatura */}
                    <div className="w-10 h-10 rounded-lg bg-surface-2 border border-app overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={16} className="text-muted/65" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-app truncate">{item.nombre}</p>
                      <p className="text-[10px] text-muted">
                        {[item.talla, item.color].filter(Boolean).join(' • ') || 'Estándar'}
                      </p>
                      <p className="text-xs font-black text-primary mt-1">
                        {formatCurrency(item.precio)}
                      </p>
                    </div>

                    {/* Controles de Cantidad */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQty(idx, -1)}
                        className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-app active:scale-90 transition-all border border-app"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-mono font-bold w-5 text-center text-app">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => updateCartQty(idx, 1)}
                        className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-app active:scale-90 transition-all border border-app"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totales */}
            <div className="border-t border-app pt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted">
                <span>Items agregados</span>
                <span>{cart.reduce((sum, item) => sum + item.cantidad, 0)} und.</span>
              </div>
              <div className="flex justify-between items-end border-b border-app pb-3">
                <span className="text-sm font-bold text-app">Total de la venta</span>
                <span className="text-xl font-black text-primary">{formatCurrency(getCartTotal())}</span>
              </div>
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest block">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod(PAYMENT_METHODS.CASH)}
                  className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === PAYMENT_METHODS.CASH
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface-2 text-app border-app hover:bg-surface-2/80'
                  }`}
                >
                  <Coins size={16} />
                  <span className="text-[10px] font-bold">Efectivo</span>
                </button>
                
                <button
                  onClick={() => setPaymentMethod(PAYMENT_METHODS.TRANSFER)}
                  className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === PAYMENT_METHODS.TRANSFER
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface-2 text-app border-app hover:bg-surface-2/80'
                  }`}
                >
                  <Wallet size={16} />
                  <span className="text-[10px] font-bold">Transf.</span>
                </button>

                <button
                  onClick={() => setPaymentMethod(PAYMENT_METHODS.CREDIT)}
                  className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === PAYMENT_METHODS.CREDIT
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface-2 text-app border-app hover:bg-surface-2/80'
                  }`}
                >
                  <CreditCard size={16} />
                  <span className="text-[10px] font-bold">Fiado</span>
                </button>
              </div>
            </div>

            {paymentMethod === PAYMENT_METHODS.TRANSFER && (
              <div className="space-y-4 p-5 bg-gradient-to-br from-surface to-primary/[0.03] rounded-3xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                <p className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-transparent pb-2">
                  Cuentas para Transferencia
                </p>
                <div className="space-y-4">
                  {bankInfo?.banco && (
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <div className="space-y-1.5 flex-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-primary text-white shadow-sm">
                          {bankInfo.banco}
                        </span>
                        <p className="text-[11px] text-muted">
                          Tipo: <span className="font-extrabold text-app">{bankInfo.tipoCuenta === 'ahorros' ? 'Ahorros' : bankInfo.tipoCuenta === 'corriente' ? 'Corriente' : 'Digital'}</span>
                        </p>
                        <p className="font-mono text-xs text-muted">
                          Número: <span className="font-black text-app bg-surface-2 px-2 py-1 rounded-lg">{bankInfo.numeroCuenta}</span>
                        </p>
                        <p className="text-[11px] text-muted">
                          Titular: <span className="font-bold text-app">{bankInfo.titular}</span>
                        </p>
                      </div>
                      {bankInfo.qrUrl && (
                        <div 
                          onClick={() => setExpandedQrUrl(bankInfo.qrUrl)}
                          className="w-24 h-24 rounded-2xl shadow-sm bg-white p-1.5 flex items-center justify-center shrink-0 hover:scale-105 transition-transform duration-300 cursor-pointer"
                        >
                          <img src={bankInfo.qrUrl} alt="QR Pago" className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                  {bankInfo2?.activa && bankInfo2?.banco && (
                    <div className="flex items-center justify-between gap-4 text-xs pt-4 border-t border-app/50">
                      <div className="space-y-1.5 flex-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                          {bankInfo2.banco}
                        </span>
                        <p className="text-[11px] text-muted">
                          Tipo: <span className="font-extrabold text-app">{bankInfo2.tipoCuenta === 'ahorros' ? 'Ahorros' : bankInfo2.tipoCuenta === 'corriente' ? 'Corriente' : 'Digital'}</span>
                        </p>
                        <p className="font-mono text-xs text-muted">
                          Número: <span className="font-black text-app bg-surface-2 px-2 py-1 rounded-lg">{bankInfo2.numeroCuenta}</span>
                        </p>
                        <p className="text-[11px] text-muted">
                          Titular: <span className="font-bold text-app">{bankInfo2.titular}</span>
                        </p>
                      </div>
                      {bankInfo2.qrUrl && (
                        <div 
                          onClick={() => setExpandedQrUrl(bankInfo2.qrUrl)}
                          className="w-24 h-24 rounded-2xl shadow-sm bg-white p-1.5 flex items-center justify-center shrink-0 hover:scale-105 transition-transform duration-300 cursor-pointer"
                        >
                          <img src={bankInfo2.qrUrl} alt="QR Pago 2" className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                  {!bankInfo?.banco && (!bankInfo2?.activa || !bankInfo2?.banco) && (
                    <p className="text-xs text-muted text-center py-4">No hay cuentas bancarias configuradas.</p>
                  )}
                </div>
              </div>
            )}

            {/* Notas opcionales */}
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">Notas de la Venta (Opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones de entrega, referencias adicionales..."
                rows={2}
                className="w-full p-3 rounded-xl bg-surface-2 border border-app text-xs text-app placeholder-muted focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            {/* Botón Finalizar */}
            <button
              onClick={handleFinalizeSale}
              disabled={cart.length === 0 || !foundClient || isSubmitting}
              className="w-full h-12 rounded-2xl bg-primary text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Procesando venta...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Finalizar Venta
                </>
              )}
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL DE COMPILACIÓN DE VARIANTES ─────────────────────────── */}
      <AnimatePresence>
        {selectedProductForModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForModal(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Modal card */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface rounded-t-[2rem] sm:rounded-[2rem] border border-app shadow-2xl p-6 overflow-hidden flex flex-col gap-5 pointer-events-auto"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-app line-clamp-1">{selectedProductForModal.nombre}</h3>
                  <p className="text-[10px] text-muted">Selecciona la variante de inventario</p>
                </div>
                <button
                  onClick={() => setSelectedProductForModal(null)}
                  className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-app"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Selector de variantes */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {selectedProductForModal.variantes.map(variant => (
                  <div
                    key={variant.id}
                    onClick={() => {
                      if (variant.stock > 0) {
                        addToCart(selectedProductForModal, variant, 1)
                        setSelectedProductForModal(null)
                      }
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      variant.stock <= 0
                        ? 'opacity-40 border-app bg-surface-2 cursor-not-allowed'
                        : 'border-app hover:border-primary/50 hover:bg-primary-soft bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Color swatch */}
                      {variant.color && (
                        <div
                          className="w-5 h-5 rounded-full border border-black/10 shadow-sm"
                          style={{ backgroundColor: getCssColor(variant.color) }}
                          title={variant.color}
                        />
                      )}
                      <div>
                        <p className="text-xs font-bold text-app">
                          {[variant.talla ? `Talla: ${variant.talla}` : '', variant.color ? `Color: ${variant.color}` : ''].filter(Boolean).join(' • ') || 'Estándar'}
                        </p>
                        <p className="text-[10px] text-muted">
                          Stock: {variant.stock} unidades
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-primary">
                        {formatCurrency(selectedProductForModal.precioBase)}
                      </span>
                      {variant.stock > 0 ? (
                        <ChevronRight size={14} className="text-muted" />
                      ) : (
                        <span className="text-[10px] font-bold text-red-500 uppercase">Agotado</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL DE COMPROBANTE / ÉXITO DE VENTA ──────────────────────── */}
      <AnimatePresence>
        {lastOrderDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLastOrderDetails(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Modal card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-surface rounded-[2rem] border border-app shadow-2xl p-6 overflow-hidden flex flex-col items-center text-center gap-4 pointer-events-auto"
            >
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success mb-2">
                <CheckCircle2 size={28} />
              </div>

              <div>
                <h3 className="text-base font-black text-app">Venta registrada correctamente.</h3>
                <p className="text-xs text-muted mt-1">El pedido ya aparece en el historial del cliente.</p>
                <p className="text-xs font-mono font-bold text-primary mt-2">Nro de Orden: {lastOrderDetails.orderNumber}</p>
              </div>

              {/* Botón Imprimir */}
              <div className="w-full space-y-2 mt-4">
                <button
                  onClick={() => handlePrintReceipt(lastOrderDetails)}
                  className="w-full h-11 rounded-xl bg-primary text-white text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Printer size={14} />
                  Imprimir Comprobante
                </button>
                
                <button
                  onClick={() => setLastOrderDetails(null)}
                  className="w-full h-11 rounded-xl bg-surface-2 text-app text-xs font-bold transition-all active:scale-95 border border-app"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ─── MODAL PARA AMPLIAR EL QR ───────────────────────────────────── */}
      <AnimatePresence>
        {expandedQrUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedQrUrl(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white p-6 rounded-[2rem] shadow-2xl z-10 max-w-sm w-full flex flex-col items-center gap-4"
            >
              <button
                onClick={() => setExpandedQrUrl(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
              <p className="text-sm font-bold text-center mt-2 text-slate-800">Escanea para Pagar</p>
              <div className="w-64 h-64 border border-slate-100 rounded-2xl overflow-hidden p-3 bg-white flex items-center justify-center shadow-inner">
                <img src={expandedQrUrl} alt="Código QR Ampliado" className="w-full h-full object-contain" />
              </div>
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Presenta este código al cliente para realizar la transferencia de forma directa.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal de alerta de stock ─────────────────────────────────────── */}
      <AnimatePresence>
        {stockAlert && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStockAlert(null)}
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="relative bg-surface rounded-3xl shadow-2xl p-6 max-w-xs w-full flex flex-col items-center gap-4 z-10"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                <Package size={28} className="text-amber-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-app">Stock insuficiente</p>
                <p className="text-xs text-muted leading-relaxed">{stockAlert.message}</p>
              </div>
              <button
                onClick={() => setStockAlert(null)}
                className="w-full h-11 rounded-2xl font-bold text-sm text-white active:scale-95 transition-all"
                style={{ background: 'var(--color-primary)' }}
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
