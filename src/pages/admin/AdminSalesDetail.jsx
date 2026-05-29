import { useMemo, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, BarChart2, ChevronLeft, ArrowLeft, ShoppingBag, DollarSign, Package, CalendarDays, ChevronDown, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../../components/ui/BackButton'
import { useOrders } from '../../hooks/useOrders'
import { ORDER_STATES, PAYMENT_METHODS } from '../../constants'
import { formatCurrency } from '../../utils/formatters'
import { useProducts } from '../../hooks/useInventory'
import { exportSalesReportPDF, exportRotationReportPDF } from '../../services/pdfService'


// ─── Helpers de fecha ────────────────────────────────────────────────────────
function toLocalDate(ts) {
  if (!ts) return null
  if (ts.toDate) return ts.toDate()
  if (ts instanceof Date) return ts
  return new Date(ts)
}

function isoToday() {
  return new Date().toISOString().split('T')[0]
}

function isoFirstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ─── CUSTOM DATE PICKER COMPONENT (Mismo diseño premium que en Promociones) ───
const DAYS_ES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function CustomDatePicker({ value, onChange, placeholder = 'Seleccionar fecha' }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)

  const today = new Date()
  const selected = value ? new Date(value + 'T12:00:00') : null

  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth())

  const display = selected
    ? `${String(selected.getDate()).padStart(2,'0')}/${String(selected.getMonth()+1).padStart(2,'0')}/${selected.getFullYear()}`
    : ''

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectDay = (d) => {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    onChange({ target: { value: `${viewYear}-${mm}-${dd}` } })
    setOpen(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const isSelected = (d) => selected &&
    selected.getDate() === d && selected.getMonth() === viewMonth && selected.getFullYear() === viewYear
  const isToday = (d) =>
    today.getDate() === d && today.getMonth() === viewMonth && today.getFullYear() === viewYear

  const calendar = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 9998,
            }}
          />
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

              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted transition-all active:scale-90"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  <ChevronDown size={18} className="rotate-90" />
                </button>
                <span className="text-base font-bold text-app">
                  {MONTHS_ES[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted transition-all active:scale-90"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  <ChevronDown size={18} className="-rotate-90" />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {DAYS_ES.map(d => (
                  <div key={d} className="text-center text-[11px] font-bold text-muted py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((d, i) => (
                  <div key={i} className="flex items-center justify-center">
                    {d ? (
                      <button
                        type="button"
                        onClick={() => selectDay(d)}
                        className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all active:scale-90
                          ${isSelected(d)
                            ? 'text-white shadow-md'
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

              <div className="flex justify-between items-center mt-4 pt-3 border-t border-app">
                <button
                  type="button"
                  onClick={() => { onChange({ target: { value: '' } }); setOpen(false) }}
                  className="text-xs text-muted font-medium px-3 py-1.5 rounded-lg transition-colors active:scale-95"
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
                    onChange({ target: { value: `${t.getFullYear()}-${mm}-${dd}` } })
                    setOpen(false)
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all active:scale-95"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Hoy
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full h-11 pl-4 pr-10 rounded-xl bg-surface border border-app text-sm font-medium flex items-center transition-colors cursor-pointer relative"
        style={{
          color: display ? 'var(--color-text)' : 'var(--color-text-muted)',
          borderColor: open ? 'var(--color-primary)' : undefined
        }}
      >
        {display || <span style={{ color: 'var(--color-text-muted)' }}>{placeholder}</span>}
        <span className={`absolute right-3 transition-colors ${open ? 'text-primary' : 'text-muted'}`}>
          <CalendarDays size={16} />
        </span>
      </button>
      {ReactDOM.createPortal(calendar, document.body)}
    </div>
  )
}

// ─── PÁGINA PRINCIPAL DE DETALLE DE VENTAS ──────────────────────────────────
export default function AdminSalesDetail() {
  const navigate = useNavigate()
  const { data: orders = [], isLoading } = useOrders()
  const { data: products = [] } = useProducts()
  const [dateFrom, setDateFrom] = useState(isoFirstOfMonth)
  const [dateTo, setDateTo] = useState(isoToday)

  // ─── EXPORTACIÓN PDF DE VENTAS Y CAJA ──────────────────────────────────────
  const handleExportSalesReportPDF = () => {
    exportSalesReportPDF({ dateFrom, dateTo, orders })
  }

  // ─── EXPORTACIÓN PDF DE ROTACIÓN E INVENTARIO ──────────────────────────────
  const handleExportRotationReportPDF = () => {
    exportRotationReportPDF({ dateFrom, dateTo, orders, products })
  }

  // ─── CÁLCULO DE VENTAS FILTRADAS POR PRODUCTOS ───────────────────────────
  const salesData = useMemo(() => {
    const from = new Date(dateFrom + 'T00:00:00')
    const to = new Date(dateTo + 'T23:59:59')

    const filtered = orders.filter(o => {
      if (o.estado !== ORDER_STATES.COMPLETED) return false
      const fecha = toLocalDate(o.createdAt)
      if (!fecha) return false
      return fecha >= from && fecha <= to
    })

    const totalFiltered = filtered.reduce((sum, o) => sum + o.total, 0)
    const orderCount = filtered.length

    // Mapear los productos existentes en el inventario para asegurar que salgan todos (incluso con 0 ventas)
    const conteo = {}
    products.forEach(p => {
      conteo[p.nombre] = { nombre: p.nombre, cantidad: 0, total: 0 }
    })

    // Acumular ventas reales
    filtered.forEach(order => {
      (order.items || []).forEach(item => {
        const nombre = item.nombre || 'Sin nombre'
        if (!conteo[nombre]) {
          conteo[nombre] = { nombre, cantidad: 0, total: 0 }
        }
        conteo[nombre].cantidad += item.cantidad || 1
        conteo[nombre].total += (item.precio || 0) * (item.cantidad || 1)
      })
    })

    const todosLosProductos = Object.values(conteo)
      .sort((a, b) => b.cantidad - a.cantidad)

    return { total: totalFiltered, cantidad: orderCount, todosLosProductos }
  }, [orders, products, dateFrom, dateTo])

  // Animaciones
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col gap-6"
    >
      {/* Botón de retroceso y Título */}
      <div className="flex items-center gap-3">
        <BackButton to="/admin/inicio" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-app">Análisis de Ventas</h1>
          <p className="text-xs md:text-sm text-muted">Revisa el rendimiento del mes y productos más vendidos.</p>
        </div>
      </div>

      {/* Rango de Fechas con CustomDatePicker premium */}
      <div className="bg-surface rounded-3xl p-5 border border-app shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-app pb-3">
          <CalendarDays size={18} className="text-primary" />
          <h2 className="font-bold text-sm text-app uppercase tracking-wider">Filtrar por Rango</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">Desde</label>
            <CustomDatePicker
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              placeholder="Fecha inicial"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">Hasta</label>
            <CustomDatePicker
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              placeholder="Fecha final"
            />
          </div>
        </div>
      </div>

      {/* Indicador de Carga */}
      {isLoading ? (
        <div className="bg-surface rounded-3xl p-10 border border-app text-center">
          <p className="text-sm text-muted">Cargando datos de facturación...</p>
        </div>
      ) : (
        <>
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-success-soft rounded-3xl p-5 md:p-6 shadow-sm flex flex-col justify-between min-h-[110px]">
              <div>
                <div className="flex items-center gap-2 text-success mb-1">
                  <DollarSign size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Total Facturado</span>
                </div>
                <p className="text-2xl md:text-3xl font-black text-app mt-2">{formatCurrency(salesData.total)}</p>
              </div>
              <p className="text-[10px] text-muted">Suma de pedidos completados en el período.</p>
            </div>

            <div className="bg-surface rounded-3xl p-5 md:p-6 shadow-sm flex flex-col justify-between min-h-[110px]">
              <div>
                <div className="flex items-center gap-2 text-primary mb-1">
                  <ShoppingBag size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Pedidos Exitosos</span>
                </div>
                <p className="text-2xl md:text-3xl font-black text-app mt-2">{salesData.cantidad}</p>
              </div>
              <p className="text-[10px] text-muted">Cantidad de ventas despachadas.</p>
            </div>
          </div>

          {/* Centro de Reportes y Exportación */}
          <div className="bg-surface rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-primary/5 pb-3">
              <FileText size={18} className="text-primary" />
              <h2 className="font-bold text-sm text-app uppercase tracking-wider">Reportes y Exportación</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleExportSalesReportPDF}
                className="flex items-center gap-3 p-4 bg-surface hover:bg-surface-2 active:scale-[0.98] transition-all rounded-2xl shadow-sm text-left group cursor-pointer"
              >
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <DollarSign size={20} />
                </div>
                <div>
                  <span className="font-bold text-app text-sm block">Reporte de Ventas y Caja</span>
                  <span className="text-[10px] text-muted block">Resumen de ingresos y métodos de pago</span>
                </div>
              </button>
              
              <button
                onClick={handleExportRotationReportPDF}
                className="flex items-center gap-3 p-4 bg-surface hover:bg-surface-2 active:scale-[0.98] transition-all rounded-2xl shadow-sm text-left group cursor-pointer"
              >
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Package size={20} />
                </div>
                <div>
                  <span className="font-bold text-app text-sm block">Análisis de Stock y Rotación</span>
                  <span className="text-[10px] text-muted block">Ranking completo y recomendaciones inteligentes</span>
                </div>
              </button>
            </div>
          </div>

          {/* Rendimiento General de Productos */}
          <div className="bg-surface rounded-3xl p-5 md:p-6 border border-app shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-app pb-4">
              <h3 className="font-bold text-sm text-app flex items-center gap-2 uppercase tracking-wider">
                <BarChart2 size={18} className="text-primary" />
                Rendimiento General de Productos
              </h3>
            </div>

            {salesData.todosLosProductos.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center">
                <Package size={40} className="text-muted/50 mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-app">Sin productos registrados</p>
                <p className="text-xs text-muted">No se encontraron productos en el inventario.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {salesData.todosLosProductos.map((prod, i) => {
                  const maxQty = salesData.todosLosProductos[0]?.cantidad || 1
                  const pct = maxQty > 0 ? Math.round((prod.cantidad / maxQty) * 100) : 0
                  
                  // Medallas y badges premium para los primeros puestos, emoji genérico para los demás
                  let badge = '📦'
                  if (i === 0 && prod.cantidad > 0) badge = '🥇'
                  else if (i === 1 && prod.cantidad > 0) badge = '🥈'
                  else if (i === 2 && prod.cantidad > 0) badge = '🥉'

                  return (
                    <div key={prod.nombre} className="bg-surface-2 rounded-2xl p-4 border border-app">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{badge}</span>
                          <p className="text-sm font-bold text-app truncate">{prod.nombre}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-sm font-black text-app">
                            {prod.cantidad} <span className="text-xs text-muted font-normal">unds</span>
                          </p>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div className="w-full bg-app/10 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1.5">
                        <p className="text-[10px] text-muted">Rendimiento relativo: {pct}%</p>
                        <p className="text-xs font-black text-primary">{formatCurrency(prod.total)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}
