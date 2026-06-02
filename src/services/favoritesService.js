import { doc, setDoc, deleteDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

/**
 * Agrega un producto a los favoritos de un usuario en Firestore.
 * @param {string} userId - ID del usuario (celular)
 * @param {string} productId - ID del producto
 */
export async function addFavorite(userId, productId) {
  const favoriteRef = doc(db, COLLECTIONS.USERS, userId, 'favorites', productId)
  await setDoc(favoriteRef, { productId, addedAt: serverTimestamp() })
}

/**
 * Elimina un producto de los favoritos de un usuario en Firestore.
 * @param {string} userId - ID del usuario (celular)
 * @param {string} productId - ID del producto
 */
export async function removeFavorite(userId, productId) {
  const favoriteRef = doc(db, COLLECTIONS.USERS, userId, 'favorites', productId)
  await deleteDoc(favoriteRef)
}

/**
 * Se suscribe a los favoritos de un usuario en tiempo real.
 * @param {string} userId - ID del usuario (celular)
 * @param {function} onUpdate - Callback con el array de IDs de favoritos
 * @param {function} onError - Callback de error opcional
 * @returns {function} Función para cancelar la suscripción
 */
export function subscribeToFavorites(userId, onUpdate, onError) {
  const favoritesRef = collection(db, COLLECTIONS.USERS, userId, 'favorites')
  return onSnapshot(
    favoritesRef,
    (snapshot) => {
      const ids = snapshot.docs.map(d => d.id)
      onUpdate(ids)
    },
    (error) => {
      console.error('[favoritesService] Error en suscripción:', error)
      if (onError) onError(error)
    }
  )
}
