import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Image as ImageIcon } from 'lucide-react'
import { formatCurrency } from '../../../utils/formatters'
import useCartStore from '../../../store/cartStore'
import useGuidedStore from '../../../store/guidedStore'
import SmartHint from '../guided/SmartHint'
import ModalTemplate from '../../common/ModalTemplate'
import QuantitySelector from '../../ui/QuantitySelector'


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

export default function ProductDetailModal({ product, isOpen, onClose }) {
  const { addItem } = useCartStore()
  const { markStepCompleted } = useGuidedStore()
  
  const [selectedTalla, setSelectedTalla] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)

  const availableVariants = useMemo(() => {
    if (!product) return []
    return product.variantes.filter(v => v.stock > 0)
  }, [product])

  const tallas = useMemo(() => {
    const t = new Set(availableVariants.map(v => v.talla).filter(Boolean))
    return Array.from(t)
  }, [availableVariants])

  const colores = useMemo(() => {
    let validVariants = availableVariants
    if (selectedTalla) {
      validVariants = validVariants.filter(v => v.talla === selectedTalla)
    }
    const c = new Set(validVariants.map(v => v.color).filter(Boolean))
    return Array.from(c)
  }, [availableVariants, selectedTalla])

  useEffect(() => {
    if (isOpen && product) {
      setSelectedTalla(null)
      setSelectedColor(null)
      setCantidad(1)
      setError('')
      
      const vars = product.variantes.filter(v => v.stock > 0)
      const t = Array.from(new Set(vars.map(v => v.talla).filter(Boolean)))
      const c = Array.from(new Set(vars.map(v => v.color).filter(Boolean)))
      
      if (t.length === 1) setSelectedTalla(t[0])
      if (c.length === 1) setSelectedColor(c[0])
    }
  }, [isOpen, product?.id])

  const currentVariant = useMemo(() => {
    if (!product) return null
    return availableVariants.find(v => 
      (v.talla === selectedTalla || (!v.talla && !selectedTalla)) &&
      (v.color === selectedColor || (!v.color && !selectedColor))
    )
  }, [availableVariants, selectedTalla, selectedColor, product])

  const handleAddToCart = () => {
    setError('')
    
    if (tallas.length > 0 && !selectedTalla) {
      setError('Por favor selecciona una talla')
      return
    }
    if (colores.length > 0 && !selectedColor) {
      setError('Por favor selecciona un color')
      return
    }

    if (!currentVariant) {
      setError('Esta combinación no está disponible actualmente')
      return
    }

    const state = useCartStore.getState()
    const existingInCart = state.items.find(i => i.productId === product.id && i.variantId === currentVariant.id)
    const currentCartQty = existingInCart ? existingInCart.cantidad : 0

    if (cantidad + currentCartQty > currentVariant.stock) {
      if (currentCartQty > 0) {
        setError(`Solo puedes agregar ${currentVariant.stock - currentCartQty} más (Ya tienes ${currentCartQty} en el carrito)`)
      } else {
        setError(`Solo hay ${currentVariant.stock} unidades disponibles`)
      }
      return
    }

    const actualPrice = (product.tienePromocion && product.precioPromo < product.precioBase)
      ? product.precioPromo
      : product.precioBase

    addItem({
      productId: product.id,
      variantId: currentVariant.id,
      nombre: product.nombre,
      precio: actualPrice,
      talla: selectedTalla,
      color: selectedColor,
      imageUrl: product.imageUrl,
      maxStock: currentVariant.stock,
    }, cantidad)

    markStepCompleted('add_to_cart')

    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
      onClose()
    }, 1200)
  }

  // Guard: no renderizar ni evaluar JSX si el producto es null
  if (!product) return null

  // Renderizado de las acciones en el sticky footer del modal
  const footerActions = (
    <div className="w-full flex flex-col gap-3">
      {error && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl font-medium text-center"
        >
          {error}
        </motion.p>
      )}
      <div className="flex gap-3">
        <QuantitySelector
          value={cantidad}
          onChange={setCantidad}
          min={1}
          max={currentVariant?.stock || 10}
          className="h-14"
        />


        <button
          onClick={handleAddToCart}
          disabled={currentVariant?.stock === 0}
          className={`flex-1 h-14 rounded-2xl font-bold text-base transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${
            currentVariant?.stock === 0
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-action text-white hover:opacity-90 shadow-lg shadow-action/20'
          }`}
        >
          {currentVariant?.stock === 0 ? (
            <span>Agotado</span>
          ) : (
            <>
              <ShoppingBag size={20} />
              Agregar {formatCurrency(((product.tienePromocion && product.precioPromo < product.precioBase) ? product.precioPromo : product.precioBase) * cantidad)}
            </>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <ModalTemplate
        isOpen={isOpen}
        onClose={onClose}
        title={product.nombre}
        subtitle={product.categoria}
        icon={ShoppingBag}
        footerActions={footerActions}
      >
        {/* Imagen del producto */}
        <div className="relative w-full h-48 sm:h-64 bg-surface-2 rounded-2xl overflow-hidden shrink-0 border border-app">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.nombre}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted">
              <ImageIcon size={48} className="opacity-50 mb-2" />
            </div>
          )}
        </div>

        {/* Precios */}
        <div className="mt-4">
          {product.tienePromocion && product.precioPromo < product.precioBase ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-primary">
                {formatCurrency(product.precioPromo)}
              </span>
              <span className="text-xs text-muted line-through font-semibold">
                {formatCurrency(product.precioBase)}
              </span>
            </div>
          ) : (
            <p className="text-2xl font-black text-primary">
              {formatCurrency(product.precioBase)}
            </p>
          )}
          {product.descripcion && (
            <p className="text-sm text-muted mt-2 leading-relaxed">
              {product.descripcion}
            </p>
          )}
        </div>

        {/* Selección de Talla */}
        {tallas.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-app mb-3 flex justify-between items-center">
              Talla <span className="text-xs font-normal text-muted">Selecciona una opción</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {tallas.map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setSelectedTalla(t)
                    if (selectedColor) {
                      const hasColor = availableVariants.some(v => v.talla === t && v.color === selectedColor)
                      if (!hasColor) setSelectedColor(null)
                    }
                    setError('')
                  }}
                  className={`h-10 px-4 rounded-xl text-sm font-semibold transition-all border-2 active:scale-95 ${
                    selectedTalla === t 
                      ? 'border-primary bg-primary text-white' 
                      : 'border-app bg-transparent text-app hover:border-primary/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selección de Color */}
        {colores.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-app mb-3 flex justify-between items-center">
              Color 
              <span className="text-xs font-bold text-primary">
                {selectedColor ? selectedColor.toUpperCase() : <span className="text-muted font-normal">Selecciona una opción</span>}
              </span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {colores.map(c => {
                const cssColor = getCssColor(c)
                const isWhite = cssColor === '#FFFFFF' || cssColor.toLowerCase() === '#fff'
                const isSelected = selectedColor === c
                
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedColor(c)
                      setError('')
                    }}
                    title={c}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : 'ring-1 ring-app hover:ring-primary/50'
                    }`}
                  >
                    <span 
                      className={`w-10 h-10 rounded-full shadow-inner ${isWhite ? 'border border-app' : ''}`}
                      style={{ backgroundColor: cssColor }}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Estatus de stock variante */}
        {currentVariant && (
          <motion.p 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`text-sm font-semibold mt-4 ${
              currentVariant.stock === 0 ? 'text-error' : 'text-success'
            }`}
          >
            {currentVariant.stock === 0 ? 'Esta variante está agotada' : `${currentVariant.stock} unidades disponibles`}
          </motion.p>
        )}

        {/* Ayuda Asistente */}
        <div className="mt-8 mb-2 relative">
          <SmartHint 
            stepId="product_detail" 
            message="Aquí puedes ver más detalles del producto. Selecciona talla y color si aplica." 
            position="bottom" 
            delay={1000} 
          />
        </div>
      </ModalTemplate>

      {/* Toast de agregado al carrito */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-4 right-4 bg-success text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-[100] border border-success/80"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <p className="font-bold text-sm">Agregado al carrito exitosamente.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
