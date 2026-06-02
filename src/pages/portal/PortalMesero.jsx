/**
 * PortalMesero.jsx
 * Portal del Mesero. Muestra el mapa de mesas en tiempo real,
 * permite abrir/cerrar mesas y solicitar la cuenta.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Utensils, Users, CheckCircle2, Clock, Receipt, Loader2, X, LayoutGrid } from 'lucide-react'
import { subscribeToTables, openTable, closeTable, requestTableBill, subscribeToTableRequests, resolveTableRequest } from '../../services/tableService'
import usePortalStore from '../../store/portalStore'

const ESTADO_CONFIG = {
  disponible:         { label: 'Disponible',        color: '#34d399', bg: '#34d39922' },
  ocupada:            { label: 'Ocupada',            color: '#fb923c', bg: '#fb923c22' },
  solicitando_cuenta: { label: 'Cuenta Solicitada',  color: '#f87171', bg: '#f8717122' },
}

export default function PortalMesero() {
  const { portalEmployee } = usePortalStore()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [requests, setRequests] = useState([])

  useEffect(() => {
    const unsub = subscribeToTables(data => { setTables(data); setLoading(false) })
    return () => unsub()
  }, [])

  useEffect(() => {
    let prevCount = 0
    const unsub = subscribeToTableRequests(data => {
      setRequests(data)
      if (data.length > prevCount) {
        // Reproducir sonido discreto de timbre de mesa
        try {
          const audio = new Audio('/bell.mp3')
          audio.volume = 0.5
          audio.play().catch(() => {
            const fallback = new Audio('/notification.mp3')
            fallback.volume = 0.4
            fallback.play().catch(() => {})
          })
        } catch (e) {}
      }
      prevCount = data.length
    })
    return () => unsub()
  }, [])

  const handleAction = async (action) => {
    if (!selectedTable) return
    setActionLoading(true)
    try {
      if (action === 'open') await openTable(selectedTable.id, portalEmployee?.id)
      else if (action === 'bill') await requestTableBill(selectedTable.id)
      else if (action === 'close') await closeTable(selectedTable.id)
      setSelectedTable(null)
    } catch (e) { console.error(e) }
    finally { setActionLoading(false) }
  }

  const available = tables.filter(t => t.estado === 'disponible').length
  const occupied  = tables.filter(t => t.estado === 'ocupada').length
  const billing   = tables.filter(t => t.estado === 'solicitando_cuenta').length

  return (
    <div className="portal-mesero">
      {/* ─── HEADER ───────────────────────────────────────────────────── */}
      <div className="portal-mesero-header">
        <div className="portal-mesero-icon"><Utensils size={22} /></div>
        <div>
          <h1 className="portal-mesero-title">Salón de Mesas</h1>
          <p className="portal-mesero-sub">
            {available} libres · {occupied} ocupadas · {billing} pidiendo cuenta
          </p>
        </div>
        {loading && <Loader2 size={18} className="animate-spin ml-auto" />}
      </div>

      {/* ─── LEYENDA ─────────────────────────────────────────────────── */}
      <div className="portal-mesero-legend">
        {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
          <span key={k} className="portal-legend-item">
            <span className="portal-legend-dot" style={{ background: v.color }} />{v.label}
          </span>
        ))}
      </div>

      {/* ─── BANNER DE SOLICITUDES ACTIVAS (LLAMADOS / CUENTAS) ─── */}
      <AnimatePresence>
        {requests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2.5 text-left w-full"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <span>🛎️</span> Solicitudes Pendientes de Atención ({requests.length})
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
              {requests.map(req => (
                <div key={req.id} className="p-3 bg-surface border border-app rounded-xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-app text-sm truncate">{req.tableName}</p>
                    <span className="text-[10px] font-bold uppercase" style={{ color: req.type === 'cuenta' ? '#f87171' : '#fb923c' }}>
                      {req.type === 'cuenta' ? '💳 Pide la Cuenta' : '🛎️ Llamado al Mesero'}
                    </span>
                  </div>
                  
                  <button
                    onClick={async () => {
                      try {
                        await resolveTableRequest(req.id, portalEmployee?.id)
                      } catch (e) {
                        console.error(e)
                      }
                    }}
                    className="h-8 px-3 rounded-lg bg-primary text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer border-none"
                  >
                    Atender
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MAPA DE MESAS ───────────────────────────────────────────── */}
      {tables.length === 0 && !loading ? (
        <div className="portal-mesero-empty">
          <LayoutGrid size={48} />
          <p>No hay mesas configuradas</p>
          <small>El administrador debe configurarlas en Ajustes → Roles Operativos</small>
        </div>
      ) : (
        <div className="portal-tables-grid">
          <AnimatePresence>
            {tables.map(table => {
              const cfg = ESTADO_CONFIG[table.estado] || ESTADO_CONFIG.disponible
              return (
                <motion.button key={table.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="portal-table-card" style={{ background: cfg.bg, borderColor: cfg.color + '66' }}
                  onClick={() => setSelectedTable(table)}>
                  <span className="portal-table-name">{table.nombre}</span>
                  <span className="portal-table-capacity"><Users size={12} /> {table.capacidad}</span>
                  <span className="portal-table-estado" style={{ color: cfg.color }}>{cfg.label}</span>
                  {table.observaciones && <span className="portal-table-obs">{table.observaciones}</span>}
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─── MODAL ACCIONES DE MESA ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedTable && (
          <div className="portal-modal-overlay" onClick={() => setSelectedTable(null)}>
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30 }}
              className="portal-table-actions-sheet" onClick={e => e.stopPropagation()}>
              <div className="portal-table-actions-header">
                <p className="portal-table-actions-title">{selectedTable.nombre}</p>
                <button onClick={() => setSelectedTable(null)}><X size={20} /></button>
              </div>
              <p className="portal-table-actions-estado" style={{ color: ESTADO_CONFIG[selectedTable.estado]?.color }}>
                Estado: {ESTADO_CONFIG[selectedTable.estado]?.label}
              </p>
              <p className="portal-table-actions-meta"><Users size={14} /> Capacidad: {selectedTable.capacidad} personas</p>
              {selectedTable.observaciones && <p className="portal-table-actions-obs">📍 {selectedTable.observaciones}</p>}

              <div className="portal-table-actions-btns">
                {selectedTable.estado === 'disponible' && (
                  <button className="portal-action-btn portal-action-btn--open" disabled={actionLoading}
                    onClick={() => handleAction('open')}>
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><Utensils size={16} /> Ocupar Mesa</>}
                  </button>
                )}
                {selectedTable.estado === 'ocupada' && (
                  <>
                    <button className="portal-action-btn portal-action-btn--bill" disabled={actionLoading}
                      onClick={() => handleAction('bill')}>
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><Receipt size={16} /> Solicitar Cuenta</>}
                    </button>
                    <button className="portal-action-btn portal-action-btn--close" disabled={actionLoading}
                      onClick={() => handleAction('close')}>
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Liberar Mesa</>}
                    </button>
                  </>
                )}
                {selectedTable.estado === 'solicitando_cuenta' && (
                  <button className="portal-action-btn portal-action-btn--close" disabled={actionLoading}
                    onClick={() => handleAction('close')}>
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Cobrado — Liberar</>}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
