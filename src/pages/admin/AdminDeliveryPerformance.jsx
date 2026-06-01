/**
 * AdminDeliveryPerformance.jsx
 * Panel de analítica de rendimiento de domicilios.
 * Muestra métricas clave: total, exitosos, fallidos, por mensajero, por día.
 */
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bike, ArrowLeft, TrendingUp, CheckCircle2, AlertTriangle, Clock,
  User, Calendar, Loader2, BarChart3, RefreshCw,
} from 'lucide-react'
import { getDeliveriesForAnalytics, getExternalMessengers } from '../../services/deliveryService'
import { getEmployeesByRole } from '../../services/employeeService'
import { ROLES, DELIVERY_STATES, DELIVERY_STATE_LABELS } from '../../constants'
import { formatCurrency } from '../../utils/formatters'
import BackButton from '../../components/ui/BackButton'

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = 'primary' }) {
  const colors = {
    primary:  'bg-primary/10 text-primary',
    emerald:  'bg-emerald-500/10 text-emerald-400',
    rose:     'bg-rose-500/10 text-rose-400',
    amber:    'bg-amber-500/10 text-amber-400',
    indigo:   'bg-indigo-500/10 text-indigo-400',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-app rounded-2xl p-4 flex items-start gap-3"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-black text-app leading-none">{value}</p>
        <p className="text-xs font-semibold text-muted mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-muted mt-1">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pct(part, total) {
  if (!total) return '0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

function rangeStart(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AdminDeliveryPerformance() {
  const navigate = useNavigate()

  const [range, setRange]         = useState(7) // días
  const [deliveries, setDeliveries] = useState([])
  const [employees, setEmployees] = useState([])
  const [externals, setExternals] = useState([])
  const [loading, setLoading]     = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const from = rangeStart(range)
      const to   = new Date()
      const [dels, emps, exts] = await Promise.all([
        getDeliveriesForAnalytics(from, to),
        getEmployeesByRole(ROLES.MENSAJERO),
        getExternalMessengers(),
      ])
      setDeliveries(dels)
      setEmployees(emps)
      setExternals(exts)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [range])

  // ─── Cálculos ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total        = deliveries.length
    const entregados   = deliveries.filter(d => d.estado === DELIVERY_STATES.DELIVERED).length
    const fallidos     = deliveries.filter(d => d.estado === DELIVERY_STATES.FAILED).length
    const reprogramados = deliveries.filter(d => d.estado === DELIVERY_STATES.RESCHEDULED).length
    const enRuta       = deliveries.filter(d => d.estado === DELIVERY_STATES.ON_ROUTE).length

    // Tiempo promedio de entrega (en minutos) — para los entregados
    const delivered = deliveries.filter(d => d.estado === DELIVERY_STATES.DELIVERED && d.deliveredAt && d.createdAt)
    const avgMinutes = delivered.length
      ? Math.round(
          delivered.reduce((acc, d) => {
            const created   = d.createdAt?.seconds  ? d.createdAt.seconds  * 1000 : 0
            const delivered_ = d.deliveredAt?.seconds ? d.deliveredAt.seconds * 1000 : 0
            return acc + (delivered_ - created) / 60000
          }, 0) / delivered.length
        )
      : null

    // Agrupación por mensajero
    const allMessengers = [
      ...employees.map(e => ({ id: e.id, name: e.nombre, type: 'emp' })),
      ...externals.map(e => ({ id: e.id, name: e.name, type: 'ext' })),
    ]
    const byMessenger = allMessengers.map(m => {
      const mine = deliveries.filter(d =>
        (m.type === 'emp' ? d.mensajeroId : d.mensajeroExtId) === m.id
      )
      return {
        ...m,
        total:      mine.length,
        entregados: mine.filter(d => d.estado === DELIVERY_STATES.DELIVERED).length,
        fallidos:   mine.filter(d => d.estado === DELIVERY_STATES.FAILED).length,
      }
    }).filter(m => m.total > 0).sort((a, b) => b.total - a.total)

    // Agrupación por día
    const byDay = {}
    deliveries.forEach(d => {
      const date = d.createdAt?.seconds
        ? new Date(d.createdAt.seconds * 1000).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
        : 'Hoy'
      if (!byDay[date]) byDay[date] = { total: 0, entregados: 0 }
      byDay[date].total++
      if (d.estado === DELIVERY_STATES.DELIVERED) byDay[date].entregados++
    })

    return { total, entregados, fallidos, reprogramados, enRuta, avgMinutes, byMessenger, byDay }
  }, [deliveries, employees, externals])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-5xl mx-auto pb-24"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BackButton onClick={() => navigate('/admin/pedidos')} />
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Bike size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-app">Rendimiento de Entregas</h1>
          <p className="text-xs text-muted">Analítica del módulo de mensajero propio</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="ml-auto p-2 rounded-xl hover:bg-app/10 text-muted transition-colors disabled:opacity-40"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Selector de rango */}
      <div className="flex gap-2 mb-6">
        {[
          { days: 7,  label: '7d'  },
          { days: 14, label: '14d' },
          { days: 30, label: '30d' },
        ].map(({ days, label }) => (
          <button
            key={days}
            onClick={() => setRange(days)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              range === days
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-surface border-app text-muted hover:border-primary/40'
            }`}
          >
            <Calendar size={13} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted">
          <Loader2 size={20} className="animate-spin text-primary" />
          <span className="text-sm">Calculando métricas...</span>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-semibold">Sin datos en este período</p>
          <p className="text-xs mt-1">Activa el módulo de mensajero propio y empieza a asignar domicilios.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={Bike}          label="Total Domicilios"   value={stats.total}        color="primary" />
            <KpiCard icon={CheckCircle2}  label="Entregados"         value={stats.entregados}   color="emerald"
              sub={`Tasa de éxito: ${pct(stats.entregados, stats.total)}`} />
            <KpiCard icon={AlertTriangle} label="Fallidos"           value={stats.fallidos}     color="rose"
              sub={pct(stats.fallidos, stats.total)} />
            <KpiCard icon={Clock}         label="Tiempo Prom. (min)" value={stats.avgMinutes != null ? `${stats.avgMinutes} min` : 'N/A'} color="indigo" />
          </div>

          {/* Por mensajero */}
          {stats.byMessenger.length > 0 && (
            <div className="bg-surface border border-app rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-app flex items-center gap-2">
                <User size={15} className="text-primary" />
                <h2 className="font-bold text-app text-sm">Por Domiciliario</h2>
              </div>
              <div className="divide-y divide-app">
                {stats.byMessenger.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-app truncate">{m.name}</p>
                        <span className="text-[10px] text-muted border border-app rounded px-1">
                          {m.type === 'emp' ? 'Empleado' : 'Externo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="h-1.5 rounded-full bg-surface-2 flex-1 max-w-[120px] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: pct(m.entregados, m.total) }}
                          />
                        </div>
                        <span className="text-[11px] text-muted">{pct(m.entregados, m.total)} entregados</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-app">{m.total} <span className="text-xs text-muted font-normal">total</span></p>
                      <p className="text-xs">
                        <span className="text-emerald-400">{m.entregados}✓</span>
                        {m.fallidos > 0 && <span className="text-rose-400 ml-1">{m.fallidos}✗</span>}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Por día */}
          {Object.keys(stats.byDay).length > 0 && (
            <div className="bg-surface border border-app rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-app flex items-center gap-2">
                <Calendar size={15} className="text-primary" />
                <h2 className="font-bold text-app text-sm">Por Día</h2>
              </div>
              <div className="divide-y divide-app">
                {Object.entries(stats.byDay).map(([date, data]) => (
                  <div key={date} className="flex items-center gap-3 px-4 py-3">
                    <p className="text-xs font-semibold text-muted w-28 shrink-0">{date}</p>
                    <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (data.total / Math.max(...Object.values(stats.byDay).map(d => d.total))) * 100)}%` }}
                      />
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-app">{data.total}</span>
                      <span className="text-xs text-emerald-400 ml-1">({data.entregados}✓)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
