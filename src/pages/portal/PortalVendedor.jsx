/**
 * PortalVendedor.jsx
 * Portal operativo del Vendedor POS.
 * Reutiliza toda la lógica de AdminSales pero dentro del contexto del portal operativo,
 * con el vendedor identificado por PIN como autor de la venta.
 */
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ShoppingCart, User, Plus, Minus, Trash2,
  Loader2, CheckCircle2, Printer, X, Package,
  FileText, Store, RefreshCw, CreditCard, Wallet, Coins,
  ChefHat, AlertCircle, History, ChevronRight
} from 'lucide-react'
import { useProducts, useCategories } from '../../hooks/useInventory'
import { useCreatePhysicalOrder } from '../../hooks/useOrders'
import { getClientByPhone, saveClientProfile, getAllClients } from '../../services/userService'
import usePortalStore from '../../store/portalStore'
import useAppConfigStore from '../../store/appConfigStore'
import { formatCurrency } from '../../utils/formatters'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../../constants'
import { getCssColor } from '../../utils/colors'
import { useConnectivityStore } from '../../store/connectivityStore'
import { getOfflineClient, saveOfflineClient, saveOfflineClients } from '../../services/offlineDB'

export default function PortalVendedor() {
  const isOnline = useConnectivityStore((state) => state.isOnline)
  const { portalEmployee } = usePortalStore()
  const { appName, appIcon, whatsappAdmin, creditsEnabled, bankInfo, bankInfo2 } = useAppConfigStore()
  const { data: products = [], isLoading: loadingProducts } = useProducts(true)
  const { data: categories = [] } = useCategories()
  const { mutateAsync: createPhysicalOrder, isPending: isSubmitting } = useCreatePhysicalOrder()

  const [cart, setCart] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('products')
  const [celular, setCelular] = useState('')
  const [clientName, setClientName] = useState('')
  const [foundClient, setFoundClient] = useState(null)
  const [clientSearchStatus, setClientSearchStatus] = useState('')
  const [isRegisteringClient, setIsRegisteringClient] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CASH)
  const [notes, setNotes] = useState('')
  const [saleMode, setSaleMode] = useState(null)
  const [customItem, setCustomItem] = useState({ nombre: '', precio: '', cantidad: '1', descripcion: '' })
  const [lastOrder, setLastOrder] = useState(null)
  const [stockAlert, setStockAlert] = useState('')
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null)
  const [expandedQrUrl, setExpandedQrUrl] = useState(null)

  const [vendedorOrders, setVendedorOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  // Escuchar pedidos del vendedor
  useEffect(() => {
    if (!portalEmployee?.id) return
    let unsub = () => {}
    import('../../services/orderService').then(({ subscribeToVendedorOrders }) => {
      unsub = subscribeToVendedorOrders(portalEmployee.id, (data) => {
        setVendedorOrders(data)
        setLoadingOrders(false)
      })
    })
    return () => unsub()
  }, [portalEmployee?.id])

  useEffect(() => {
    if (stockAlert) {
      const t = setTimeout(() => setStockAlert(''), 3000)
      return () => clearTimeout(t)
    }
  }, [stockAlert])

  // Sincronizar clientes a IndexedDB para búsqueda offline instantánea
  useEffect(() => {
    if (isOnline) {
      getAllClients().then(clients => {
        if (clients.length > 0) {
          saveOfflineClients(clients).catch(console.error)
        }
      }).catch(console.error)
    }
  }, [isOnline])

  // Búsqueda de cliente en tiempo real
  useEffect(() => {
    const clean = celular.replace(/\D/g, '')
    if (clean.length < 10) { setFoundClient(null); setClientSearchStatus(''); return }
    const timer = setTimeout(async () => {
      setClientSearchStatus('searching')
      try {
        let client = null
        if (isOnline) {
          try {
            client = await getClientByPhone(clean)
            if (client) {
              await saveOfflineClient(client)
            }
          } catch (netErr) {
            console.warn('[PortalVendedor] Error al buscar online, consultando IndexedDB:', netErr)
            client = await getOfflineClient(clean)
          }
        } else {
          client = await getOfflineClient(clean)
        }

        if (client) { 
          setFoundClient(client)
          setClientName(client.nombre)
          setClientSearchStatus('found') 
        } else { 
          setFoundClient(null)
          setClientName('')
          setClientSearchStatus('not_found') 
        }
      } catch { 
        setClientSearchStatus('') 
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [celular, isOnline])

  const registerClient = async () => {
    const clean = celular.replace(/\D/g, '')
    if (!clean || !clientName.trim()) return
    setIsRegisteringClient(true)
    try {
      const clientData = { id: clean, nombre: clientName.trim(), celular: clean }
      
      if (isOnline) {
        saveClientProfile(clean, clientName.trim()).catch(err => {
          console.warn('[registerClient] Error al registrar en Firestore central:', err)
        })
      }
      
      // Guardar localmente siempre
      await saveOfflineClient(clientData)
      
      setFoundClient(clientData)
      setClientSearchStatus('found')
    } catch { 
      setStockAlert('Error al registrar el cliente.') 
    } finally { 
      setIsRegisteringClient(false) 
    }
  }

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCat = selectedCategory === 'Todos' || p.categoriaId === selectedCategory
    return matchSearch && matchCat
  }), [products, searchTerm, selectedCategory])

  const getTotalStock = p => p.variantes?.reduce((s, v) => s + (v.stock || 0), 0) ?? 0

  const addToCart = (product, variant, qty) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id && i.variantId === variant.id)
      if (idx !== -1) {
        const newQ = prev[idx].cantidad + qty
        if (newQ > variant.stock) { setTimeout(() => setStockAlert(`Stock máximo: ${variant.stock} und.`), 0); return prev }
        const c = [...prev]; c[idx].cantidad = newQ; return c
      }
      if (qty > variant.stock) { setTimeout(() => setStockAlert(`Stock disponible: ${variant.stock} und.`), 0); return prev }
      return [...prev, { productId: product.id, variantId: variant.id, nombre: product.nombre, precio: product.precioBase, talla: variant.talla || null, color: variant.color || null, cantidad: qty, maxStock: variant.stock, imageUrl: product.imageUrl || null }]
    })
  }

  const handleProductClick = (product) => {
    const hasVariants = product.variantes?.length > 1 || (product.variantes?.length === 1 && (product.variantes[0].talla || product.variantes[0].color))
    if (hasVariants) { setSelectedProductForVariant(product); return }
    const v = product.variantes?.[0] || { id: 'default', stock: 9999 }
    if (v.stock <= 0) { setStockAlert('Sin stock disponible.'); return }
    addToCart(product, v, 1)
  }

  const updateQty = (idx, delta) => {
    setCart(prev => {
      const item = prev[idx]; const nq = item.cantidad + delta
      if (nq <= 0) return prev.filter((_, i) => i !== idx)
      if (nq > item.maxStock) { setTimeout(() => setStockAlert(`Máximo: ${item.maxStock} und.`), 0); return prev }
      const c = [...prev]; c[idx].cantidad = nq; return c
    })
  }

  const addCustom = () => {
    const precio = parseFloat(customItem.precio); const cantidad = parseInt(customItem.cantidad)
    if (!customItem.nombre.trim() || isNaN(precio) || precio <= 0 || isNaN(cantidad) || cantidad <= 0) { setStockAlert('Completa todos los campos correctamente.'); return }
    setCart(prev => [...prev, {
      productId: `c-${Date.now()}`,
      variantId: `c-${Date.now()}`,
      nombre: customItem.nombre.trim(),
      descripcion: customItem.descripcion?.trim() || '',
      precio,
      cantidad,
      maxStock: 99999,
      talla: null,
      color: null,
      imageUrl: null
    }])
    setCustomItem({ nombre: '', precio: '', cantidad: '1', descripcion: '' })
  }

  const getTotal = () => cart.reduce((s, i) => s + i.precio * i.cantidad, 0)

  const finalizeSale = async () => {
    if (cart.length === 0 || !foundClient) {
      setStockAlert(!foundClient ? 'Selecciona o registra un cliente primero.' : 'El carrito está vacío.')
      return
    }
    try {
      const result = await createPhysicalOrder({
        orderData: {
          cliente: { nombre: foundClient.nombre, celular: foundClient.celular },
          metodoPago: paymentMethod,
          notas: notes,
          vendedorId: portalEmployee?.id || '',
          vendedorNombre: portalEmployee?.nombre || '',
          items: cart.map(i => ({ productId: i.productId, variantId: i.variantId, nombre: i.nombre, descripcion: i.descripcion || '', precio: i.precio, talla: i.talla, color: i.color, cantidad: i.cantidad, imageUrl: i.imageUrl })),
          total: getTotal(),
          dispositivo: 'Portal',
        },
        adminId: portalEmployee?.id || 'portal',
      })
      setLastOrder({ ...foundClient, orderNumber: result.orderNumber, total: getTotal(), items: [...cart], metodoPago: paymentMethod, createdAt: new Date() })
      setCart([]); setCelular(''); setClientName(''); setFoundClient(null); setClientSearchStatus(''); setNotes('')
    } catch (e) { setStockAlert(`Error al procesar la venta: ${e.message}`) }
  }

  return (
    <div className="portal-vendedor">
      {/* ─── ALERTA DE STOCK ──────────────────────────────────────────── */}
      <AnimatePresence>
        {stockAlert && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="portal-stock-alert" onClick={() => setStockAlert('')}>
            <AlertCircle size={16} /><span>{stockAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL VENTA EXITOSA ──────────────────────────────────────── */}
      <AnimatePresence>
        {lastOrder && (
          <div className="portal-modal-overlay">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="portal-success-modal">
              <div className="portal-success-icon">✓</div>
              <h2 className="portal-success-title">¡Venta #<strong>{lastOrder.orderNumber}</strong> registrada!</h2>
              <p className="portal-success-sub">Cliente: {lastOrder.nombre}</p>
              <p className="portal-success-total">Total: {formatCurrency(lastOrder.total)}</p>
              <div className="portal-success-items">
                {lastOrder.items.map((it, i) => (
                  <div key={i} className="portal-success-item">
                    <span>{it.nombre}{it.talla ? ` / ${it.talla}` : ''}{it.color ? ` / ${it.color}` : ''}</span>
                    <span>{it.cantidad} × {formatCurrency(it.precio)}</span>
                  </div>
                ))}
              </div>
              <button className="portal-success-btn" onClick={() => { setLastOrder(null); setSaleMode(null) }}>
                Nueva venta
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL VARIANTES ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedProductForVariant && (
          <div className="portal-modal-overlay" onClick={() => setSelectedProductForVariant(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="portal-variants-sheet" onClick={e => e.stopPropagation()}>
              <div className="portal-variants-header mb-4">
                <div>
                  <span className="portal-variants-title block">{selectedProductForVariant.nombre}</span>
                  <span className="text-[10px] text-muted">Selecciona la variante de inventario</span>
                </div>
                <button onClick={() => setSelectedProductForVariant(null)} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-app">
                  <X size={16} />
                </button>
              </div>
              <div className="portal-variants-list max-h-[300px] overflow-y-auto pr-1 space-y-2">
                {selectedProductForVariant.variantes?.map(v => (
                  <div
                    key={v.id}
                    onClick={() => {
                      if (v.stock > 0) {
                        addToCart(selectedProductForVariant, v, 1)
                        setSelectedProductForVariant(null)
                      }
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      v.stock <= 0
                        ? 'opacity-40 border-app bg-surface-2 cursor-not-allowed'
                        : 'border-app hover:border-primary/50 hover:bg-primary-soft bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {v.color && (
                        <div
                          className="w-5 h-5 rounded-full border border-black/10 shadow-sm flex-shrink-0"
                          style={{ backgroundColor: getCssColor(v.color) }}
                          title={v.color}
                        />
                      )}
                      <div>
                        <p className="text-xs font-bold text-app">
                          {[v.talla ? `Talla: ${v.talla}` : '', v.color ? `Color: ${v.color}` : ''].filter(Boolean).join(' • ') || 'Estándar'}
                        </p>
                        <p className="text-[10px] text-muted">
                          Stock: {v.stock} unidades
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-primary">
                        {formatCurrency(selectedProductForVariant.precioBase)}
                      </span>
                      {v.stock > 0 ? (
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

      {/* ─── SELECTOR MODO DE VENTA ───────────────────────────────────── */}
      <AnimatePresence>
        {saleMode === null && (
          <div className="portal-modal-overlay">
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }} className="portal-mode-sheet">
              <p className="portal-mode-title">¿Qué tipo de venta?</p>
              <div className="portal-mode-grid">
                <button className="portal-mode-btn portal-mode-btn--inventory" onClick={() => setSaleMode('inventory')}>
                  <Store size={28} />
                  <span>Inventario</span>
                  <small>Productos del catálogo</small>
                </button>
                <button className="portal-mode-btn portal-mode-btn--custom" onClick={() => setSaleMode('custom')}>
                  <FileText size={28} />
                  <span>Personalizado</span>
                  <small>Producto libre / sin stock</small>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── TABS MOBILE ──────────────────────────────────────────────── */}
      <div className="portal-tabs">
        <button className={`portal-tab ${activeTab === 'products' ? 'portal-tab--active' : ''}`} onClick={() => setActiveTab('products')}>
          <Store size={16} /> Productos ({filteredProducts.length})
        </button>
        <button className={`portal-tab ${activeTab === 'cart' ? 'portal-tab--active' : ''}`} onClick={() => setActiveTab('cart')}>
          <ShoppingCart size={16} /> Carrito
          {cart.length > 0 && <span className="portal-tab-badge">{cart.reduce((s, i) => s + i.cantidad, 0)}</span>}
        </button>
        <button className={`portal-tab ${activeTab === 'history' ? 'portal-tab--active' : ''}`} onClick={() => setActiveTab('history')}>
          <History size={16} /> Historial
        </button>
      </div>

      <div className="portal-pos-grid">
        {/* ─── PANEL PRODUCTOS ──────────────────────────────────────────── */}
        <div className={`portal-products-panel ${activeTab !== 'products' ? 'portal-panel--hidden' : ''}`}>
          {/* Cambiar modo */}
          {saleMode !== null && (
            <div className="portal-mode-bar">
              <span className="portal-mode-label">{saleMode === 'custom' ? '📝 Modo Personalizado' : '📦 Modo Inventario'}</span>
              <button className="portal-mode-switch" onClick={() => setSaleMode(null)}><RefreshCw size={13} /> Cambiar</button>
            </div>
          )}

          {saleMode === 'custom' ? (
            <div className="portal-custom-form">
              <p className="portal-custom-title"><FileText size={16} /> Producto personalizado</p>
              <input className="portal-input" placeholder="Nombre del producto" value={customItem.nombre}
                onChange={e => setCustomItem(p => ({ ...p, nombre: e.target.value }))} />
              <input className="portal-input" placeholder="Detalles / Descripción (opcional)" value={customItem.descripcion}
                onChange={e => setCustomItem(p => ({ ...p, descripcion: e.target.value }))} />
              <div className="portal-custom-row">
                <input className="portal-input" type="number" placeholder="Precio" value={customItem.precio}
                  onChange={e => setCustomItem(p => ({ ...p, precio: e.target.value }))} />
                <input className="portal-input" type="number" placeholder="Cantidad" value={customItem.cantidad}
                  onChange={e => setCustomItem(p => ({ ...p, cantidad: e.target.value }))} />
              </div>
              <button className="portal-custom-add-btn" onClick={addCustom}><Plus size={16} /> Agregar al carrito</button>
            </div>
          ) : (
            <>
              {/* Búsqueda */}
              <div className="portal-search-box">
                <Search size={16} />
                <input className="portal-search-input" placeholder="Buscar producto..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} />
                {searchTerm && <button onClick={() => setSearchTerm('')}><X size={14} /></button>}
              </div>
              {/* Categorías */}
              <div className="portal-categories">
                <button className={`portal-cat ${selectedCategory === 'Todos' ? 'portal-cat--active' : ''}`} onClick={() => setSelectedCategory('Todos')}>Todos</button>
                {categories.map(cat => (
                  <button key={cat.id} className={`portal-cat ${selectedCategory === cat.id ? 'portal-cat--active' : ''}`} onClick={() => setSelectedCategory(cat.id)}>{cat.nombre}</button>
                ))}
              </div>
              {/* Grilla */}
              {loadingProducts ? (
                <div className="portal-loading"><Loader2 className="animate-spin" size={28} /><p>Cargando catálogo...</p></div>
              ) : filteredProducts.length === 0 ? (
                <div className="portal-empty"><Package size={36} /><p>No se encontraron productos</p></div>
              ) : (
                <div className="portal-products-grid">
                  {filteredProducts.map(product => {
                    const stock = getTotalStock(product)
                    return (
                      <motion.div key={product.id} whileTap={{ scale: 0.96 }}
                        className={`portal-product-card ${stock <= 0 ? 'portal-product-card--agotado' : ''}`}
                        onClick={() => stock > 0 && handleProductClick(product)}>
                        <div className="portal-product-img">
                          {product.imageUrl ? <img src={product.imageUrl} alt={product.nombre} /> : <Package size={28} />}
                          <span className={`portal-stock-badge ${stock <= 0 ? 'portal-stock-badge--agotado' : stock <= 5 ? 'portal-stock-badge--low' : ''}`}>
                            {stock <= 0 ? 'Agotado' : `${stock} und.`}
                          </span>
                        </div>
                        <div className="portal-product-info">
                          <p className="portal-product-name">{product.nombre}</p>
                          <p className="portal-product-price">{formatCurrency(product.precioBase)}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── PANEL CARRITO Y HISTORIAL ─────────────────────────────────── */}
        <div className={`portal-checkout-panel ${activeTab === 'products' ? 'portal-panel--hidden' : ''}`}>
          {/* Selector de Pestaña de Panel Derecho */}
          <div className="md:grid hidden grid-cols-2 gap-2 mb-3 bg-surface-2 p-1 rounded-2xl border border-app shrink-0">
            <button
              onClick={() => setActiveTab('cart')}
              className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer ${
                activeTab !== 'history'
                  ? 'bg-surface text-primary shadow-sm shadow-black/10'
                  : 'text-muted hover:text-app bg-transparent'
              }`}
            >
              <ShoppingCart size={14} /> Carrito {cart.length > 0 && `(${cart.length})`}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-surface text-primary shadow-sm shadow-black/10'
                  : 'text-muted hover:text-app bg-transparent'
              }`}
            >
              <History size={14} /> Historial
            </button>
          </div>

          {activeTab === 'history' ? (
            /* ─── CONTENIDO HISTORIAL ─────────────────────────────────── */
            <div className="flex flex-col gap-3 flex-1 overflow-hidden h-full">
              <p className="portal-section-title"><History size={15} /> Mis Ventas de Hoy ({vendedorOrders.length})</p>
              {loadingOrders ? (
                <div className="portal-loading">
                  <Loader2 className="animate-spin" size={24} />
                  <p>Cargando historial...</p>
                </div>
              ) : vendedorOrders.length === 0 ? (
                <div className="portal-empty">
                  <History size={36} />
                  <p>No has realizado ventas hoy</p>
                </div>
              ) : (
                <div className="portal-cart-items space-y-2.5">
                  {vendedorOrders.map((order) => {
                    const dateStr = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—'
                    return (
                      <div key={order.id} className="p-3 bg-surface-2 border border-app rounded-2xl space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-app">Pedido #{order.orderNumber || order.id?.slice(-4)}</span>
                          <span className="text-[10px] text-muted">{dateStr}</span>
                        </div>
                        <div className="text-xs text-muted">
                          Cliente: <span className="font-bold text-app">{order.cliente?.nombre || 'Desconocido'}</span>
                        </div>
                        <div className="space-y-1 bg-surface/50 p-2 rounded-xl border border-app">
                          {order.items?.map((it, i) => (
                            <div key={i} className="flex justify-between text-[11px] text-app">
                              <span>{it.nombre} × {it.cantidad}</span>
                              <span>{formatCurrency(it.precio * it.cantidad)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {PAYMENT_METHOD_LABELS[order.metodoPago] || order.metodoPago}
                          </span>
                          <span className="font-black text-app">{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ─── CONTENIDO CHECKOUT CARRITO ─────────────────────────── */
            <div className="flex flex-col gap-3 flex-1 overflow-hidden h-full">
              {/* Cliente */}
              <div className="portal-section">
                <p className="portal-section-title"><User size={15} /> Cliente</p>
                <div className="portal-client-search">
                  <input className="portal-input" type="tel" placeholder="Celular (10 dígitos)" maxLength={10}
                    value={celular} onChange={e => setCelular(e.target.value.replace(/\D/g, ''))} />
                  {clientSearchStatus === 'searching' && <Loader2 size={15} className="animate-spin portal-input-icon" />}
                  {clientSearchStatus === 'found' && <CheckCircle2 size={15} className="portal-input-icon portal-input-icon--ok" />}
                </div>
                <AnimatePresence>
                  {clientSearchStatus === 'found' && foundClient && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="portal-client-found">
                      <p className="portal-client-name">{foundClient.nombre}</p>
                      <p className="portal-client-phone">{foundClient.celular}</p>
                    </motion.div>
                  )}
                  {clientSearchStatus === 'not_found' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="portal-client-register">
                      <p>Cliente no encontrado. Registrar:</p>
                      <input className="portal-input" placeholder="Nombre completo" value={clientName}
                        onChange={e => setClientName(e.target.value)} />
                      <button className="portal-register-btn" disabled={!clientName.trim() || isRegisteringClient} onClick={registerClient}>
                        {isRegisteringClient ? <Loader2 size={14} className="animate-spin" /> : null} Registrar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Items del carrito */}
              <div className="portal-section portal-section--cart flex-1">
                <p className="portal-section-title"><ShoppingCart size={15} /> Carrito ({cart.length} items)</p>
                {cart.length === 0 ? (
                  <div className="portal-cart-empty">Sin productos aún</div>
                ) : (
                  <div className="portal-cart-items">
                    {cart.map((item, idx) => (
                      <div key={idx} className="portal-cart-item">
                        <div className="portal-cart-item-info">
                          <p className="portal-cart-item-name">{item.nombre}</p>
                          {item.descripcion && <p className="portal-cart-item-variant text-[10px] italic opacity-85">Detalle: {item.descripcion}</p>}
                          {(item.talla || item.color) && <p className="portal-cart-item-variant">{[item.talla, item.color].filter(Boolean).join(' / ')}</p>}
                          <p className="portal-cart-item-price">{formatCurrency(item.precio)}</p>
                        </div>
                        <div className="portal-cart-item-controls">
                          <button className="portal-qty-btn" onClick={() => updateQty(idx, -1)}><Minus size={13} /></button>
                          <span>{item.cantidad}</span>
                          <button className="portal-qty-btn" onClick={() => updateQty(idx, 1)}><Plus size={13} /></button>
                          <button className="portal-qty-btn portal-qty-btn--delete" onClick={() => setCart(c => c.filter((_, i) => i !== idx))}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pago */}
              <div className="portal-section space-y-3">
                <p className="portal-section-title mb-1">Método de pago</p>
                <div className={`grid ${creditsEnabled ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                  {[
                    { v: PAYMENT_METHODS.CASH, label: 'Efectivo', Icon: Coins },
                    { v: PAYMENT_METHODS.TRANSFER, label: 'Transferencia', Icon: Wallet },
                    ...(creditsEnabled ? [{ v: PAYMENT_METHODS.CREDIT, label: 'Fiado', Icon: CreditCard }] : []),
                  ].map(({ v, label, Icon }) => (
                    <button
                      key={v}
                      onClick={() => setPaymentMethod(v)}
                      className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === v
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-surface-2 text-app border-app hover:bg-surface-2/80'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-[10px] font-bold">{label}</span>
                    </button>
                  ))}
                </div>

                {paymentMethod === PAYMENT_METHODS.TRANSFER && (
                  <div className="space-y-4 p-4 bg-gradient-to-br from-surface to-primary/[0.03] rounded-3xl border border-app shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-transparent pb-1">
                      Cuentas para Transferencia
                    </p>
                    <div className="space-y-3">
                      {bankInfo?.banco && (
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-1 flex-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-primary text-white shadow-sm">
                              {bankInfo.banco}
                            </span>
                            <p className="text-[10px] text-muted">
                              Tipo: <span className="font-extrabold text-app">{bankInfo.tipoCuenta === 'ahorros' ? 'Ahorros' : bankInfo.tipoCuenta === 'corriente' ? 'Corriente' : 'Digital'}</span>
                            </p>
                            <p className="font-mono text-xs text-muted">
                              Número: <span className="font-black text-app bg-surface-2 px-1.5 py-0.5 rounded">{bankInfo.numeroCuenta}</span>
                            </p>
                            <p className="text-[10px] text-muted">
                              Titular: <span className="font-bold text-app">{bankInfo.titular}</span>
                            </p>
                          </div>
                          {bankInfo.qrUrl && (
                            <div 
                              onClick={() => setExpandedQrUrl(bankInfo.qrUrl)}
                              className="w-16 h-16 rounded-xl shadow-sm bg-white p-1 flex items-center justify-center shrink-0 hover:scale-105 transition-transform duration-300 cursor-pointer border border-app"
                            >
                              <img src={bankInfo.qrUrl} alt="QR Pago" className="w-full h-full object-contain" />
                            </div>
                          )}
                        </div>
                      )}
                      {bankInfo2?.activa && bankInfo2?.banco && (
                        <div className="flex items-center justify-between gap-3 text-xs pt-3 border-t border-app/50">
                          <div className="space-y-1 flex-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                              {bankInfo2.banco}
                            </span>
                            <p className="text-[10px] text-muted">
                              Tipo: <span className="font-extrabold text-app">{bankInfo2.tipoCuenta === 'ahorros' ? 'Ahorros' : bankInfo2.tipoCuenta === 'corriente' ? 'Corriente' : 'Digital'}</span>
                            </p>
                            <p className="font-mono text-xs text-muted">
                              Número: <span className="font-black text-app bg-surface-2 px-1.5 py-0.5 rounded">{bankInfo2.numeroCuenta}</span>
                            </p>
                            <p className="text-[10px] text-muted">
                              Titular: <span className="font-bold text-app">{bankInfo2.titular}</span>
                            </p>
                          </div>
                          {bankInfo2.qrUrl && (
                            <div 
                              onClick={() => setExpandedQrUrl(bankInfo2.qrUrl)}
                              className="w-16 h-16 rounded-xl shadow-sm bg-white p-1 flex items-center justify-center shrink-0 hover:scale-105 transition-transform duration-300 cursor-pointer border border-app"
                            >
                              <img src={bankInfo2.qrUrl} alt="QR Pago 2" className="w-full h-full object-contain" />
                            </div>
                          )}
                        </div>
                      )}
                      {!bankInfo?.banco && (!bankInfo2?.activa || !bankInfo2?.banco) && (
                        <p className="text-xs text-muted text-center py-2">No hay cuentas bancarias configuradas.</p>
                      )}
                    </div>
                  </div>
                )}

                <textarea className="portal-notes mt-2" placeholder="Notas adicionales (opcional)" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              {/* Total y acción */}
              <div className="portal-checkout-footer">
                <div className="portal-total">
                  <span>Total</span>
                  <span className="portal-total-amount">{formatCurrency(getTotal())}</span>
                </div>
                <button className="portal-finalize-btn" disabled={isSubmitting || cart.length === 0} onClick={finalizeSale}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><ShoppingCart size={18} /> Finalizar Venta</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
