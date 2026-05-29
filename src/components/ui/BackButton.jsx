import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Componente atómico de navegación para ir atrás.
 * Garantiza consistencia visual y de comportamiento en toda la aplicación.
 */
export default function BackButton({ to, onClick, className = '' }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onClick) {
      onClick()
    } else if (to) {
      navigate(to)
    } else {
      navigate(-1)
    }
  }

  return (
    <button
      onClick={handleBack}
      className={`w-10 h-10 rounded-2xl bg-surface hover:bg-surface-2 border border-app flex items-center justify-center text-app active:scale-95 transition-all shadow-sm ${className}`}
      aria-label="Regresar a la página anterior"
    >
      <ArrowLeft size={18} />
    </button>
  )
}
