import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, Eye, EyeOff, Image as ImageIcon } from 'lucide-react'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useToggleProductStatus, useCategories } from '../../hooks/useInventory'
import CategoryManager from '../../components/admin/inventory/CategoryManager'
import ProductFormModal from '../../components/admin/inventory/ProductFormModal'
import { formatCurrency } from '../../utils/formatters'

export default function AdminInventory() {
  const { data: products = [], isLoading: isLoadingProducts } = useProducts()
  const { data: categories = [] } = useCategories()
  
  const { mutate: createProduct } = useCreateProduct()
  const { mutate: updateProduct } = useUpdateProduct()
  const { mutate: deleteProduct } = useDeleteProduct()
  const { mutate: toggleStatus } = useToggleProductStatus()

  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('productos') // 'productos' | 'categorias'
  
  // Modal de producto
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  
  // Toast de notificación
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Filtrado de productos en frontend
  const filteredProducts = products.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    categories.find(c => c.id === p.categoriaId)?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSaveProduct = (data) => {
    if (editingProduct) {
      updateProduct(
        { id: editingProduct.id, data },
        {
          onSuccess: () => {
            setIsModalOpen(false)
            setEditingProduct(null)
            showToast('Producto actualizado con éxito')
          },
          onError: (error) => {
            console.error(error)
            showToast('Error al guardar en la nube. Verifica tus permisos.', 'error')
          }
        }
      )
    } else {
      createProduct(
        data,
        {
          onSuccess: () => {
            setIsModalOpen(false)
            setEditingProduct(null)
            showToast('Producto creado con éxito')
          },
          onError: (error) => {
            console.error(error)
            showToast('Error al crear en la nube. Verifica tus permisos.', 'error')
          }
        }
      )
    }
  }

  const openNewProductModal = () => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const openEditProductModal = (product) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  // Animaciones
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-8 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
            <Package size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-app">Inventario</h1>
        </div>
        
        {activeTab === 'productos' && (
          <button
            onClick={openNewProductModal}
            className="w-full sm:w-auto bg-primary text-white px-5 py-3 sm:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 hover:opacity-90 active:scale-95 shadow-md shadow-primary/20"
          >
            <Plus size={18} /> <span>Nuevo Producto</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 gap-1 bg-surface-2 rounded-2xl mb-6 max-w-sm">
        <button
          onClick={() => setActiveTab('productos')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'productos' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-app'
          }`}
        >
          Productos
        </button>
        <button
          onClick={() => setActiveTab('categorias')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'categorias' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-app'
          }`}
        >
          Categorías
        </button>
      </div>

      {/* ─── VISTA CATEGORÍAS ─────────────────────────────────────────── */}
      {activeTab === 'categorias' && (
        <div className="max-w-xl">
          <CategoryManager />
        </div>
      )}

      {/* ─── VISTA PRODUCTOS ──────────────────────────────────────────── */}
      {activeTab === 'productos' && (
        <div className="bg-surface rounded-3xl p-1 shadow-sm border border-app overflow-hidden flex flex-col min-h-[500px]">
          
          {/* Barra de búsqueda */}
          <div className="p-4 border-b border-app flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Buscar por nombre o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-2 border border-transparent text-app focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
          </div>

          {/* Tabla de productos (Desktop) / Tarjetas (Mobile) */}
          <div className="flex-1 overflow-x-auto">
            {isLoadingProducts ? (
              <div className="flex items-center justify-center h-64 text-muted">Cargando inventario...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Package size={40} className="text-muted mb-3 opacity-50" />
                <p className="text-muted font-medium">No se encontraron productos</p>
                {searchTerm && <p className="text-xs text-muted mt-1">Intenta con otros términos de búsqueda.</p>}
              </div>
            ) : (
              <>
                {/* ─── VISTA DESKTOP (TABLA) ───────────────────────────────── */}
                <table className="hidden md:table w-full min-w-[800px] text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-2/50 text-muted text-xs uppercase tracking-wider">
                      <th className="font-semibold p-4 rounded-tl-2xl">Producto</th>
                      <th className="font-semibold p-4">Categoría</th>
                      <th className="font-semibold p-4">Precio</th>
                      <th className="font-semibold p-4">Stock Total</th>
                      <th className="font-semibold p-4">Estado</th>
                      <th className="font-semibold p-4 text-right rounded-tr-2xl">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app">
                    {filteredProducts.map(product => {
                      const category = categories.find(c => c.id === product.categoriaId)
                      const totalStock = product.variantes.reduce((sum, v) => sum + v.stock, 0)
                      const isLowStock = totalStock <= product.umbralAlerta

                      return (
                        <tr key={product.id} className="hover:bg-surface-2/30 transition-colors group">
                          
                          {/* Producto (Imagen + Nombre) */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-surface-2 flex-shrink-0 overflow-hidden border border-app">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt={product.nombre} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted"><ImageIcon size={18} /></div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-app">{product.nombre}</p>
                                <p className="text-xs text-muted">{product.variantes.length} variante(s)</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 text-sm text-app">{category?.nombre || '—'}</td>
                          <td className="p-4 text-sm font-semibold text-app">{formatCurrency(product.precioBase)}</td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${isLowStock ? 'text-warning' : 'text-success'}`}>
                                {totalStock} unds
                              </span>
                              {isLowStock && (
                                <div className="group/tooltip relative flex items-center">
                                  <AlertTriangle size={14} className="text-warning" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-surface border border-app rounded shadow-lg text-[10px] whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                                    Stock bajo (Umbral: {product.umbralAlerta})
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() => toggleStatus({ id: product.id, currentStatus: product.activo })}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                product.activo ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-surface-2 text-muted hover:bg-app'
                              }`}
                            >
                              {product.activo ? <Eye size={12} /> : <EyeOff size={12} />}
                              {product.activo ? 'Activo' : 'Oculto'}
                            </button>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditProductModal(product)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-surface-2 transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`¿Estás seguro de eliminar ${product.nombre}?`)) {
                                    deleteProduct(product.id)
                                  }
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-error hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* ─── VISTA MOBILE (TARJETAS) ─────────────────────────────── */}
                <div className="flex flex-col gap-3 p-4 md:hidden bg-surface">
                  {filteredProducts.map(product => {
                    const category = categories.find(c => c.id === product.categoriaId)
                    const totalStock = product.variantes.reduce((sum, v) => sum + v.stock, 0)
                    const isLowStock = totalStock <= product.umbralAlerta

                    return (
                      <div key={product.id} className="bg-surface-2 p-4 rounded-2xl border border-app shadow-sm flex flex-col gap-4 relative">
                        
                        {/* Botones Flotantes Arriba Derecha */}
                        <div className="flex gap-1.5 absolute top-3 right-3">
                          <button
                            onClick={() => openEditProductModal(product)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-app text-muted hover:text-primary transition-colors shadow-sm"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de eliminar ${product.nombre}?`)) {
                                deleteProduct(product.id)
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-app text-muted hover:text-error transition-colors shadow-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Top: Foto e info básica */}
                        <div className="flex gap-3 items-center pr-20">
                          <div className="w-16 h-16 rounded-xl bg-surface flex-shrink-0 overflow-hidden border border-app">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted"><ImageIcon size={20} /></div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-app line-clamp-2 leading-tight mb-1">{product.nombre}</h3>
                            <p className="text-[11px] text-muted uppercase tracking-wider">{category?.nombre || 'Sin Categoría'}</p>
                            <p className="text-base font-black text-primary mt-0.5">{formatCurrency(product.precioBase)}</p>
                          </div>
                        </div>

                        {/* Bottom: Stats & Estado */}
                        <div className="flex items-center justify-between border-t border-app pt-3">
                          <div>
                            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Inventario</p>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-bold ${isLowStock ? 'text-warning' : 'text-success'}`}>
                                {totalStock} unds
                              </span>
                              {isLowStock && <AlertTriangle size={14} className="text-warning" />}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end">
                            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Visibilidad</p>
                            <button
                              onClick={() => toggleStatus({ id: product.id, currentStatus: product.activo })}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                product.activo ? 'bg-success/10 text-success' : 'bg-surface text-muted border border-app'
                              }`}
                            >
                              {product.activo ? <Eye size={14} /> : <EyeOff size={14} />}
                              {product.activo ? 'Activo' : 'Oculto'}
                            </button>
                          </div>
                        </div>

                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProduct}
          initialData={editingProduct}
        />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-6 left-1/2 px-6 py-3 rounded-full shadow-2xl font-bold text-sm z-[100] flex items-center gap-2 ${
              toastMessage.type === 'success' 
                ? 'bg-success text-white' 
                : 'bg-error text-white'
            }`}
          >
            {toastMessage.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
