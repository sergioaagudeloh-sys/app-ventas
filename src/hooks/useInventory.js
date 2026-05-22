import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as inventoryService from '../services/inventoryService'

const KEYS = {
  products: ['products'],
  product: (id) => ['product', id],
  categories: ['categories'],
}

// ─── HOOKS DE CATEGORÍAS ─────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: KEYS.categories,
    queryFn: inventoryService.getCategories,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.categories })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => inventoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.categories })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.categories })
    },
  })
}

// ─── HOOKS DE PRODUCTOS ──────────────────────────────────────────────────────

export function useProducts(onlyActive = false) {
  return useQuery({
    queryKey: [...KEYS.products, { onlyActive }],
    queryFn: async () => {
      const products = await inventoryService.getProducts(onlyActive)
      
      // Pre-cargar imágenes en segundo plano silenciosamente
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          products.forEach(p => {
            if (p.imageUrl) {
              const img = new Image()
              img.src = p.imageUrl
            }
          })
        }, 500) // Pequeño retraso para no bloquear el render inicial
      }
      
      return products
    },
  })
}

export function useProduct(id) {
  return useQuery({
    queryKey: KEYS.product(id),
    queryFn: () => inventoryService.getProductById(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.products })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => inventoryService.updateProduct(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: KEYS.products })
      queryClient.invalidateQueries({ queryKey: KEYS.product(variables.id) })
    },
  })
}

export function useToggleProductStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, currentStatus }) => inventoryService.toggleProductStatus(id, currentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.products })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryService.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.products })
    },
  })
}
