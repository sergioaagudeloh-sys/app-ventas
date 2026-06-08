import { collection, getDocs, doc, getDoc, getDocFromCache, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

/**
 * Obtiene todos los clientes registrados en Firestore.
 * @returns {Promise<Array>} Lista de clientes
 */
export async function getAllClients() {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS))
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('[getAllClients] Error al obtener clientes:', error)
    return []
  }
}

/**
 * Busca un cliente en Firestore por su número de celular.
 * @param {string} celular - Número de teléfono del cliente
 * @returns {Promise<object|null>} Los datos del cliente si existe, o null
 */
export async function getClientByPhone(celular) {
  if (!celular) return null
  
  const cleanPhone = String(celular).replace(/\D/g, '')
  if (!cleanPhone) return null

  const userRef = doc(db, COLLECTIONS.USERS, cleanPhone)
  
  try {
    // Intentar buscar online con un timeout de 800ms para evitar cuelgues
    const fetchPromise = getDoc(userRef)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout de red')), 800)
    )
    
    const snap = await Promise.race([fetchPromise, timeoutPromise])
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() }
    }
  } catch (error) {
    console.warn('[getClientByPhone] Error o timeout al buscar online, intentando caché de Firestore:', error)
    try {
      const snap = await getDocFromCache(userRef)
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() }
      }
    } catch (cacheError) {
      console.warn('[getClientByPhone] Error al buscar en caché de Firestore:', cacheError)
    }
  }
  return null
}

/**
 * Registra o actualiza un cliente en Firestore.
 * @param {string} celular - Número de celular (ID)
 * @param {string} nombre - Nombre del cliente
 */
export async function saveClientProfile(celular, nombre) {
  if (!celular || !nombre) return

  const userRef = doc(db, COLLECTIONS.USERS, celular)
  await setDoc(userRef, {
    celular,
    nombre,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/**
 * Actualiza campos parciales del perfil de un cliente en Firestore.
 * @param {string} celular - Número de celular (ID del documento)
 * @param {object} data - Campos a actualizar (ej: { emoji: '😎' })
 */
export async function updateClientProfile(celular, data) {
  if (!celular) return
  const userRef = doc(db, COLLECTIONS.USERS, celular)
  await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() })
}

