import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

const productsRef = collection(db, COLLECTIONS.PRODUCTS)
const categoriesRef = collection(db, COLLECTIONS.CATEGORIES)

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────

export async function getCategories() {
  const q = query(categoriesRef, orderBy('nombre', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function createCategory(categoryData) {
  const docRef = await addDoc(categoriesRef, {
    ...categoryData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateCategory(id, categoryData) {
  const docRef = doc(db, COLLECTIONS.CATEGORIES, id)
  await updateDoc(docRef, {
    ...categoryData,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteCategory(id) {
  // Nota: Deberíamos verificar si hay productos usando esta categoría antes de borrar.
  // Por ahora permitimos el borrado simple.
  await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id))
}

// ─── PRODUCTOS ───────────────────────────────────────────────────────────────

export async function getProducts(onlyActive = false) {
  let q = productsRef
  if (onlyActive) {
    q = query(productsRef, where('activo', '==', true))
  }
  // En Firebase Spark no podemos hacer orderBy complejo sin índices.
  // Traemos todo y ordenamos en frontend.
  const snap = await getDocs(q)
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function getProductById(id) {
  const snap = await getDoc(doc(db, COLLECTIONS.PRODUCTS, id))
  if (!snap.exists()) throw new Error('Producto no encontrado')
  return { id: snap.id, ...snap.data() }
}

export async function createProduct(productData) {
  const dataToSave = { ...productData }
  delete dataToSave.id
  delete dataToSave.createdAt
  delete dataToSave.updatedAt

  Object.keys(dataToSave).forEach(key => {
    if (dataToSave[key] === undefined) {
      delete dataToSave[key]
    }
  })

  const docRef = await addDoc(productsRef, {
    ...dataToSave,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateProduct(id, productData) {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, id)
  const dataToSave = { ...productData }
  delete dataToSave.id
  delete dataToSave.createdAt
  delete dataToSave.updatedAt

  Object.keys(dataToSave).forEach(key => {
    if (dataToSave[key] === undefined) {
      delete dataToSave[key]
    }
  })

  await updateDoc(docRef, {
    ...dataToSave,
    updatedAt: serverTimestamp(),
  })
}

export async function toggleProductStatus(id, currentStatus) {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, id)
  await updateDoc(docRef, {
    activo: !currentStatus,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteProduct(id) {
  await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id))
}
