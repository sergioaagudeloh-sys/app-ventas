import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../config/firebaseConfig'

/**
 * 🚀 SERVICIO DE SUBIDA DE ARCHIVOS A FIREBASE STORAGE
 * Ubicación: src/services/uploadService.js
 * 
 * Abstrae las operaciones de subida y eliminación de imágenes directas a Storage,
 * permitiendo monitorear el progreso del upload de bytes transferidos.
 */

/**
 * Sube una imagen a Firebase Storage a una ruta parametrizada por tipo y nombre.
 * 
 * @param {File} file Objeto File del input de archivo o cámara.
 * @param {string} folder Carpeta destino en Storage (ej: 'products', 'variants', 'branding').
 * @param {string} customName Nombre de archivo personalizado (opcional).
 * @param {function} onProgress Callback de progreso que recibe el porcentaje (0 a 100).
 * @returns {Promise<string>} Promesa que resuelve con la URL pública de descarga.
 */
export async function uploadImage(file, folder = 'products', customName = null, onProgress = null) {
  if (!file) throw new Error('No se ha proporcionado un archivo válido para subir.')

  // Generar un nombre único para evitar sobreescribir fotos existentes
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
  const fileName = customName ? `${customName}_${cleanName}` : `${crypto.randomUUID()}_${cleanName}`
  
  // Referencia física en Storage
  const storageRef = ref(storage, `${folder}/${fileName}`)
  
  // Iniciar la tarea de subida resumible
  const uploadTask = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && typeof onProgress === 'function') {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          onProgress(progress)
        }
      },
      (error) => {
        console.error('[Upload Service] Error al subir archivo:', error)
        reject(error)
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          resolve(downloadURL)
        } catch (urlError) {
          console.error('[Upload Service] Error al recuperar URL de descarga:', urlError)
          reject(urlError)
        }
      }
    )
  })
}

/**
 * Elimina una imagen de Firebase Storage a partir de su URL pública de descarga.
 * 
 * @param {string} fileUrl URL de descarga del archivo a eliminar.
 * @returns {Promise<void>}
 */
export async function deleteImage(fileUrl) {
  if (!fileUrl) return
  
  try {
    // Decodificar la URL para obtener la ruta del objeto en el bucket
    // Las URLs de Storage tienen la estructura: https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[path]?alt=media...
    const decodeUrl = decodeURIComponent(fileUrl)
    const storagePathStart = decodeUrl.indexOf('/o/')
    if (storagePathStart === -1) return

    const storagePathEnd = decodeUrl.indexOf('?alt=media')
    const filePath = decodeUrl.substring(
      storagePathStart + 3,
      storagePathEnd !== -1 ? storagePathEnd : decodeUrl.length
    )

    const fileRef = ref(storage, filePath)
    await deleteObject(fileRef)
    console.log(`[Upload Service] Imagen eliminada correctamente de Storage: ${filePath}`)
  } catch (error) {
    // Silenciar el error si el objeto ya no existía en Storage (limpieza huérfana)
    if (error.code === 'storage/object-not-found') {
      console.warn('[Upload Service] El archivo ya no existe en Firebase Storage.')
      return
    }
    console.error('[Upload Service] Error al intentar eliminar archivo:', error)
    throw error
  }
}
