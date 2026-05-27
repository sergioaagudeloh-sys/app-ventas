import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  serverTimestamp,
  orderBy
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

const adsRef = collection(db, COLLECTIONS.ADS)

/**
 * Obtiene todos los anuncios de la base de datos
 */
export async function getAds() {
  const snap = await getDocs(adsRef)
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

/**
 * Crea un nuevo anuncio
 */
export async function createAd(adData) {
  const docRef = await addDoc(adsRef, {
    ...adData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Actualiza un anuncio existente
 */
export async function updateAd(id, adData) {
  const docRef = doc(db, COLLECTIONS.ADS, id)
  await updateDoc(docRef, {
    ...adData,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Elimina un anuncio
 */
export async function deleteAd(id) {
  await deleteDoc(doc(db, COLLECTIONS.ADS, id))
}

/**
 * Se suscribe a los anuncios en tiempo real
 */
export function subscribeToAds(onUpdate) {
  // Ordenar por fecha de creación por defecto
  const q = query(adsRef)
  return onSnapshot(q, (snap) => {
    const ads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    onUpdate(ads)
  })
}
