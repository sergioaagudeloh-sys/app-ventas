import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit2, Tag } from 'lucide-react'
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../../../hooks/useInventory'

export default function CategoryManager() {
  const { data: categories = [], isLoading } = useCategories()
  const { mutate: createCat, isPending: isCreating } = useCreateCategory()
  const { mutate: updateCat, isPending: isUpdating } = useUpdateCategory()
  const { mutate: deleteCat } = useDeleteCategory()

  const [nombre, setNombre] = useState('')
  const [editingId, setEditingId] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim()) return

    if (editingId) {
      updateCat({ id: editingId, data: { nombre: nombre.trim() } })
      setEditingId(null)
    } else {
      createCat({ nombre: nombre.trim(), activa: true })
    }
    setNombre('')
  }

  const handleEdit = (cat) => {
    setEditingId(cat.id)
    setNombre(cat.nombre)
  }

  const handleCancel = () => {
    setEditingId(null)
    setNombre('')
  }

  if (isLoading) return <div className="p-4 text-center text-muted">Cargando categorías...</div>

  return (
    <div className="bg-surface rounded-3xl p-6 border border-app shadow-sm">
      <h2 className="text-lg font-bold text-app mb-4 flex items-center gap-2">
        <Tag size={18} className="text-primary" /> Categorías del Catálogo
      </h2>

      {/* Formulario rápido */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Camisetas, Pantalones..."
          className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
        />
        {editingId ? (
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="flex-1 sm:flex-none h-11 px-4 bg-primary text-white rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 sm:flex-none h-11 px-4 bg-surface-2 text-app rounded-xl font-medium transition-all active:scale-95"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={isCreating || !nombre.trim()}
            className="w-full sm:w-auto h-11 px-4 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Plus size={16} /> Agregar
          </button>
        )}
      </form>

      {/* Lista de categorías */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {categories.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">No hay categorías creadas aún.</p>
        ) : (
          categories.map(cat => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-app/50"
            >
              <span className="font-medium text-app text-sm truncate mr-2">{cat.nombre}</span>
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
          ))
        )}
      </div>
    </div>
  )
}
