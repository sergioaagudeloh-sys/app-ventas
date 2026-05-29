import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../../../hooks/useInventory'
import CategoryManagerUI from '../../ui/CategoryManager'

export default function CategoryManager() {
  const { data: categories = [], isLoading } = useCategories()
  const { mutate: createCat, isPending: isCreating } = useCreateCategory()
  const { mutate: updateCat, isPending: isUpdating } = useUpdateCategory()
  const { mutate: deleteCat } = useDeleteCategory()

  const handleCreate = (data) => {
    createCat(data)
  }

  const handleUpdate = (id, data) => {
    updateCat({ id, data })
  }

  const handleDelete = (id) => {
    deleteCat(id)
  }

  return (
    <CategoryManagerUI
      categories={categories}
      isLoading={isLoading}
      isCreating={isCreating}
      isUpdating={isUpdating}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  )
}
