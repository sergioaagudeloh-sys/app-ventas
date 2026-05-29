import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { COLLECTIONS } from '../constants'

// Definir constante de colección local si no está en constants
const COUPONS_COLLECTION = COLLECTIONS?.COUPONS || 'coupons'

export const couponService = {
  // Obtener todos los cupones ordenados por fecha de creación.
  // Normaliza campos en inglés → español para compatibilidad con el modal del cliente.
  async getCoupons() {
    const ref = collection(db, COUPONS_COLLECTION)
    const q = query(ref, orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => {
      const data = d.data()
      // Soporte para documentos guardados con campos en inglés (AdminSettings)
      // y en español (esquema legacy del cliente)
      return {
        id: d.id,
        ...data,
        // Campos normalizados en español (usados por ClientCouponsModal y CheckoutModal)
        codigo:          data.codigo          ?? data.code          ?? '',
        activo:          data.activo          ?? data.active         ?? false,
        tipoDescuento:   data.tipoDescuento   ?? (data.type === 'percentage' ? 'porcentaje' : 'fijo'),
        valorDescuento:  data.valorDescuento  ?? data.value         ?? 0,
        minimoCompra:    data.minimoCompra    ?? data.minPurchase   ?? 0,
        fechaExpiracion: data.fechaExpiracion ?? data.endDate       ?? null,
        // Campos en inglés también presentes para AdminSettings
        code:        data.code        ?? data.codigo        ?? '',
        active:      data.active      ?? data.activo        ?? false,
        type:        data.type        ?? (data.tipoDescuento === 'porcentaje' ? 'percentage' : 'fixed'),
        value:       data.value       ?? data.valorDescuento ?? 0,
        minPurchase: data.minPurchase ?? data.minimoCompra  ?? 0,
        endDate:     data.endDate     ?? data.fechaExpiracion ?? '',
        startDate:   data.startDate   ?? '',
      }
    })
  },

  // Crear nuevo cupón
  async createCoupon(data) {
    const ref = collection(db, COUPONS_COLLECTION)
    const payload = {
      ...data,
      code: data.code.toUpperCase().trim(),
      value: Number(data.value),
      minPurchase: Number(data.minPurchase || 0),
      active: data.active ?? true,
      createdAt: serverTimestamp()
    }
    const docRef = await addDoc(ref, payload)
    return { id: docRef.id, ...payload }
  },

  // Actualizar un cupón existente
  async updateCoupon(id, data) {
    const ref = doc(db, COUPONS_COLLECTION, id)
    const payload = { ...data }
    if (data.code) payload.code = data.code.toUpperCase().trim()
    if (data.value !== undefined) payload.value = Number(data.value)
    if (data.minPurchase !== undefined) payload.minPurchase = Number(data.minPurchase)
    
    await updateDoc(ref, payload)
    return { id, ...payload }
  },

  // Eliminar un cupón
  async deleteCoupon(id) {
    const ref = doc(db, COUPONS_COLLECTION, id)
    await deleteDoc(ref)
    return id
  }
}
