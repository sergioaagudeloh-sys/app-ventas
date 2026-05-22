import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store del carrito de compras.
 * Persiste en localStorage para que el carrito no se pierda al navegar.
 */
const useCartStore = create(
  persist(
    (set, get) => ({
      // ─── Estado ───────────────────────────────────────────────────────────
      items: [],          // [{ productId, variantId, nombre, precio, talla, color, imageUrl, cantidad }]
      isOpen: false,      // Modal/drawer del carrito abierto

      // ─── Acciones ─────────────────────────────────────────────────────────
      /**
       * Agrega un producto al carrito o incrementa su cantidad si ya existe.
       * @param {object} item - Producto con variante seleccionada
       * @param {number} qtyToAdd - Cantidad a agregar (por defecto 1)
       */
      addItem: (item, qtyToAdd = 1) => set((state) => {
        const key = `${item.productId}-${item.variantId}`
        const existing = state.items.find(
          (i) => `${i.productId}-${i.variantId}` === key
        )
        
        const limit = item.maxStock ?? existing?.maxStock
        
        if (existing) {
          const newQty = limit !== undefined ? Math.min(existing.cantidad + qtyToAdd, limit) : existing.cantidad + qtyToAdd
          if (newQty === existing.cantidad) return state // No cambiar estado si alcanzó el límite
          
          return {
            items: state.items.map((i) =>
              `${i.productId}-${i.variantId}` === key
                ? { ...i, cantidad: newQty, maxStock: limit }
                : i
            ),
          }
        }
        
        const newQty = limit !== undefined ? Math.min(qtyToAdd, limit) : qtyToAdd
        return { items: [...state.items, { ...item, cantidad: newQty }] }
      }),

      /**
       * Decrementa la cantidad de un producto. Si llega a 0, lo elimina.
       * @param {string} productId
       * @param {string} variantId
       */
      removeItem: (productId, variantId) => set((state) => {
        const key = `${productId}-${variantId}`
        const existing = state.items.find(
          (i) => `${i.productId}-${i.variantId}` === key
        )
        if (!existing) return state
        if (existing.cantidad === 1) {
          return { items: state.items.filter((i) => `${i.productId}-${i.variantId}` !== key) }
        }
        return {
          items: state.items.map((i) =>
            `${i.productId}-${i.variantId}` === key
              ? { ...i, cantidad: i.cantidad - 1 }
              : i
          ),
        }
      }),

      deleteItem: (productId, variantId) => set((state) => ({
        items: state.items.filter(
          (i) => !(i.productId === productId && i.variantId === variantId)
        ),
      })),

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      /**
       * @returns {number} Total del carrito
       */
      getTotal: () => {
        const { items } = get()
        return items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)
      },

      /**
       * @returns {number} Total de unidades en el carrito
       */
      getCount: () => {
        const { items } = get()
        return items.reduce((sum, i) => sum + i.cantidad, 0)
      },
    }),
    { name: 'cart-storage' }
  )
)

export default useCartStore
