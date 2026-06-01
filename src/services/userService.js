import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

/**
 * Busca un cliente en Firestore por su número de celular.
 * @param {string} celular - Número de teléfono del cliente
 * @returns {Promise<object|null>} Los datos del cliente si existe, o null
 */
export async function getClientByPhone(celular) {
  if (!celular) return null
  
  // Normalizar: el documento se guarda con dígitos puros
  const cleanPhone = String(celular).replace(/\D/g, '')
  if (!cleanPhone) return null

  const userRef = doc(db, COLLECTIONS.USERS, cleanPhone)
  const snap = await getDoc(userRef)
  
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() }
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
  }, { merge: true }) // merge: true asegura que si ya existía, no borre otros datos
}
