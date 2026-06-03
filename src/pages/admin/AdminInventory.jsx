import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, Eye, EyeOff, Image as ImageIcon, Check, AlertCircle, QrCode, Download, Printer, Copy, X } from 'lucide-react'
import QRCode from 'qrcode'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useToggleProductStatus, useCategories } from '../../hooks/useInventory'
import CategoryManager from '../../components/admin/inventory/CategoryManager'
import ProductFormModal from '../../components/admin/inventory/ProductFormModal'
import { formatCurrency } from '../../utils/formatters'
import { fuzzyMatch } from '../../utils/search'

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

  // Modal de confirmación de eliminación
  const [productToDelete, setProductToDelete] = useState(null)
  
  // Modal de gestión de QR
  const [selectedQRProduct, setSelectedQRProduct] = useState(null)
  
  // Toast de notificación
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Filtrado de productos en frontend con búsqueda difusa
  const filteredProducts = products.filter(p => {
    const catName = categories.find(c => c.id === p.categoriaId)?.nombre || ''
    return fuzzyMatch(p.nombre, searchTerm) || fuzzyMatch(catName, searchTerm)
  })

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
      <div className="flex p-1.5 gap-1 bg-surface-2 rounded-2xl mb-6 w-full">
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
                      const isLowStock = product.variantes.some(v => v.stock <= product.umbralAlerta)

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
                          <td className="p-4 text-sm font-semibold text-app">
                            <div>{formatCurrency(product.precioBase)}</div>
                            {product.precioCosto !== undefined && product.precioCosto !== null && product.precioCosto !== '' && (
                              <div className="text-[10px] text-muted font-normal mt-0.5">
                                Costo: {formatCurrency(product.precioCosto)}
                              </div>
                            )}
                          </td>
                          
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
                                onClick={() => setSelectedQRProduct(product)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-surface-2 transition-colors"
                                title="Código QR de Compra"
                              >
                                <QrCode size={16} />
                              </button>
                              <button
                                onClick={() => openEditProductModal(product)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-surface-2 transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setProductToDelete(product)}
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
                    const isLowStock = product.variantes.some(v => v.stock <= product.umbralAlerta)

                    return (
                      <div key={product.id} className="bg-surface-2 p-4 rounded-2xl border border-app shadow-sm flex flex-col gap-4 relative">
                        
                        {/* Botones Flotantes Arriba Derecha */}
                        <div className="flex gap-1.5 absolute top-3 right-3">
                          <button
                            onClick={() => setSelectedQRProduct(product)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-app text-muted hover:text-primary transition-colors shadow-sm"
                            title="Código QR de Compra"
                          >
                            <QrCode size={14} />
                          </button>
                          <button
                            onClick={() => openEditProductModal(product)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-app text-muted hover:text-primary transition-colors shadow-sm"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setProductToDelete(product)}
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
                            {product.precioCosto !== undefined && product.precioCosto !== null && product.precioCosto !== '' && (
                              <p className="text-[10px] text-muted mt-0.5">
                                Costo: {formatCurrency(product.precioCosto)}
                              </p>
                            )}
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
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-3.5 rounded-2xl shadow-2xl border border-app bg-surface flex items-center gap-3 z-[10000] w-[90%] max-w-sm"
          >
            {toastMessage.type === 'success' ? (
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Check size={16} className="stroke-[3]" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <AlertCircle size={16} className="stroke-[3]" />
              </div>
            )}
            <span className="text-xs font-bold text-app mt-0.5">{toastMessage.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmación de eliminación */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-app p-6 rounded-3xl w-full max-w-sm relative z-10 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-app mb-2">¿Eliminar Producto?</h3>
              <p className="text-muted mb-6 leading-relaxed">
                Estás a punto de eliminar <span className="font-bold text-app">{productToDelete.nombre}</span>. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-app bg-surface-2 border border-app hover:bg-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    deleteProduct(productToDelete.id)
                    setProductToDelete(null)
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-error hover:bg-red-600 transition-colors shadow-lg shadow-error/20"
                >
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de gestión de QR de producto */}
      <AnimatePresence>
        {selectedQRProduct && (
          <ProductQRModal 
            product={selectedQRProduct} 
            onClose={() => setSelectedQRProduct(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ProductQRModal({ product, onClose }) {
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  
  const publicUrl = `${window.location.origin}/compra-qr/${product.id}`

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, publicUrl, {
      width: zoomed ? 300 : 180,
      margin: 2,
      color: { dark: '#0f0f1a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).catch(console.error)
  }, [publicUrl, zoomed])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `QR-${product.nombre.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  const handlePrint = () => {
    if (!canvasRef.current) return
    const win = window.open('')
    win.document.write(`<h2 style="font-family:sans-serif; text-align:center;">${product.nombre}</h2>`)
    win.document.write(`<div style="display:flex; justify-content:center;"><img src="${canvasRef.current.toDataURL()}" width="350"/></div>`)
    win.document.write(`<p style="font-family:sans-serif; text-align:center; font-size:14px;">Escanea para comprar este producto</p>`)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Comprar ${product.nombre}`,
          text: `Escanea o abre el enlace para comprar ${product.nombre} en línea.`,
          url: publicUrl
        })
      } catch (err) {
        console.error(err)
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-surface border border-app p-6 rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-surface-2 border border-app flex items-center justify-center text-muted hover:text-app transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-md mb-2">
            Punto de Venta QR
          </span>
          <h3 className="text-xl font-bold text-app mb-1">{product.nombre}</h3>
          <p className="text-xs text-muted mb-4">{product.categoria || 'Sin Categoría'} · ${Number(product.precioBase).toLocaleString()} COP</p>

          {/* Canvas Código QR */}
          <div 
            onClick={() => setZoomed(!zoomed)}
            className="p-3 bg-white rounded-3xl border border-app shadow-inner cursor-pointer hover:scale-102 transition-transform duration-300 mb-4 flex items-center justify-center"
          >
            <canvas ref={canvasRef} />
          </div>
          <p className="text-[10px] text-muted mb-6 uppercase tracking-wider font-bold">Haz clic en el código para {zoomed ? 'reducir' : 'ampliar'}</p>

          {/* URL Pública */}
          <div className="w-full mb-6">
            <label className="block text-[10px] font-bold text-muted text-left mb-1.5 uppercase tracking-wider">URL Pública del Portal</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 h-11 px-3 bg-surface-2 border border-app rounded-xl text-xs text-app focus:outline-none truncate select-all"
              />
              <button
                onClick={handleCopyLink}
                className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center active:scale-95 transition-all shadow-md shadow-primary/20 cursor-pointer border-none shrink-0"
                title="Copiar Enlace"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Estadísticas Rápidas */}
          <div className="w-full grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-surface-2 border border-app mb-6">
            <div className="text-center">
              <span className="block text-lg font-black text-app">0</span>
              <span className="block text-[9px] font-bold text-muted uppercase">Escaneos</span>
            </div>
            <div className="text-center border-x border-app">
              <span className="block text-lg font-black text-app">0</span>
              <span className="block text-[9px] font-bold text-muted uppercase">Ventas QR</span>
            </div>
            <div className="text-center">
              <span className="block text-lg font-black text-app">0%</span>
              <span className="block text-[9px] font-bold text-muted uppercase">Conv. QR</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-3 gap-3 w-full">
            <button
              onClick={handleDownload}
              className="py-3 px-2.5 bg-surface-2 hover:bg-surface border border-app rounded-xl text-xs text-app font-bold transition-all active:scale-95 flex flex-col items-center gap-1.5 cursor-pointer"
            >
              <Download size={16} className="text-primary" />
              <span>Descargar</span>
            </button>
            <button
              onClick={handlePrint}
              className="py-3 px-2.5 bg-surface-2 hover:bg-surface border border-app rounded-xl text-xs text-app font-bold transition-all active:scale-95 flex flex-col items-center gap-1.5 cursor-pointer"
            >
              <Printer size={16} className="text-primary" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={handleShare}
              className="py-3 px-2.5 bg-surface-2 hover:bg-surface border border-app rounded-xl text-xs text-app font-bold transition-all active:scale-95 flex flex-col items-center gap-1.5 cursor-pointer"
            >
              <Copy size={16} className="text-primary" />
              <span>Compartir</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
