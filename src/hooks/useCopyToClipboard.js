import { useState, useCallback, useEffect } from 'react'

/**
 * Hook personalizado para copiar texto al portapapeles con reset automático de estado.
 * @param {number} resetInterval - Tiempo en milisegundos para restablecer el estado "copiado".
 * @returns {[boolean, function, any]} [isCopied, copy, copiedValue]
 */
export default function useCopyToClipboard(resetInterval = 2000) {
  const [copiedValue, setCopiedValue] = useState(null)
  const [isCopied, setIsCopied] = useState(false)

  const copy = useCallback((value) => {
    if (typeof value === 'string' || typeof value === 'number') {
      navigator.clipboard.writeText(value.toString())
      setCopiedValue(value)
      setIsCopied(true)
    } else {
      console.warn(`Cannot copy ${typeof value} to clipboard.`)
    }
  }, [])

  useEffect(() => {
    let timeoutId
    if (isCopied) {
      timeoutId = setTimeout(() => {
        setIsCopied(false)
        setCopiedValue(null)
      }, resetInterval)
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isCopied, resetInterval])

  return [isCopied, copy, copiedValue]
}
