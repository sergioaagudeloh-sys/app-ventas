import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Componente que fuerza el scroll al tope superior en cada cambio de ruta.
 * Resuelve la retención de scroll asíncrona entre vistas.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    if (document.documentElement) {
      document.documentElement.scrollTo(0, 0)
    }
    if (document.body) {
      document.body.scrollTo(0, 0)
    }
  }, [pathname])

  return null
}
