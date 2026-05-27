import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit2, Tag, Search } from 'lucide-react'
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../../../hooks/useInventory'
import { CATEGORY_ICONS, getCategoryIconComponent } from '../../../constants/categoryIcons'

export default function CategoryManager() {
  const { data: categories = [], isLoading } = useCategories()
  const { mutate: createCat, isPending: isCreating } = useCreateCategory()
  const { mutate: updateCat, isPending: isUpdating } = useUpdateCategory()
  const { mutate: deleteCat } = useDeleteCategory()

  const [nombre, setNombre] = useState('')
  const [iconName, setIconName] = useState('Tag')
  const [editingId, setEditingId] = useState(null)
  const [searchTermIcon, setSearchTermIcon] = useState('')

  const filteredIcons = useMemo(() => {
    const term = searchTermIcon.toLowerCase().trim()
    if (!term) return CATEGORY_ICONS
    return CATEGORY_ICONS.filter(icon => 
      icon.name.toLowerCase().includes(term) ||
      icon.label.toLowerCase().includes(term) ||
      icon.tags.some(tag => tag.includes(term))
    )
  }, [searchTermIcon])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim()) return

    if (editingId) {
      updateCat({ id: editingId, data: { nombre: nombre.trim(), iconName } })
      setEditingId(null)
    } else {
      createCat({ nombre: nombre.trim(), activa: true, iconName })
    }
    setNombre('')
    setIconName('Tag')
    setSearchTermIcon('')
  }

  const handleEdit = (cat) => {
    setEditingId(cat.id)
    setNombre(cat.nombre)
    setIconName(cat.iconName || 'Tag')
  }

  const handleCancel = () => {
    setEditingId(null)
    setNombre('')
    setIconName('Tag')
    setSearchTermIcon('')
  }

  if (isLoading) return <div className="p-4 text-center text-muted">Cargando categorías...</div>

  return (
    <div className="bg-surface rounded-3xl p-6 border border-app shadow-sm">
      <h2 className="text-lg font-bold text-app mb-4 flex items-center gap-2">
        <Tag size={18} className="text-primary" /> Categorías del Catálogo
      </h2>

      {/* Formulario rápido */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Camisetas, Pantalones..."
            className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors text-sm"
          />
          {editingId ? (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="flex-1 sm:flex-none h-11 px-5 bg-primary text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 text-xs sm:text-sm"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 sm:flex-none h-11 px-5 bg-surface-2 text-app rounded-xl font-bold transition-all active:scale-95 text-xs sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isCreating || !nombre.trim()}
              className="w-full sm:w-auto h-11 px-5 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-xs sm:text-sm"
            >
              <Plus size={16} /> Agregar
            </button>
          )}
        </div>

        {/* Selector de Iconos con Buscador */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-muted uppercase tracking-widest">Icono de la Categoría</label>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              Seleccionado: {CATEGORY_ICONS.find(i => i.name === iconName)?.label || iconName}
            </span>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchTermIcon}
              onChange={(e) => setSearchTermIcon(e.target.value)}
              placeholder="Buscar ícono (ej: pan, ropa, computador, deporte)..."
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-surface-2 border border-app text-app text-xs focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-2 bg-surface-2 rounded-xl border border-app/60 max-h-36 overflow-y-auto no-scrollbar">
            {filteredIcons.length === 0 ? (
              <div className="col-span-full py-4 text-center text-xs text-muted">No se encontraron íconos.</div>
            ) : (
              filteredIcons.map(({ name, icon: IconComponent, label: iconLabel }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIconName(name)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all active:scale-95 shrink-0 ${
                    iconName === name
                      ? 'bg-primary text-white border-primary shadow-sm scale-105'
                      : 'bg-surface text-app border-app/70 hover:border-primary/50'
                  }`}
                  title={iconLabel}
                >
                  <IconComponent size={15} />
                </button>
              ))
            )}
          </div>
        </div>
      </form>

      {/* Lista de categorías */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {categories.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">No hay categorías creadas aún.</p>
        ) : (
          categories.map(cat => {
            const IconComponent = getCategoryIconComponent(cat.iconName)
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2 border border-app/50"
              >
                <div className="flex items-center gap-2.5 truncate mr-2">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-primary shrink-0 border border-app/40">
                    <IconComponent size={14} />
                  </div>
                  <span className="font-semibold text-app text-sm truncate">{cat.nombre}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-surface transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteCat(cat.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-error hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
