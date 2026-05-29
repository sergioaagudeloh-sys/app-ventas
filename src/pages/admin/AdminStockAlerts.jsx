import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Package, Plus, Minus, Check, Loader2, Search, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../../components/ui/BackButton'
import QuantitySelector from '../../components/ui/QuantitySelector'
import { useProducts, useUpdateProduct } from '../../hooks/useInventory'


export default function AdminStockAlerts() {
  const navigate = useNavigate()
  const { data: products = [], isLoading } = useProducts()
  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct()

  // Buscador local de alertas
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estado para guardar las cantidades que se van a abastecer por cada variante
  // La llave será `${productoId}-${varianteId}`
  const [stockToLoad, setStockToLoad] = useState({})
  
  // Estado local para rastrear cuáles variantes se acaban de actualizar exitosamente (feedback visual)
  const [successStatus, setSuccessStatus] = useState({})

  // ─── EXTRAER PRODUCTOS Y VARIANTES CON BAJO STOCK ──────────────────────────
  const stockAlerts = useMemo(() => {
    const alerts = []
    
    products.forEach(p => {
      (p.variantes || []).forEach(v => {
        if (v.stock <= p.umbralAlerta) {
          const variantName = [v.color, v.talla].filter(Boolean).join(' / ') || 'Estándar'
          alerts.push({
            productId: p.id,
            productName: p.nombre,
            variantId: v.id,
            variantName,
            stock: v.stock,
            umbral: p.umbralAlerta,
            imageUrl: p.imageUrl,
            variantes: p.variantes // guardamos todas las variantes para poder actualizar
          })
        }
      })
    })

    // Filtrar por término de búsqueda si existe
    if (searchTerm.trim() !== '') {
      return alerts.filter(a =>
        a.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.variantName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return alerts
  }, [products, searchTerm])

  // Manejador del cambio en el input de stock adicional
  const handleQtyChange = (key, value) => {
    const qty = parseInt(value, 10)
    setStockToLoad(prev => ({
      ...prev,
      [key]: isNaN(qty) ? '' : Math.max(0, qty)
    }))
  }

  // Incremento / Decremento rápido
  const adjustQty = (key, delta) => {
    const current = parseInt(stockToLoad[key] || 0, 10)
    setStockToLoad(prev => ({
      ...prev,
      [key]: Math.max(0, current + delta)
    }))
  }

  // Cargar nuevo stock a Firestore
  const handleLoadStock = async (alertItem) => {
    const key = `${alertItem.productId}-${alertItem.variantId}`
    const qtyToAdd = parseInt(stockToLoad[key] || 0, 10)
    if (!qtyToAdd || qtyToAdd <= 0) return

    try {
      // Encontrar todas las variantes del producto actual
      const updatedVariantes = alertItem.variantes.map(v => {
        if (v.id === alertItem.variantId) {
          return {
            ...v,
            stock: (v.stock || 0) + qtyToAdd
          }
        }
        return v
      })

      // Actualizar el producto en Firebase
      await updateProduct({
        id: alertItem.productId,
        data: { variantes: updatedVariantes }
      })

      // Limpiar cantidad ingresada
      setStockToLoad(prev => ({
        ...prev,
        [key]: ''
      }))

      // Mostrar feedback visual de éxito por 2.5s
      setSuccessStatus(prev => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setSuccessStatus(prev => ({ ...prev, [key]: false }))
      }, 2500)

    } catch (error) {
      console.error('Error al actualizar el inventario:', error)
      alert('Ocurrió un error al cargar el inventario.')
    }
  }

  // Animaciones de Framer Motion
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col gap-6"
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton to="/admin/inicio" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-app">Reabastecer Inventario</h1>
            <p className="text-xs md:text-sm text-muted">Carga inventario directamente a los productos con stock bajo.</p>
          </div>
        </div>


        {/* Contador de Alertas */}
        <span className="px-4 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0">
          {stockAlerts.length} Alerta(s)
        </span>
      </div>

      {/* Buscador de Alertas */}
      <div className="bg-surface rounded-3xl p-4 border border-app shadow-sm">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre de producto, talla o color..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-surface-2 border border-app text-sm text-app placeholder-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Listado de Alertas de Stock */}
      {isLoading ? (
        <div className="bg-surface rounded-3xl p-12 border border-app text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-3" size={32} />
          <p className="text-sm text-muted">Cargando inventario bajo de Firebase...</p>
        </div>
      ) : stockAlerts.length === 0 ? (
        <div className="bg-surface rounded-3xl p-12 border border-app text-center flex flex-col items-center justify-center">
          <Package className="text-success mb-3 animate-bounce" size={48} />
          <h3 className="font-bold text-lg text-app">¡Inventario Completo!</h3>
          <p className="text-sm text-muted mt-1">Ningún producto está por debajo de su umbral de alerta.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {stockAlerts.map(alertItem => {
            const key = `${alertItem.productId}-${alertItem.variantId}`
            const loadVal = stockToLoad[key] || ''
            const hasSuccess = successStatus[key]
            
            return (
              <motion.div
                key={key}
                layout
                className="bg-surface rounded-3xl p-4 md:p-5 border border-app shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Info del Producto */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-app overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {alertItem.imageUrl ? (
                      <img src={alertItem.imageUrl} alt={alertItem.productName} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={24} className="text-muted/60" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-app text-base leading-tight truncate">{alertItem.productName}</h3>
                    <p className="text-xs font-semibold text-primary mt-1">{alertItem.variantName}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-red-500 font-bold uppercase bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                        Restantes: {alertItem.stock}
                      </span>
                      <span className="text-[10px] text-muted font-medium">
                        Umbral: {alertItem.umbral} unds
                      </span>
                    </div>
                  </div>
                </div>

                {/* Formulario de Carga Directa */}
                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
                  {/* Selector Numérico Atómico */}
                  <QuantitySelector
                    value={parseInt(loadVal, 10) || 0}
                    onChange={(val) => handleQtyChange(key, val)}
                    min={0}
                    max={999}
                    className="w-[130px]"
                  />

                  {/* Botón de Cargar */}
                  <button
                    onClick={() => handleLoadStock(alertItem)}
                    disabled={!loadVal || loadVal <= 0 || isUpdating}
                    className={`h-11 px-5 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 w-[130px] shadow-sm ${
                      hasSuccess 
                        ? 'bg-green-500 text-white shadow-green-200' 
                        : 'bg-primary text-white hover:opacity-90 disabled:opacity-50'
                    }`}
                  >
                    {isUpdating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : hasSuccess ? (
                      <>
                        <Check size={16} /> ¡Cargado!
                      </>
                    ) : (
                      'Cargar Stock'
                    )}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
