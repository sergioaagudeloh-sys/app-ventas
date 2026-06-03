import { Minus, Plus } from 'lucide-react'

/**
 * Componente atómico para la selección y ajuste de cantidades.
 * Garantiza consistencia en comportamiento, bordes, estados deshabilitados y transiciones.
 */
export default function QuantitySelector({ 
  value, 
  onChange, 
  min = 1, 
  max = 10, 
  size = 'md',
  className = '' 
}) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1)
    }
  }

  const isSm = size === 'sm'
  const containerHeight = isSm ? 'h-11' : 'h-14'
  const btnSize = isSm ? 'w-8 h-8' : 'w-11 h-11'
  const fontSize = isSm ? 'text-sm' : 'text-base'
  const iconSize = isSm ? 13 : 16

  return (
    <div className={`flex items-center bg-surface-2 rounded-full p-1 border border-app shrink-0 ${containerHeight} ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className={`${btnSize} rounded-full flex items-center justify-center text-app bg-surface shadow-sm hover:bg-surface-2 transition-transform active:scale-90 disabled:opacity-40`}
        aria-label="Disminuir cantidad"
      >
        <Minus size={iconSize} />
      </button>
      
      <span className={`w-8 text-center font-bold text-app select-none ${fontSize}`}>
        {value}
      </span>
      
      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className={`${btnSize} rounded-full flex items-center justify-center text-app bg-surface shadow-sm hover:bg-surface-2 transition-transform active:scale-90 disabled:opacity-40`}
        aria-label="Aumentar cantidad"
      >
        <Plus size={iconSize} />
      </button>
    </div>
  )
}
