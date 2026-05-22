import { useEffect, useState, useCallback } from 'react'

/**
 * Hook para detectar inactividad del usuario en una pantalla.
 * @param {number} timeoutMs - Tiempo en milisegundos para considerar inactividad (ej. 15000)
 * @param {boolean} isActive - Si el timer debe estar encendido
 */
export default function useInactivityTimer(timeoutMs = 15000, isActive = true) {
  const [isInactive, setIsInactive] = useState(false)

  const resetTimer = useCallback(() => {
    setIsInactive(false)
  }, [])

  useEffect(() => {
    if (!isActive) return

    // Inicia inactivo como falso
    setIsInactive(false)

    let timer = setTimeout(() => {
      setIsInactive(true)
    }, timeoutMs)

    const handleActivity = () => {
      clearTimeout(timer)
      setIsInactive(false)
      timer = setTimeout(() => {
        setIsInactive(true)
      }, timeoutMs)
    }

    // Escuchar eventos globales de interacción
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    window.addEventListener('scroll', handleActivity)
    window.addEventListener('click', handleActivity)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      window.removeEventListener('click', handleActivity)
    }
  }, [timeoutMs, isActive])

  return { isInactive, resetTimer }
}
