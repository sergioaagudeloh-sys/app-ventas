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
    <div className={`flex items-center bg-surface-2 rounded-2xl p-1 border border-app h-11 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-app hover:bg-surface transition-colors active:scale-95 disabled:opacity-40 border border-app/10"
        aria-label="Disminuir cantidad"
      >
        <Minus size={14} />
      </button>
      
      <span className="w-8 text-center font-bold text-app text-sm select-none">
        {value}
      </span>
      
      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-app hover:bg-surface transition-colors active:scale-95 disabled:opacity-40 border border-app/10"
        aria-label="Aumentar cantidad"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
