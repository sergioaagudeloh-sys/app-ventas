import useAppConfigStore from '../store/appConfigStore'
import { SUPPORT_WHATSAPP } from '../constants'


/**
 * Servicio / Utilidad para estructurar y abrir enlaces de chat hacia WhatsApp.
 * Centraliza la sanitización de teléfonos y la codificación de mensajes.
 */
export function openWhatsAppChat({ phone, message }) {
  const storePhone = useAppConfigStore.getState().whatsappAdmin || SUPPORT_WHATSAPP
  const targetPhone = phone || storePhone
  
  if (!targetPhone) {
    console.error('No se configuró ningún número de teléfono para WhatsApp.')
    return
  }

  // Limpiar caracteres no numéricos
  let cleanPhone = targetPhone.replace(/\D/g, '')

  // Formatear número celular de Colombia (10 dígitos) añadiendo código de país 57
  if (cleanPhone.length === 10) {
    cleanPhone = '57' + cleanPhone
  }

  const encodedMessage = encodeURIComponent(message)
  const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`
  
  window.open(url, '_blank')
}
