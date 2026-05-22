import { create } from 'zustand'
import { collection, doc, deleteDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

/**
 * Store global para gestionar los favoritos del usuario en tiempo real con Firestore.
 * Esto evita crear múltiples 'listeners' al renderizar muchos ProductCards.
 */
const useFavoritesStore = create((set, get) => ({
  favoriteIds: [],
  isSubscribed: false,
  unsubscribe: null,

  /**
   * Suscribe a la colección de favoritos del usuario
   */
  subscribe: (userId) => {
    if (!userId) {
      get().unsubscribe()
      set({ favoriteIds: [] })
      return
    }

    // Evitar doble suscripción si ya estamos escuchando
    if (get().isSubscribed) return

    const favoritesRef = collection(db, COLLECTIONS.USERS, userId, 'favorites')
    
    const unsubscribeFn = onSnapshot(favoritesRef, (snapshot) => {
      const ids = snapshot.docs.map(d => d.id)
      set({ favoriteIds: ids })
    }, (error) => {
      console.error("Error en suscripción de favoritos:", error)
    })

    set({ isSubscribed: true, unsubscribe: unsubscribeFn })
  },

  /**
   * Desuscribe para liberar memoria (ej: al cerrar sesión)
   */
  unsubscribe: () => {
    const { unsubscribe } = get()
    if (unsubscribe) {
      unsubscribe()
    }
    set({ isSubscribed: false, unsubscribe: null, favoriteIds: [] })
  },

  /**
   * Alternar favorito con UI Optimista (se refleja al instante mientras sube a Firestore)
   */
  toggleFavorite: async (userId, productId) => {
    if (!userId) return

    const { favoriteIds } = get()
    const isFav = favoriteIds.includes(productId)
    
    // UI Optimista para que el corazón cambie INSTANTÁNEAMENTE
    if (isFav) {
      set({ favoriteIds: favoriteIds.filter(id => id !== productId) })
    } else {
      set({ favoriteIds: [...favoriteIds, productId] })
    }

    try {
      const favoriteRef = doc(db, COLLECTIONS.USERS, userId, 'favorites', productId)
      if (isFav) {
        await deleteDoc(favoriteRef)
      } else {
        await setDoc(favoriteRef, { productId, addedAt: serverTimestamp() })
      }
    } catch (error) {
      console.error("Error al actualizar favorito en BD", error)
      // Si falla, el próximo snapshot corregirá el estado visual al real
    }
  }
}))

export default useFavoritesStore
