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
  ChefHat, AlertCircle
} from 'lucide-react'
import { useProducts, useCategories } from '../../hooks/useInventory'
import { useCreatePhysicalOrder } from '../../hooks/useOrders'
import { getClientByPhone, saveClientProfile } from '../../services/userService'
import usePortalStore from '../../store/portalStore'
import useAppConfigStore from '../../store/appConfigStore'
import { formatCurrency } from '../../utils/formatters'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../../constants'

export default function PortalVendedor() {
  const { portalEmployee } = usePortalStore()
  const { appName, appIcon, whatsappAdmin, creditsEnabled } = useAppConfigStore()
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

  // Búsqueda de cliente en tiempo real
  useEffect(() => {
    const clean = celular.replace(/\D/g, '')
    if (clean.length < 10) { setFoundClient(null); setClientSearchStatus(''); return }
    const timer = setTimeout(async () => {
      setClientSearchStatus('searching')
      try {
        const client = await getClientByPhone(clean)
        if (client) { setFoundClient(client); setClientName(client.nombre); setClientSearchStatus('found') }
        else { setFoundClient(null); setClientName(''); setClientSearchStatus('not_found') }
      } catch { setClientSearchStatus('') }
    }, 350)
    return () => clearTimeout(timer)
  }, [celular])

  const registerClient = async () => {
    const clean = celular.replace(/\D/g, '')
    if (!clean || !clientName.trim()) return
    setIsRegisteringClient(true)
    try {
      await saveClientProfile(clean, clientName.trim())
      setFoundClient({ id: clean, nombre: clientName.trim(), celular: clean })
      setClientSearchStatus('found')
    } catch { setStockAlert('Error al registrar el cliente.') }
    finally { setIsRegisteringClient(false) }
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
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
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
              <div className="portal-variants-header">
                <span className="portal-variants-title">{selectedProductForVariant.nombre}</span>
                <button onClick={() => setSelectedProductForVariant(null)}><X size={20} /></button>
              </div>
              <div className="portal-variants-list">
                {selectedProductForVariant.variantes?.map(v => (
                  <button key={v.id} disabled={v.stock <= 0}
                    className={`portal-variant-btn ${v.stock <= 0 ? 'portal-variant-btn--disabled' : ''}`}
                    onClick={() => { addToCart(selectedProductForVariant, v, 1); setSelectedProductForVariant(null) }}>
                    <span>{[v.talla, v.color].filter(Boolean).join(' / ') || 'Estándar'}</span>
                    <span className="portal-variant-stock">{v.stock <= 0 ? 'Agotado' : `${v.stock} und.`}</span>
                  </button>
                ))}
              </div>
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

        {/* ─── PANEL CARRITO / CHECKOUT ─────────────────────────────────── */}
        <div className={`portal-checkout-panel ${activeTab !== 'cart' ? 'portal-panel--hidden' : ''}`}>
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
          <div className="portal-section portal-section--cart">
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
          <div className="portal-section">
            <p className="portal-section-title">Método de pago</p>
            <div className="portal-payment-methods">
              {[
                { v: PAYMENT_METHODS.CASH, label: 'Efectivo', Icon: Coins },
                { v: PAYMENT_METHODS.TRANSFER, label: 'Transferencia', Icon: CreditCard },
                ...(creditsEnabled ? [{ v: PAYMENT_METHODS.CREDIT, label: 'Crédito', Icon: Wallet }] : []),
              ].map(({ v, label, Icon }) => (
                <button key={v} className={`portal-payment-btn ${paymentMethod === v ? 'portal-payment-btn--active' : ''}`} onClick={() => setPaymentMethod(v)}>
                  <Icon size={16} /><span>{label}</span>
                </button>
              ))}
            </div>
            <textarea className="portal-notes" placeholder="Notas adicionales (opcional)" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
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
      </div>
    </div>
  )
}
