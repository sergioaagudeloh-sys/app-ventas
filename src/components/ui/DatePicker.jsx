import { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, ChevronDown } from 'lucide-react'

const DAYS_ES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

/**
 * 1. DatePickerPortal (Named Export)
 * Componente que renderiza SOLO la ventana modal del calendario usando React Portals.
 * Diseñado para ser controlado externamente por componentes como AdminOrders.jsx.
 */
export function DatePickerPortal({ value, onChange, open, setOpen }) {
  const today = new Date()
  const selected = value ? new Date(value + 'T12:00:00') : null

  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectDay = (d) => {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    onChange(`${viewYear}-${mm}-${dd}`)
    setOpen(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  const isSelected = (d) => selected &&
    selected.getDate() === d && selected.getMonth() === viewMonth && selected.getFullYear() === viewYear
  const isToday = (d) =>
    today.getDate() === d && today.getMonth() === viewMonth && today.getFullYear() === viewYear

  if (!open) return null

  const calendar = (
    <>
      {/* Backdrop oscuro */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 9998,
        }}
      />
      
      {/* Contenedor centrador */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{
            pointerEvents: 'auto',
            width: 'min(320px, calc(100vw - 32px))',
            background: 'var(--color-surface)',
            borderRadius: '1.25rem',
            border: '1px solid var(--color-border)',
            boxShadow: '0 24px 80px -10px rgba(0,0,0,0.35)',
            padding: '1.25rem',
          }}
        >
          <div className="text-center mb-1">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Seleccionar fecha</p>
          </div>

          {/* Navegación del mes */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted transition-all active:scale-90 cursor-pointer"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <ChevronDown size={18} className="rotate-90" />
            </button>
            <span className="text-sm font-bold text-app">
              {MONTHS_ES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted transition-all active:scale-90 cursor-pointer"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <ChevronDown size={18} className="-rotate-90" />
            </button>
          </div>

          {/* Nombre de días */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_ES.map(d => (
              <div key={d} className="text-center text-[11px] font-bold text-muted py-1">{d}</div>
            ))}
          </div>

          {/* Cuadrícula de días */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((d, i) => (
              <div key={i} className="flex items-center justify-center">
                {d ? (
                  <button
                    type="button"
                    onClick={() => selectDay(d)}
                    className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all active:scale-90 cursor-pointer
                      ${isSelected(d)
                        ? 'text-white shadow-md font-bold'
                        : isToday(d)
                        ? 'font-bold ring-2'
                        : 'text-app hover:opacity-80'
                      }
                    `}
                    style={
                      isSelected(d)
                        ? { background: 'var(--color-primary)' }
                        : isToday(d)
                        ? { ringColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }
                        : { background: 'transparent' }
                    }
                  >
                    {d}
                  </button>
                ) : <div />}
              </div>
            ))}
          </div>

          {/* Botones de acción inferior */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-app">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="text-xs text-muted font-medium px-3 py-1.5 rounded-lg transition-colors active:scale-95 cursor-pointer"
              style={{ background: 'var(--color-surface-2)' }}
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => {
                const t = new Date()
                const mm = String(t.getMonth()+1).padStart(2,'0')
                const dd = String(t.getDate()).padStart(2,'0')
                onChange(`${t.getFullYear()}-${mm}-${dd}`)
                setOpen(false)
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all active:scale-95 cursor-pointer"
              style={{ background: 'var(--color-primary)' }}
            >
              Hoy
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )

  return ReactDOM.createPortal(calendar, document.body)
}

/**
 * 2. DatePicker (Default Export)
 * Selector de fecha premium completo con botón e input, listo para usar
 * en cualquier formulario (AdminSalesDetail, AdminSettings, etc.).
 */
export default function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha' }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)

  const selected = value ? new Date(value + 'T12:00:00') : null
  const display = selected
    ? `${String(selected.getDate()).padStart(2,'0')}/${String(selected.getMonth()+1).padStart(2,'0')}/${selected.getFullYear()}`
    : ''

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-11 pl-4 pr-10 rounded-xl bg-surface border border-app text-sm font-medium flex items-center transition-colors cursor-pointer relative"
        style={{
          color: display ? 'var(--color-text)' : 'var(--color-text-muted)',
          borderColor: open ? 'var(--color-primary)' : undefined
        }}
      >
        {display || <span className="text-muted">{placeholder}</span>}
        <span className={`absolute right-3 transition-colors ${open ? 'text-primary' : 'text-muted'}`}>
          <CalendarDays size={16} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <DatePickerPortal
            value={value}
            onChange={(dateVal) => onChange({ target: { value: dateVal } })}
            open={open}
            setOpen={setOpen}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
