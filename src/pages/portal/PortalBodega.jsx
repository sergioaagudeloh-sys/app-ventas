/**
 * PortalBodega.jsx
 * Portal operativo del Bodeguero.
 * Permite registrar movimientos de inventario (entrada, salida, ajuste, merma)
 * y consultar el stock actual de productos.
 */
import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Warehouse, Plus, Minus, Package, Search, CheckCircle2, AlertCircle, Loader2, X, ArrowUpCircle, ArrowDownCircle, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useProducts } from '../../hooks/useInventory'
import { registerStockMovement, subscribeToEmployeeMovements } from '../../services/stockMovementService'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from '../../config/firebaseConfig'
import { COLLECTIONS } from '../../constants'
import usePortalStore from '../../store/portalStore'
import { formatCurrency } from '../../utils/formatters'

const TYPES = [
  { value: 'entrada',  label: 'Entrada',  Icon: ArrowUpCircle,   color: '#34d399' },
  { value: 'salida',   label: 'Salida',   Icon: ArrowDownCircle, color: '#fb923c' },
  { value: 'ajuste',   label: 'Ajuste',   Icon: SlidersHorizontal, color: '#38bdf8' },
  { value: 'merma',    label: 'Merma',    Icon: Trash2,          color: '#f87171' },
]

