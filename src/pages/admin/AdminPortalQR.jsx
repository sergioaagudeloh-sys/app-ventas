/**
 * AdminPortalQR.jsx
 * Panel de administración del sistema de acceso por QR para portales de empleados.
 *
 * 3 tabs:
 *   → Códigos QR: Grid de portales con QR generado, descargar PNG, imprimir, copiar URL
 *   → Historial:  Tabla paginada de accessLogs con filtros
 *   → Monitoreo:  Sesiones activas en RT + estadísticas del día
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCode, Download, Printer, Copy, CheckCircle2, RefreshCw,
  Users, Clock, Activity, LogIn, LogOut, BarChart2, Loader2,
  ChevronLeft, ChevronRight, Search, X, Wifi, WifiOff, Shield
} from 'lucide-react'
import QRCode from 'qrcode'
import { PORTAL_CONFIG, COLLECTIONS } from '../../constants'
import { subscribeToActiveSessions, subscribeToRecentLogs, getDayStats } from '../../services/accessLogService'
import { subscribeToEmployees } from '../../services/employeeService'
import BackButton from '../../components/ui/BackButton'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDuration(start, end) {
  if (!start) return '—'
  const s = start.toDate ? start.toDate() : new Date(start)
  const e = end ? (end.toDate ? end.toDate() : new Date(end)) : new Date()
  const diff = Math.floor((e - s) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
}

// ─── Componente: Card de QR por portal ───────────────────────────────────────
function PortalQRCard({ rol, cfg, employeeCount, baseUrl }) {
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [rendered, setRendered] = useState(false)
  const qrUrl = `${baseUrl}${cfg.authRoute}`

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, qrUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#0f0f1a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).then(() => setRendered(true)).catch(console.error)
  }, [qrUrl])

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `QR-${cfg.labelCorto.toLowerCase()}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }, [cfg.labelCorto])

  const handlePrint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR ${cfg.label}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; flex-direction: column;
                   align-items: center; justify-content: center; min-height: 100vh; margin: 0;
                   background: #fff; }
            .qr-print-container { text-align: center; padding: 2rem; }
            .qr-print-emoji { font-size: 3rem; margin-bottom: 0.5rem; }
            h1 { font-size: 1.5rem; font-weight: 900; margin: 0.5rem 0; color: #0f172a; }
            p { color: #64748b; font-size: 0.875rem; margin: 0.25rem 0 1.5rem; }
            img { display: block; margin: 0 auto; border: 3px solid #e2e8f0; border-radius: 1rem; padding: 0.5rem; }
            small { display: block; margin-top: 1.5rem; color: #94a3b8; font-size: 0.75rem; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body onload="window.print(); window.close()">
          <div class="qr-print-container">
            <div class="qr-print-emoji">${cfg.emoji}</div>
            <h1>${cfg.label}</h1>
            <p>Escanea este código para ingresar al portal</p>
            <img src="${canvas.toDataURL()}" width="260" height="260" />
            <small>${qrUrl}</small>
          </div>
        </body>
      </html>
    `)
    win.document.close()
  }, [cfg, qrUrl])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(qrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback no disponible */ }
  }, [qrUrl])

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="qr-card" style={{ borderColor: cfg.colorBorder, background: cfg.colorBg + '66' }}>

      {/* Header */}
      <div className="qr-card-header">
        <span className="qr-card-emoji">{cfg.emoji}</span>
        <div className="qr-card-title-block">
          <h3 className="qr-card-title" style={{ color: cfg.color }}>{cfg.label}</h3>
          <span className="qr-card-employees">
            <Users size={11} /> {employeeCount} {employeeCount === 1 ? 'empleado' : 'empleados'} activos
          </span>
        </div>
      </div>

      {/* QR Canvas */}
      <div className="qr-canvas-wrapper">
        <canvas ref={canvasRef} className={`qr-canvas ${rendered ? 'qr-canvas--ready' : ''}`} />
        {!rendered && <Loader2 size={24} className="animate-spin qr-canvas-loader" />}
      </div>

      {/* URL */}
      <div className="qr-url-chip">
        <span className="qr-url-text">{cfg.authRoute}</span>
      </div>

      {/* Acciones */}
      <div className="qr-card-actions">
        <button onClick={handleDownload} className="qr-action-btn" title="Descargar PNG">
          <Download size={15} /> PNG
        </button>
        <button onClick={handlePrint} className="qr-action-btn" title="Imprimir">
          <Printer size={15} /> Imprimir
        </button>
        <button onClick={handleCopy} className={`qr-action-btn ${copied ? 'qr-action-btn--ok' : ''}`} title="Copiar URL">
          {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
          {copied ? '¡Copiado!' : 'URL'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Tab: Historial de accesos ────────────────────────────────────────────────
function TabHistorial() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rolFilter, setRolFilter] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  useEffect(() => {
    const unsub = subscribeToRecentLogs(data => { setLogs(data); setLoading(false) }, 200)
    return () => unsub()
  }, [])

  const filtered = logs.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !q || l.employeeName?.toLowerCase().includes(q) || l.rol?.includes(q)
    const matchRol = !rolFilter || l.rol === rolFilter
    return matchSearch && matchRol
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const roles = [...new Set(logs.map(l => l.rol).filter(Boolean))]

  return (
    <div className="qr-tab-panel">
      {/* Filtros */}
      <div className="qr-filters">
        <div className="qr-search-box">
          <Search size={14} />
          <input className="qr-search-input" placeholder="Buscar empleado o rol..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
          {search && <button onClick={() => { setSearch(''); setPage(1) }}><X size={14} /></button>}
        </div>
        <select className="qr-select" value={rolFilter} onChange={e => { setRolFilter(e.target.value); setPage(1) }}>
          <option value="">Todos los roles</option>
          {roles.map(r => <option key={r} value={r}>{PORTAL_CONFIG[r]?.labelCorto || r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="qr-loading"><Loader2 className="animate-spin" size={24} />Cargando historial...</div>
      ) : filtered.length === 0 ? (
        <div className="qr-empty"><Activity size={48} /><p>Sin registros de acceso aún</p></div>
      ) : (
        <>
          <div className="qr-log-table">
            <div className="qr-log-header">
              <span>Empleado</span><span>Rol</span><span>Acción</span>
              <span>Inicio</span><span>Duración</span>
            </div>
            {paginated.map(log => {
              const cfg = PORTAL_CONFIG[log.rol]
              return (
                <div key={log.id} className={`qr-log-row ${log.action === 'login' ? 'qr-log-row--login' : 'qr-log-row--logout'}`}>
                  <span className="qr-log-name">{log.employeeName || '—'}</span>
                  <span className="qr-log-rol">
                    {cfg && <span style={{ color: cfg.color }}>{cfg.emoji} {cfg.labelCorto}</span>}
                    {!cfg && log.rol}
                  </span>
                  <span className="qr-log-action">
                    {log.action === 'login'
                      ? <><LogIn size={12} /> Ingresó</>
                      : <><LogOut size={12} /> Salió</>}
                  </span>
                  <span className="qr-log-date">{formatDate(log.sessionStart || log.createdAt)}</span>
                  <span className="qr-log-dur">{formatDuration(log.sessionStart, log.sessionEnd)}</span>
                </div>
              )
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="qr-pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
              <span>{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Tab: Monitoreo en vivo ───────────────────────────────────────────────────
function TabMonitoreo() {
  const [activeSessions, setActiveSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToActiveSessions(data => {
      setActiveSessions(data)
      setLoading(false)
    })
    getDayStats().then(setStats)
    return () => unsub()
  }, [])

  const refreshStats = () => getDayStats().then(setStats)

  return (
    <div className="qr-tab-panel">
      {/* Estadísticas del día */}
      <div className="qr-monitor-section">
        <div className="qr-section-header">
          <BarChart2 size={16} /> Estadísticas del día
          <button onClick={refreshStats} className="qr-refresh-btn"><RefreshCw size={13} /></button>
        </div>
        {stats ? (
          <div className="qr-stats-grid">
            <div className="qr-stat-card">
              <span className="qr-stat-value">{stats.total}</span>
              <span className="qr-stat-label">Ingresos hoy</span>
            </div>
            {Object.entries(stats.byRol).map(([rol, count]) => {
              const cfg = PORTAL_CONFIG[rol]
              return (
                <div key={rol} className="qr-stat-card" style={{ borderColor: cfg?.colorBorder }}>
                  <span className="qr-stat-value" style={{ color: cfg?.color }}>{count}</span>
                  <span className="qr-stat-label">{cfg?.emoji} {cfg?.labelCorto || rol}</span>
                </div>
              )
            })}
            {stats.topEmployee && (
              <div className="qr-stat-card qr-stat-card--top">
                <span className="qr-stat-value">🏆</span>
                <span className="qr-stat-label">Más activo: <strong>{stats.topEmployee.name}</strong> ({stats.topEmployee.count}x)</span>
              </div>
            )}
          </div>
        ) : <div className="qr-loading"><Loader2 className="animate-spin" size={18} /></div>}
      </div>

      {/* Sesiones activas */}
      <div className="qr-monitor-section">
        <div className="qr-section-header">
          <Wifi size={16} style={{ color: '#34d399' }} />
          Empleados conectados ahora
          <span className="qr-active-badge">{activeSessions.length}</span>
        </div>

        {loading ? (
          <div className="qr-loading"><Loader2 className="animate-spin" size={20} /></div>
        ) : activeSessions.length === 0 ? (
          <div className="qr-empty-small">
            <WifiOff size={32} />
            <p>Ningún empleado conectado</p>
          </div>
        ) : (
          <div className="qr-sessions-list">
            {activeSessions.map(session => {
              const cfg = PORTAL_CONFIG[session.rol]
              return (
                <div key={session.id} className="qr-session-card">
                  <div className="qr-session-dot" style={{ background: cfg?.color || '#34d399' }} />
                  <div className="qr-session-avatar" style={{ background: cfg?.colorBg, borderColor: cfg?.colorBorder }}>
                    {session.employeeName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="qr-session-info">
                    <span className="qr-session-name">{session.employeeName}</span>
                    <span className="qr-session-rol" style={{ color: cfg?.color }}>
                      {cfg?.emoji} {cfg?.label || session.rol}
                    </span>
                  </div>
                  <div className="qr-session-meta">
                    <span className="qr-session-time">
                      <Clock size={11} /> {formatDuration(session.sessionStart, null)}
                    </span>
                    <span className="qr-session-since">{formatDate(session.sessionStart)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AdminPortalQR() {
  const [tab, setTab] = useState('qr')
  const [employees, setEmployees] = useState([])
  const baseUrl = window.location.origin

  useEffect(() => {
    const unsub = subscribeToEmployees(setEmployees)
    return () => unsub()
  }, [])

  const countByRole = (rol) => employees.filter(e => e.rol === rol && e.activo !== false).length

  const TABS = [
    { id: 'qr',        label: 'Códigos QR',  icon: QrCode },
    { id: 'historial', label: 'Historial',   icon: Activity },
    { id: 'monitoreo', label: 'Monitoreo',   icon: Shield },
  ]

  return (
    <div className="qr-admin-page">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <div className="qr-admin-header">
        <BackButton />
        <div className="qr-admin-title-block">
          <h1 className="qr-admin-title"><QrCode size={22} /> Accesos y Códigos QR</h1>
          <p className="qr-admin-sub">Gestión de portales operativos para empleados</p>
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────── */}
      <div className="qr-tabs">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} className={`qr-tab ${tab === t.id ? 'qr-tab--active' : ''}`}
              onClick={() => setTab(t.id)}>
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* ─── Contenido ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}>

          {/* ── Tab QR ── */}
          {tab === 'qr' && (
            <div className="qr-tab-panel">
              <p className="qr-instructions">
                <Shield size={14} /> Escanear un QR solo abre el portal. El acceso real siempre requiere PIN.
              </p>
              <div className="qr-cards-grid">
                {Object.entries(PORTAL_CONFIG).map(([rol, cfg]) => (
                  <PortalQRCard key={rol} rol={rol} cfg={cfg}
                    employeeCount={countByRole(rol)} baseUrl={baseUrl} />
                ))}
              </div>
            </div>
          )}

          {tab === 'historial' && <TabHistorial />}
          {tab === 'monitoreo' && <TabMonitoreo />}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
