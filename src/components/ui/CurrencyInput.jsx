import { useState, useEffect } from 'react'

export default function CurrencyInput({ value, onChange, placeholder, className, disabled }) {
  const [displayValue, setDisplayValue] = useState('')

  const formatCurrency = (val) => {
    if (val === null || val === undefined || val === '') return ''
    const num = String(val).replace(/\D/g, '')
    if (!num) return ''
    return '$ ' + Number(num).toLocaleString('es-CO', { maximumFractionDigits: 0 })
  }

  useEffect(() => {
    setDisplayValue(formatCurrency(value))
  }, [value])

  const handleInputChange = (e) => {
    const rawVal = e.target.value
    const numStr = rawVal.replace(/\D/g, '')
    const finalVal = numStr === '' ? '' : Number(numStr)
    
    setDisplayValue(formatCurrency(numStr))
    onChange(finalVal)
  }

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      inputMode="numeric"
    />
  )
}
