/**
 * NumberInput.jsx
 * Componente atómico que reemplaza <input type="number">.
 *
 * Resuelve el problema UX de los campos numéricos con valor 0 inmutable:
 * internamente gestiona el display como string vacío cuando el valor semántico
 * es 0 o nulo, y convierte a número solo en el onChange hacia el padre.
 *
 * Drop-in replacement — acepta todas las props de <input> estándar.
 * Uso: <NumberInput value={myNumber} onChange={setMyNumber} ... />
 */
import { useState, useEffect } from 'react'

export default function NumberInput({ value, onChange, min, max, step, className, placeholder, disabled, id, name, ...rest }) {
  // Estado interno como string para permitir borrado total y decimales intermedios
  const [display, setDisplay] = useState(() =>
    value === 0 || value == null || value === '' ? '' : String(value)
  )

  // Sincronizar cuando el valor externo cambia (e.g. reset de formulario)
  useEffect(() => {
    const incoming = value === 0 || value == null || value === '' ? '' : String(value)
    setDisplay(prev => {
      // No sobreescribir si el usuario está editando un decimal incompleto (ej. "1.")
      const prevNum = parseFloat(prev)
      const incNum  = parseFloat(incoming)
      if (!isNaN(prevNum) && prevNum === incNum) return prev
      return incoming
    })
  }, [value])

  const handleChange = (e) => {
    const raw = e.target.value
    setDisplay(raw)
    // Propaga número al padre; cadena vacía → 0
    const num = raw === '' ? 0 : parseFloat(raw)
    if (!isNaN(num)) {
      onChange?.(num)
    }
  }

  return (
    <input
      type="number"
      value={display}
      onChange={handleChange}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      id={id}
      name={name}
      className={className}
      {...rest}
    />
  )
}
