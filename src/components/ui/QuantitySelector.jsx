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

  return (
    <div className={`flex items-center bg-surface-2 rounded-full p-1.5 border border-app h-14 shrink-0 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className="w-11 h-11 rounded-full flex items-center justify-center text-app bg-surface shadow-sm hover:bg-surface-2 transition-transform active:scale-90 disabled:opacity-40"
        aria-label="Disminuir cantidad"
      >
        <Minus size={16} />
      </button>
      
      <span className="w-10 text-center font-bold text-app text-base select-none">
        {value}
      </span>
      
      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className="w-11 h-11 rounded-full flex items-center justify-center text-app bg-surface shadow-sm hover:bg-surface-2 transition-transform active:scale-90 disabled:opacity-40"
        aria-label="Aumentar cantidad"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
