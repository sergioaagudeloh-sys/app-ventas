import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, PackageX, Sparkles, X, Tag } from 'lucide-react'
import { useProducts, useCategories } from '../../hooks/useInventory'
import { getCategoryIconComponent } from '../../constants/categoryIcons'
import { useAds } from '../../hooks/useAds'
import useAppConfigStore from '../../store/appConfigStore'
import SmartHint from '../../components/client/guided/SmartHint'
import ProductCard from '../../components/client/catalog/ProductCard'
import ProductDetailModal from '../../components/client/catalog/ProductDetailModal'
import WholesaleRequestModal from '../../components/client/catalog/WholesaleRequestModal'
import ClientFilterModal from '../../components/client/catalog/ClientFilterModal'
import CatalogBanner from '../../components/client/catalog/CatalogBanner'
import { SUPPORT_WHATSAPP } from '../../constants'
import { fuzzyMatch } from '../../utils/search'

export default function ClientCatalog() {
  // Datos
  const { data: allProducts = [], isLoading: isLoadingProducts } = useProducts(true) // Solo activos
  const { data: allCategories = [] } = useCategories()
  const { data: ads = [] } = useAds()
  const { catalogFilters, catalogLayout, wholesaleSettings } = useAppConfigStore()
  
  // Estado local
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false)
  
  // Modales
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [wholesaleRequest, setWholesaleRequest] = useState(null) // { product, type: 'mayorista' | 'encargo' }
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState({})
  const [promoModalAd, setPromoModalAd] = useState(null)



  // Filtrar anuncios activos en tiempo real en el frontend
  const activeAds = useMemo(() => {
    return ads.filter(ad => {
      if (!ad.active) return false
      const today = new Date().toISOString().split('T')[0]
      return today >= ad.startDate && today <= ad.endDate
    })
  }, [ads])

  // Procesar productos reales (aplicar descuentos) e inyectar productos temporales
  const processedProducts = useMemo(() => {
    // 1. Mapear productos reales y aplicarles descuento de promoción vinculada activa
    const realProductsMapped = allProducts.map(p => {
      const matchedCat = allCategories.find(c => c.id === p.categoriaId)
      const baseProduct = {
        ...p,
        categoria: matchedCat ? matchedCat.nombre : p.categoria
      }

      const ad = activeAds.find(a => a.type === 'inventory' && a.productId === p.id)
      if (ad) {
        const discountValue = Number(ad.discountValue)
        let precioPromocional = baseProduct.precioBase
        if (ad.discountType === 'percentage') {
          precioPromocional = baseProduct.precioBase - (baseProduct.precioBase * discountValue) / 100
        } else {
          precioPromocional = baseProduct.precioBase - discountValue
        }
        precioPromocional = Math.max(0, precioPromocional)
        
        return {
          ...baseProduct,
          precioPromo: precioPromocional,
          tienePromocion: true,
          promocion: ad,
        }
      }
      return baseProduct
    })

    // 2. Crear productos temporales de promociones personalizadas
    const temporalProducts = activeAds
      .filter(ad => ad.type === 'custom' && ad.isTemporalProduct)
      .map(ad => ({
        id: `temp-${ad.id}`,
        nombre: ad.title,
        descripcion: ad.description,
        categoria: ad.category || 'Combos',
        categoriaId: 'combos-temporales',
        precioBase: ad.price || 0,
        precioPromo: ad.promoPrice || 0,
        tienePromocion: true,
        imageUrl: ad.image || ad.banner,
        activo: true,
        destacado: true,
        isTemporal: true,
        promocion: ad,
        variantes: [{ id: `var-temp-${ad.id}`, stock: 9999, talla: '', color: '' }] // dummy variant
      }))

    // Unir productos y combos
    const combined = [...realProductsMapped, ...temporalProducts]

    // 3. Ordenar para dar prioridad visual a promociones
    return combined.sort((a, b) => {
      const aPromo = a.tienePromocion ? 1 : 0
      const bPromo = b.tienePromocion ? 1 : 0
      return bPromo - aPromo
    })
  }, [allProducts, activeAds, allCategories])

  // Categorías activas para el grid de navegación (todas las que el admin creó y activó)
  const activeCategories = useMemo(() => {
    const cats = allCategories.filter(c => c.activa)
    const hasTemp = processedProducts.some(p => p.isTemporal)
    if (hasTemp) {
      return [...cats, { id: 'combos-temporales', nombre: 'Ofertas y Combos', activa: true }]
    }
    return cats
  }, [processedProducts, allCategories])

  // Determinar categorías visibles para mantener el grid compacto por defecto
  const visibleCategories = useMemo(() => {
    if (isCategoriesExpanded || activeCategories.length <= 3) {
      return activeCategories
    }
    return activeCategories.slice(0, 3)
  }, [activeCategories, isCategoriesExpanded])

  // Filtrado final de productos (por término de búsqueda y categoría seleccionada)
  const filteredProducts = useMemo(() => {
    let result = processedProducts

    if (selectedCategoryId !== 'all') {
      result = result.filter(p => p.categoriaId === selectedCategoryId)
    }

    if (searchTerm.trim()) {
      result = result.filter(p => {
        const inName = fuzzyMatch(p.nombre, searchTerm)
        const inDesc = fuzzyMatch(p.descripcion, searchTerm)
        let inAttrs = false
        if (p.atributos) {
          inAttrs = Object.values(p.atributos).some(val => 
            fuzzyMatch(String(val), searchTerm)
          )
        }
        return inName || inDesc || inAttrs
      })
    }

    // Filtros Avanzados (para atributos dinámicos)
    catalogFilters.customAttributes?.forEach(attr => {
      if (activeFilters[attr.id]?.length > 0) {
        result = result.filter(p => activeFilters[attr.id].includes(p.atributos?.[attr.id]))
      }
    })
    
    // Filtros de Talla y Color de variante
    if (activeFilters.sizes?.length > 0 || activeFilters.colors?.length > 0) {
      result = result.filter(p => {
        if (!p.variantes || p.variantes.length === 0) return false
        
        return p.variantes.some(v => {
          const matchSize = activeFilters.sizes?.length > 0 ? activeFilters.sizes.includes(v.talla) : true
          const matchColor = activeFilters.colors?.length > 0 ? activeFilters.colors.includes(v.color) : true
          return matchSize && matchColor
        })
      })
    }

    return result
  }, [processedProducts, searchTerm, selectedCategoryId, catalogFilters, activeFilters])

  const hasActiveFilters = Object.values(activeFilters).flat().length > 0

  // Manejar clics de CTA y banners
  const handleAdAction = (action) => {
    if (!action) return
    
    if (action.type === 'product') {
      const prod = processedProducts.find(p => p.id === action.value?.id)
      if (prod) {
        if (prod.isTemporal) {
          setPromoModalAd(prod.promocion)
        } else {
          setSelectedProduct(prod)
        }
      }
    } else if (action.type === 'whatsapp') {
      const cleanPhone = action.value ? action.value.replace(/\D/g, '') : SUPPORT_WHATSAPP.replace(/\D/g, '')
      const message = encodeURIComponent(`¡Hola! Estoy interesado en la promoción: *${action.ad?.title || 'Anuncio'}*`)
      window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank')
    } else if (action.type === 'url') {
      if (action.value) {
        const url = action.value.startsWith('http') ? action.value : `https://${action.value}`
        window.open(url, '_blank')
      }
    } else if (action.type === 'category') {
      const cat = activeCategories.find(c => c.id === action.value || c.nombre.toLowerCase() === action.value.toLowerCase())
      if (cat) {
        setSelectedCategoryId(cat.id)
      } else {
        setSelectedCategoryId('all')
      }
    } else if (action.type === 'modal') {
      setPromoModalAd(action.ad)
    }
  }

  return (
    <div className="pb-6">

      {/* ─── HEADER / BUSCADOR ─────────────────────────────── */}
      <div className="bg-app pt-4 pb-2 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          
          {/* Barra de búsqueda */}
          <div className="relative flex items-center w-full">
            <div className="absolute left-4 flex items-center justify-center pointer-events-none text-muted">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="¿Qué estás buscando hoy?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pl-12 pr-14 rounded-2xl bg-surface border border-app shadow-sm text-app focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base"
            />
            {/* Botón de filtros avanzado */}
            <div className="absolute right-3 flex items-center justify-center">
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:bg-surface-2 transition-colors relative"
              >
                <SlidersHorizontal size={18} className={hasActiveFilters ? "text-primary" : ""} />
                {hasActiveFilters && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface" />
                )}
              </button>
            </div>
          </div>


        </div>
      </div>

      {/* ─── BANNER DEL CATÁLOGO ────────────────────────────────────── */}
      <CatalogBanner onAction={handleAdAction} />

      {/* ─── GRILLA DE PRODUCTOS ────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">

        {/* ─── CATEGORÍAS COMPACTAS (antes de los productos) ─────── */}
        {activeCategories.length > 0 && (
          <div className="mb-5">
            {/* Header de categorías */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Categorías</h3>
              <div className="flex items-center gap-3">
                {selectedCategoryId !== 'all' && (
                  <button
                    onClick={() => setSelectedCategoryId('all')}
                    className="text-[11px] font-semibold text-primary flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    Limpiar <X size={11} />
                  </button>
                )}
                {activeCategories.length > 3 && (
                  <button
                    onClick={() => setIsCategoriesExpanded(v => !v)}
                    className="text-[11px] font-semibold text-muted hover:text-primary transition-colors"
                  >
                    {isCategoriesExpanded ? 'Ver menos' : `Ver todas (${activeCategories.length})`}
                  </button>
                )}
              </div>
            </div>

            {/* Grid de tarjetas cuadradas de categorías */}
            <div className="grid grid-cols-4 gap-2">
              {/* Tarjeta "Todos" */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategoryId('all')}
                className={`aspect-square w-full flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${
                  selectedCategoryId === 'all'
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-surface text-app border-app hover:border-primary/30 hover:bg-surface-2'
                }`}
              >
                <Tag 
                  size={30} 
                  className={`shrink-0 mb-1 transition-colors ${
                    selectedCategoryId === 'all' ? 'text-white' : 'text-primary'
                  }`} 
                />
                <span className="font-extrabold text-[9px] uppercase tracking-wider text-center leading-tight line-clamp-1 select-none">
                  Todos
                </span>
              </motion.button>

              {/* Tarjetas por categoría */}
              {visibleCategories.map(cat => {
                const IconComponent = getCategoryIconComponent(cat.iconName)
                const isSelected = selectedCategoryId === cat.id
                return (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`aspect-square w-full flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-surface text-app border-app hover:border-primary/30 hover:bg-surface-2'
                    }`}
                  >
                    <IconComponent 
                      size={30} 
                      className={`shrink-0 mb-1 transition-colors ${
                        isSelected ? 'text-white' : 'text-primary'
                      }`} 
                    />
                    <span className="font-extrabold text-[9px] uppercase tracking-wider text-center leading-tight line-clamp-2 break-words select-none px-0.5">
                      {cat.nombre}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )}

        {isLoadingProducts ? (
          <div className={
            catalogLayout === 'list' 
              ? "flex flex-col gap-3" 
              : catalogLayout === 'grid3' 
                ? "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4" 
                : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
          }>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={`bg-surface rounded-3xl animate-pulse border border-app ${catalogLayout === 'list' ? 'h-32' : 'aspect-[3/4]'}`} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center mb-4">
              <PackageX size={32} className="text-muted" />
            </div>
            <h3 className="text-lg font-bold text-app mb-1">No encontramos productos</h3>
            <p className="text-muted text-sm max-w-sm">
              Intenta buscar con otras palabras o selecciona una categoría diferente.
            </p>
          </div>
        ) : (
          <div className={
            catalogLayout === 'list' 
              ? "flex flex-col gap-3 md:gap-4" 
              : catalogLayout === 'grid3' 
                ? "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4" 
                : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
          }>
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="flex flex-col animate-fade-in"
              >
                <ProductCard 
                  product={product} 
                  onOpenDetail={(prod) => {
                    if (prod.isTemporal) {
                      setPromoModalAd(prod.promocion)
                    } else {
                      setSelectedProduct(prod)
                    }
                  }} 
                  layout={catalogLayout}
                />
                {/* Ocultar solicitar al por encargo/mayor en productos temporales */}
                {!product.isTemporal && (() => {
                  const totalStock = product.variantes?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0
                  const isOutOfStock = totalStock <= 0
                  
                  // Si no está agotado y las solicitudes al por mayor están desactivadas globalmente, no mostramos el botón
                  if (!isOutOfStock && !(wholesaleSettings?.enabled ?? true)) {
                    return null
                  }

                  return (
                    <button
                      onClick={() => setWholesaleRequest({ product, type: isOutOfStock ? 'encargo' : 'mayorista' })}
                      className={`mt-2 text-xs font-bold transition-all py-1.5 text-center bg-surface rounded-xl border hover:scale-102 active:scale-98 cursor-pointer ${
                        isOutOfStock 
                          ? 'text-orange-500 border-orange-200 hover:border-orange-500 hover:bg-orange-50/10' 
                          : 'text-primary border-app hover:border-primary/50'
                      }`}
                      style={{ borderRadius: 'var(--radius-base)' }}
                    >
                      {isOutOfStock ? 'Pedir por encargo' : 'Solicitar al por mayor'}
                    </button>
                  )
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODALES ────────────────────────────────────────────────── */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <WholesaleRequestModal
        product={wholesaleRequest?.product}
        type={wholesaleRequest?.type}
        isOpen={!!wholesaleRequest}
        onClose={() => setWholesaleRequest(null)}
      />

      <ClientFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        allProducts={allProducts}
        currentFilters={activeFilters}
        onApplyFilters={setActiveFilters}
      />

      {/* ─── MODAL PROMOCIONAL PERSONALIZADO (CTA MODAL / PRODUCTO TEMPORAL) ─── */}
      <AnimatePresence>
        {promoModalAd && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPromoModalAd(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface rounded-3xl shadow-2xl overflow-hidden border border-app z-10"
              style={promoModalAd.colors?.bg ? { background: promoModalAd.colors.bg } : {}}
            >
              {/* Imagen/Banner */}
              {(promoModalAd.banner || promoModalAd.image) && (
                <div className="w-full h-48 bg-surface-2 relative">
                  <img
                    src={promoModalAd.banner || promoModalAd.image}
                    alt={promoModalAd.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}

              {/* Botón Cerrar */}
              <button
                onClick={() => setPromoModalAd(null)}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors z-20"
              >
                <X size={18} />
              </button>

              {/* Contenido */}
              <div className="p-6 space-y-4" style={promoModalAd.colors?.text ? { color: promoModalAd.colors.text } : {}}>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary-soft px-2.5 py-1 rounded-full w-max border border-primary/20">
                    {promoModalAd.category || 'Promoción'}
                  </span>
                  <h3 className="text-xl font-extrabold text-app mt-3">
                    {promoModalAd.title}
                  </h3>
                </div>

                <p className="text-sm text-muted leading-relaxed">
                  {promoModalAd.description}
                </p>

                {/* Precios si es producto temporal */}
                {promoModalAd.isTemporalProduct && (
                  <div className="flex items-center gap-3 p-3 bg-surface-2/40 backdrop-blur-sm rounded-2xl border border-app w-max">
                    <p className="text-sm text-muted line-through font-semibold">
                      ${promoModalAd.price?.toLocaleString()}
                    </p>
                    <p className="text-base font-black text-primary">
                      ${promoModalAd.promoPrice?.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Botón de Acción CTA */}
                <button
                  onClick={() => {
                    handleAdAction({
                      type: promoModalAd.ctaAction,
                      value: promoModalAd.ctaValue,
                      ad: promoModalAd
                    })
                    setPromoModalAd(null)
                  }}
                  className="w-full h-12 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ borderRadius: 'var(--radius-base)' }}
                >
                  {promoModalAd.ctaText || 'Aprovechar Oferta'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
