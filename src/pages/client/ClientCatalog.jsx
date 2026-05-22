import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, PackageX, Sparkles } from 'lucide-react'
import { useProducts, useCategories } from '../../hooks/useInventory'
import useAppConfigStore from '../../store/appConfigStore'
import SmartHint from '../../components/client/guided/SmartHint'
import ProductCard from '../../components/client/catalog/ProductCard'
import ProductDetailModal from '../../components/client/catalog/ProductDetailModal'
import WholesaleRequestModal from '../../components/client/catalog/WholesaleRequestModal'
import ClientFilterModal from '../../components/client/catalog/ClientFilterModal'
import CatalogBanner from '../../components/client/catalog/CatalogBanner'

export default function ClientCatalog() {
  // Datos
  const { data: allProducts = [], isLoading: isLoadingProducts } = useProducts(true) // Solo activos
  const { data: allCategories = [] } = useCategories()
  const { catalogFilters, catalogLayout } = useAppConfigStore()
  
  // Estado local
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  
  // Modales
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [wholesaleProduct, setWholesaleProduct] = useState(null)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState({})

  // Filtrar categorías que tienen al menos un producto activo
  const activeCategories = useMemo(() => {
    const categoriesWithProducts = new Set(allProducts.map(p => p.categoriaId))
    return allCategories.filter(c => categoriesWithProducts.has(c.id) && c.activa)
  }, [allProducts, allCategories])

  // Filtrado final de productos (por término y categoría)
  const filteredProducts = useMemo(() => {
    let result = allProducts

    if (selectedCategoryId !== 'all') {
      result = result.filter(p => p.categoriaId === selectedCategoryId)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      result = result.filter(p => {
        const inName = p.nombre.toLowerCase().includes(term)
        const inDesc = p.descripcion?.toLowerCase().includes(term)
        let inAttrs = false
        if (p.atributos) {
          inAttrs = Object.values(p.atributos).some(val => 
            String(val).toLowerCase().includes(term)
          )
        }
        return inName || inDesc || inAttrs
      })
    }

    // ── Filtros Avanzados ──
    catalogFilters.customAttributes?.forEach(attr => {
      if (activeFilters[attr.id]?.length > 0) {
        result = result.filter(p => activeFilters[attr.id].includes(p.atributos?.[attr.id]))
      }
    })
    
    // Filtros que dependen de variantes (talla y color)
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
  }, [allProducts, searchTerm, selectedCategoryId, catalogFilters, activeFilters])

  const hasActiveFilters = Object.values(activeFilters).flat().length > 0

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

          {/* Categorías (Scroll horizontal) */}
          {catalogFilters.categories && activeCategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setSelectedCategoryId('all')}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedCategoryId === 'all'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-surface border border-app text-app hover:bg-surface-2'
                }`}
              >
                Todos
              </button>
              {activeCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedCategoryId === cat.id
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-surface border border-app text-app hover:bg-surface-2'
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── BANNER DEL CATÁLOGO ────────────────────────────────────── */}
      <CatalogBanner />



      {/* ─── GRILLA DE PRODUCTOS ────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
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
            <AnimatePresence>
              {filteredProducts.map(product => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  key={product.id}
                  className="flex flex-col"
                >
                  <ProductCard 
                    product={product} 
                    onOpenDetail={setSelectedProduct} 
                    layout={catalogLayout}
                  />
                  {/* Botón de solicitud al por mayor (Sección 15 del Informe) */}
                  <button
                    onClick={() => setWholesaleProduct(product)}
                    className="mt-2 text-xs font-semibold text-primary hover:text-app transition-colors py-1.5 text-center bg-surface rounded-xl border border-app hover:border-primary/50"
                  >
                    Solicitar al por mayor
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
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
        product={wholesaleProduct}
        isOpen={!!wholesaleProduct}
        onClose={() => setWholesaleProduct(null)}
      />

      <ClientFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        allProducts={allProducts}
        currentFilters={activeFilters}
        onApplyFilters={setActiveFilters}
      />
    </div>
  )
}
