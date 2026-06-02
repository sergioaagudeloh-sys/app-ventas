import { create } from 'zustand'
import { addFavorite, removeFavorite, subscribeToFavorites } from '../services/favoritesService'

/**
 * Store global para gestionar los favoritos del usuario en tiempo real con Firestore.
 * Esto evita crear múltiples 'listeners' al renderizar muchos ProductCards.
 * La lógica de Firebase está delegada a favoritesService.js.
 */
const useFavoritesStore = create((set, get) => ({
  favoriteIds: [],
  isSubscribed: false,
  _unsubscribeFn: null,

  /**
   * Suscribe a la colección de favoritos del usuario
   */
  subscribe: (userId) => {
    if (!userId) {
      const { _unsubscribeFn } = get()
      if (typeof _unsubscribeFn === 'function') _unsubscribeFn()
      set({ favoriteIds: [], isSubscribed: false, _unsubscribeFn: null })
      return
    }

    // Evitar doble suscripción si ya estamos escuchando
    if (get().isSubscribed) return

    const unsubscribeFn = subscribeToFavorites(
      userId,
      (ids) => set({ favoriteIds: ids }),
      (error) => console.error('[favoritesStore] Error en suscripción:', error)
    )

    set({ isSubscribed: true, _unsubscribeFn: unsubscribeFn })
  },

  /**
   * Desuscribe para liberar memoria (ej: al cerrar sesión)
   */
  unsubscribe: () => {
    const { _unsubscribeFn } = get()
    if (typeof _unsubscribeFn === 'function') _unsubscribeFn()
    set({ isSubscribed: false, _unsubscribeFn: null, favoriteIds: [] })
  },

  /**
   * Alternar favorito con UI Optimista (se refleja al instante mientras sube a Firestore)
   */
  toggleFavorite: async (userId, productId) => {
    if (!userId) return

    const { favoriteIds } = get()
    const isFav = favoriteIds.includes(productId)

    // UI Optimista: el corazón cambia INSTANTÁNEAMENTE
    set({
      favoriteIds: isFav
        ? favoriteIds.filter(id => id !== productId)
        : [...favoriteIds, productId]
    })

    try {
      if (isFav) {
        await removeFavorite(userId, productId)
      } else {
        await addFavorite(userId, productId)
      }
    } catch (error) {
      console.error('[favoritesStore] Error al actualizar favorito en BD', error)
      // Si falla, el próximo snapshot corregirá el estado visual al real
    }
  }
}))

export default useFavoritesStore
