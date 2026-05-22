/**
 * Funciones utilitarias puras para formateo.
 */

/**
 * Formatea un número como moneda colombiana (COP).
 * @param {number} amount - Cantidad a formatear
 * @returns {string} Ej: "$50.000"
 */
export function formatCurrency(amount) {
  if (typeof amount !== 'number') return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formatea una fecha en formato legible en español.
 * @param {Date|string|object} date - Fecha (puede ser Timestamp de Firestore)
 * @returns {string} Ej: "22 de mayo de 2026"
 */
export function formatDate(date) {
  if (!date) return '—'
  const d = date?.toDate ? date.toDate() : new Date(date)
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Formatea una hora.
 * @param {Date|string|object} date
 * @returns {string} Ej: "3:45 PM"
 */
export function formatTime(date) {
  if (!date) return '—'
  const d = date?.toDate ? date.toDate() : new Date(date)
  return d.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Trunca un texto a un máximo de caracteres.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(text, maxLength = 60) {
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}