export default function PortalBodega() {
  const queryClient = useQueryClient()
  const { portalEmployee } = usePortalStore()
  const { data: products = [], isLoading } = useProducts(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [moveType, setMoveType] = useState('entrada')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'ok' | 'error', msg }

  const [activeLeftTab, setActiveLeftTab] = useState('products') // 'products' | 'movements'
  const [employeeMovements, setEmployeeMovements] = useState([])

  // Suscribirse a los movimientos de este empleado
  useEffect(() => {
    if (!portalEmployee?.id) return
    const unsub = subscribeToEmployeeMovements(portalEmployee.id, setEmployeeMovements)
    return () => unsub()
  }, [portalEmployee?.id])

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(t)
    }
  }, [feedback])

  const filtered = useMemo(() => products.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  ), [products, searchTerm])

  const selectProduct = (p) => {
    setSelectedProduct(p)
    setSelectedVariant(p.variantes?.length === 1 ? p.variantes[0] : null)
    setQuantity('')
    setReason('')
    setFeedback(null)
  }

  const handleRegister = async () => {
    if (!selectedProduct || !selectedVariant) { setFeedback({ type: 'error', msg: 'Selecciona un producto y variante.' }); return }
    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) { setFeedback({ type: 'error', msg: 'Ingresa una cantidad válida.' }); return }

    setLoading(true)
    try {
      // 1. Registrar el movimiento en el log
      await registerStockMovement({
        productId: selectedProduct.id,
        productName: selectedProduct.nombre,
        type: moveType,
        quantity: qty,
        reason,
        employeeId: portalEmployee?.id || '',
        employeeName: portalEmployee?.nombre || '',
      })

      // 2. Actualizar el stock de la variante en Firestore
      const currentStock = selectedVariant.stock || 0
      let newStock = currentStock
      if (moveType === 'entrada') newStock = currentStock + qty
      else if (moveType === 'salida' || moveType === 'merma') newStock = Math.max(0, currentStock - qty)
      else if (moveType === 'ajuste') newStock = qty

      const updatedVariantes = selectedProduct.variantes.map(v =>
        v.id === selectedVariant.id ? { ...v, stock: newStock } : v
      )
      await updateDoc(doc(db, COLLECTIONS.PRODUCTS, selectedProduct.id), { variantes: updatedVariantes })

      // Invalidar caché de productos en react-query para actualizar el listado izquierdo y otros componentes
      queryClient.invalidateQueries({ queryKey: ['products'] })

      // Sincronizar el estado local para reflejar la actualización inmediatamente en el portal de bodega
      const updatedProduct = { ...selectedProduct, variantes: updatedVariantes }
      setSelectedProduct(updatedProduct)
      const newVar = updatedVariantes.find(v => v.id === selectedVariant.id)
      if (newVar) {
        setSelectedVariant(newVar)
      }

      setFeedback({ type: 'ok', msg: `${moveType === 'ajuste' ? 'Stock ajustado a' : 'Movimiento registrado.'} ${moveType === 'ajuste' ? newStock + ' und.' : ''}` })
      setQuantity('')
      setReason('')
    } catch (e) {
      setFeedback({ type: 'error', msg: `Error: ${e.message}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="portal-bodega">
      <div className="portal-bodega-header">
        <div className="portal-bodega-icon"><Warehouse size={24} /></div>
        <div>
          <h1 className="portal-bodega-title">Bodega / Inventario</h1>
          <p className="portal-bodega-sub">Registra movimientos de stock en tiempo real</p>
        </div>
      </div>

      <div className="portal-bodega-grid">
        {/* ─── PANEL IZQUIERDO: LISTA DE PRODUCTOS O HISTORIAL ───────── */}
        <div className="portal-bodega-products flex flex-col h-full">
          {/* Selector de pestañas */}
          <div className="flex border border-app mb-3 gap-1 p-1 bg-surface-2 rounded-xl shrink-0">
            <button
              onClick={() => setActiveLeftTab('products')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeLeftTab === 'products'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-app'
              }`}
            >
              <Package size={14} /> Productos
            </button>
            <button
              onClick={() => setActiveLeftTab('movements')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeLeftTab === 'movements'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-app'
              }`}
            >
              <SlidersHorizontal size={14} /> Mis Movimientos
            </button>
          </div>

          {activeLeftTab === 'products' ? (
            <>
              <div className="portal-search-box shrink-0">
                <Search size={16} />
                <input className="portal-search-input" placeholder="Buscar producto..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} />
                {searchTerm && <button onClick={() => setSearchTerm('')}><X size={14} /></button>}
              </div>
              {isLoading ? (
                <div className="portal-loading flex-1 flex items-center justify-center"><Loader2 className="animate-spin" size={24} /></div>
              ) : (
                <div className="portal-bodega-list flex-1 overflow-y-auto">
                  {filtered.map(p => {
                    const totalStock = p.variantes?.reduce((s, v) => s + (v.stock || 0), 0) || 0
                    return (
                      <button key={p.id} className={`portal-bodega-product-btn ${selectedProduct?.id === p.id ? 'portal-bodega-product-btn--active' : ''}`}
                        onClick={() => selectProduct(p)}>
                        <div className="portal-bodega-product-info">
                          <p className="portal-bodega-product-name">{p.nombre}</p>
                          <p className="portal-bodega-product-price">{formatCurrency(p.precioBase)}</p>
                        </div>
                        <span className={`portal-stock-badge ${totalStock <= 0 ? 'portal-stock-badge--agotado' : totalStock <= 5 ? 'portal-stock-badge--low' : ''}`}>
                          {totalStock} und.
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="portal-bodega-list flex-1 overflow-y-auto space-y-2.5 pr-1 mt-1">
              {employeeMovements.length === 0 ? (
                <div className="portal-bodega-empty py-16 flex flex-col items-center justify-center">
                  <SlidersHorizontal size={32} className="text-muted/40 mb-2" />
                  <p className="text-xs text-muted">No has registrado movimientos recientemente</p>
                </div>
              ) : (
                employeeMovements.map((m) => {
                  const typeColors = {
                    entrada: { bg: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20', label: 'Entrada' },
                    salida: { bg: 'bg-orange-500/10 text-orange-500 border border-orange-500/20', label: 'Salida' },
                    ajuste: { bg: 'bg-sky-500/10 text-sky-500 border border-sky-500/20', label: 'Ajuste' },
                    merma: { bg: 'bg-red-500/10 text-red-500 border border-red-500/20', label: 'Merma' },
                  }
                  const type = typeColors[m.type] || { bg: 'bg-app/10 text-app border border-app/20', label: m.type }
                  const dateStr = m.createdAt?.seconds 
                    ? new Date(m.createdAt.seconds * 1000).toLocaleString('es-CO', { 
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                      })
                    : '—'
                  
                  return (
                    <div key={m.id} className="p-3 bg-surface rounded-xl border border-app text-left flex flex-col gap-1.5 shadow-sm transition-all hover:border-app-hover">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${type.bg}`}>
                          {type.label}
                        </span>
                        <span className="text-[10px] text-muted font-medium">{dateStr}</span>
                      </div>
                      <div className="text-xs text-app font-semibold">
                        {m.productName}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>Cantidad: <strong className="text-app">{m.quantity} und.</strong></span>
                        {m.reason && <span className="italic max-w-[150px] truncate" title={m.reason}>"{m.reason}"</span>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* ─── PANEL DERECHO: FORMULARIO DE MOVIMIENTO ──────────────── */}
        <div className="portal-bodega-form-panel">
          {!selectedProduct ? (
            <div className="portal-bodega-empty">
              <Package size={48} />
              <p>Selecciona un producto de la lista</p>
            </div>
          ) : (
            <div className="portal-bodega-form">
              <div className="portal-bodega-form-header">
                <p className="portal-bodega-form-title">{selectedProduct.nombre}</p>
                <button className="portal-bodega-close" onClick={() => setSelectedProduct(null)}><X size={18} /></button>
              </div>

              {/* Variante */}
              {selectedProduct.variantes?.length > 1 && (
                <div className="portal-section">
                  <p className="portal-section-title">Variante</p>
                  <div className="portal-bodega-variants">
                    {selectedProduct.variantes.map(v => (
                      <button key={v.id} className={`portal-variant-btn ${selectedVariant?.id === v.id ? 'portal-variant-btn--active' : ''}`}
                        onClick={() => setSelectedVariant(v)}>
                        <span>{[v.talla, v.color].filter(Boolean).join(' / ') || 'Estándar'}</span>
                        <span className="portal-variant-stock">{v.stock || 0} und.</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedVariant && (
                <div className="portal-bodega-current-stock">
                  Stock actual: <strong>{selectedVariant.stock || 0} unidades</strong>
                </div>
              )}

              {/* Tipo de movimiento */}
              <div className="portal-section">
                <p className="portal-section-title">Tipo de movimiento</p>
                <div className="portal-bodega-types">
                  {TYPES.map(({ value, label, Icon, color }) => (
                    <button key={value} className={`portal-type-btn ${moveType === value ? 'portal-type-btn--active' : ''}`}
                      style={moveType === value ? { background: color + '22', borderColor: color, color } : {}}
                      onClick={() => setMoveType(value)}>
                      <Icon size={16} /><span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cantidad */}
              <div className="portal-section">
                <p className="portal-section-title">{moveType === 'ajuste' ? 'Nuevo stock total' : 'Cantidad'}</p>
                <input className="portal-input" type="number" min="1" placeholder="0"
                  value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>

              {/* Motivo */}
              <div className="portal-section">
                <p className="portal-section-title">Motivo / Referencia (opcional)</p>
                <input className="portal-input" placeholder="Ej: Factura #1234, merma por daño..." value={reason}
                  onChange={e => setReason(e.target.value)} />
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`portal-bodega-feedback ${feedback.type === 'ok' ? 'portal-bodega-feedback--ok' : 'portal-bodega-feedback--error'}`}
                    onClick={() => setFeedback(null)}>
                    {feedback.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{feedback.msg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button className="portal-bodega-submit-btn" disabled={loading || !selectedVariant} onClick={handleRegister}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Registrar Movimiento</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
