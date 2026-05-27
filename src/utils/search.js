/**
 * Normaliza una cadena de texto eliminando acentos/tildes y convirtiéndola a minúsculas.
 */
export function normalizeText(str) {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

/**
 * Calcula la distancia de Levenshtein entre dos cadenas de texto.
 */
export function getLevenshteinDistance(a, b) {
  const matrix = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // sustitución
          Math.min(
            matrix[i][j - 1] + 1, // inserción
            matrix[i - 1][j] + 1  // eliminación
          )
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/**
 * Compara un texto objetivo con una consulta de búsqueda utilizando lógica difusa.
 * Soporta insensibilidad a acentos, mayúsculas y pequeños errores de ortografía (Levenshtein).
 */
export function fuzzyMatch(text, query) {
  const normText = normalizeText(text)
  const normQuery = normalizeText(query)
  
  if (!normQuery) return true
  if (normText.includes(normQuery)) return true
  
  const textWords = normText.split(/\s+/).filter(Boolean)
  const queryWords = normQuery.split(/\s+/).filter(Boolean)
  
  if (queryWords.length === 0) return true
  
  // Cada palabra de la consulta debe encontrar al menos una coincidencia difusa en el texto
  return queryWords.every(qWord => {
    if (qWord.length < 3) {
      // Para palabras muy cortas (1-2 letras), exigir coincidencia exacta de subcadena
      return textWords.some(tWord => tWord.includes(qWord))
    }
    
    return textWords.some(tWord => {
      // Coincidencia de subcadena directa
      if (tWord.includes(qWord) || qWord.includes(tWord)) return true
      
      // Margen de error tolerado según longitud de la palabra
      const maxDistance = qWord.length <= 4 ? 1 : 2
      const dist = getLevenshteinDistance(tWord, qWord)
      return dist <= maxDistance
    })
  })
}
