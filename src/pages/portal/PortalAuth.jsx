/**
 * PortalAuth.jsx
 * Autenticación de empleados por PIN para el sistema de portales operativos.
 *
 * Flujo de 2 pasos:
 *   Paso 1 → Selector de empleados (filtrado por ?rol= si viene de un QR)
 *   Paso 2 → Teclado PIN del empleado seleccionado
 *
 * Soporta acceso genérico (sin QR) mostrando selector de roles primero.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Delete, Loader2, AlertCircle, ChevronLeft, User, Users } from 'lucide-react'
import { authenticateEmployeeByIdAndPin, subscribeToEmployeesByRole, subscribeToEmployees } from '../../services/employeeService'
import { logLogin } from '../../services/accessLogService'
import usePortalStore from '../../store/portalStore'
import useAppConfigStore from '../../store/appConfigStore'
import { ROLES, PORTAL_CONFIG } from '../../constants'

const ROLE_ROUTES = Object.fromEntries(
  Object.entries(PORTAL_CONFIG).map(([rol, cfg]) => [rol, cfg.route])
)

export default function PortalAuth() {
  const [searchParams] = useSearchParams()
  const rolParam = searchParams.get('rol') // viene del QR: ?rol=cocinero
  const nav = useNavigate()

  // Step: 'role-select' | 'employee-select' | 'pin'
  const [step, setStep] = useState(rolParam ? 'employee-select' : 'role-select')
  const [selectedRol, setSelectedRol] = useState(rolParam || null)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [employees, setEmployees] = useState([])
  const [allDbEmployees, setAllDbEmployees] = useState([])
  const [loadingEmps, setLoadingEmps] = useState(false)

  const [pin, setPin]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { setPortalEmployee } = usePortalStore()
  const { appName, appIcon, hasMultipleEmployees } = useAppConfigStore()

  // Suscribirse a todos los empleados de la base de datos para filtrado condicional en el step 0
  useEffect(() => {
    let unsub
    import('../../services/employeeService').then(({ subscribeToEmployees }) => {
      unsub = subscribeToEmployees(setAllDbEmployees)
    }).catch(console.error)
    return () => { if (unsub) unsub() }
  }, [])

  // Carga de empleados cuando se selecciona un rol
  useEffect(() => {
    if (!selectedRol) return
    setLoadingEmps(true)
    const unsub = subscribeToEmployeesByRole(selectedRol, (data) => {
      setEmployees(data)
      setLoadingEmps(false)
    })
    return () => unsub()
  }, [selectedRol])

  const handleSelectRole = (rol) => {
    setSelectedRol(rol)
    setStep('employee-select')
    setError('')
  }

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp)
    setStep('pin')
    setPin('')
    setError('')
  }

  const handleBack = () => {
    if (step === 'pin') {
      setStep('employee-select')
      setPin('')
      setError('')
    } else if (step === 'employee-select') {
      if (!rolParam) {
        setStep('role-select')
        setSelectedRol(null)
        setEmployees([])
      }
    }
  }

  const handleKey = useCallback((digit) => {
    setError('')
    if (pin.length < 6) setPin(p => p + digit)
  }, [pin])

  const handleDelete = () => {
    setError('')
    setPin(p => p.slice(0, -1))
  }

  const handleSubmit = async () => {
    if (pin.length < 4) { setError('El PIN debe tener al menos 4 dígitos'); return }
    setLoading(true)
    try {
      const employee = await authenticateEmployeeByIdAndPin(selectedEmployee.id, pin)
      if (!employee) {
        setError('PIN incorrecto. Intenta de nuevo.')
        setPin('')
      } else {
        const logId = await logLogin(employee)
        setPortalEmployee(employee, logId)
        nav(ROLE_ROUTES[employee.rol] || '/portal/vendedor', { replace: true })
      }
    } catch (e) {
      console.error(e)
      setError('Error de conexión. Verifica tu red.')
    } finally {
      setLoading(false)
    }
  }

  if (!hasMultipleEmployees) {
    return (
      <div className="portal-auth-page">
        <div className="portal-auth-card">
          <div className="portal-auth-brand">
            <div className="portal-auth-logo-placeholder">❌</div>
            <h2 className="portal-auth-title">Acceso Deshabilitado</h2>
            <p className="portal-auth-subtitle">El sistema de portales operativos no está activo</p>
          </div>
          <p className="text-center text-xs text-muted leading-relaxed max-w-[280px] text-white/50">
            Por favor, ponte en contacto con el administrador para habilitar este módulo en los ajustes de la tienda.
          </p>
          <button onClick={() => nav('/')} className="portal-success-btn h-11 text-xs" style={{ background: 'var(--color-primary)' }}>
            Volver a la Tienda
          </button>
        </div>
      </div>
    )
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','✓']
  const portalCfg = selectedRol ? PORTAL_CONFIG[selectedRol] : null

  return (
    <div className="portal-auth-page">
      <div className="portal-auth-card">

        {/* ─── Cabecera de marca ──────────────────────────────────────── */}
        <div className="portal-auth-brand">
          {appIcon
            ? <img src={appIcon} alt="logo" className="portal-auth-logo" />
            : <div className="portal-auth-logo-placeholder">{appName?.charAt(0) || 'A'}</div>
          }
          <h1 className="portal-auth-title">{appName}</h1>
          <p className="portal-auth-subtitle">
            {step === 'role-select'  && 'Selecciona tu portal'}
            {step === 'employee-select' && (portalCfg ? `${portalCfg.emoji} ${portalCfg.label}` : 'Selecciona tu empleado')}
            {step === 'pin' && `Hola, ${selectedEmployee?.nombre?.split(' ')[0]} — ingresa tu PIN`}
          </p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── PASO 0: Selector de rol (acceso genérico sin QR) ──── */}
          {step === 'role-select' && (
            <motion.div key="role-select" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="portal-auth-roles-grid">
              {allDbEmployees.length === 0 ? (
                <div className="portal-auth-loading">
                  <Loader2 size={24} className="animate-spin text-primary mr-2" />
                  <span>Cargando portales...</span>
                </div>
              ) : (
                Object.entries(PORTAL_CONFIG)
                  .filter(([rol]) => allDbEmployees.some(emp => emp.rol === rol && emp.activo !== false))
                  .map(([rol, cfg]) => (
                    <button key={rol} onClick={() => handleSelectRole(rol)} className="portal-auth-role-btn"
                      style={{ background: cfg.colorBg, borderColor: cfg.colorBorder }}>
                      <span className="portal-auth-role-emoji">{cfg.emoji}</span>
                      <span className="portal-auth-role-label">{cfg.labelCorto}</span>
                    </button>
                  ))
              )}
              {allDbEmployees.length > 0 && allDbEmployees.filter(emp => emp.activo !== false).length === 0 && (
                <div className="text-center p-6 text-xs text-muted w-full col-span-2">
                  <p className="font-semibold text-app mb-1">Sin personal registrado</p>
                  <p>Por favor, registra empleados en el panel de administración para habilitar portales.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── PASO 1: Selector de empleado filtrado por rol ────────── */}
          {step === 'employee-select' && (
            <motion.div key="employee-select" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="portal-auth-emp-list">
              {loadingEmps ? (
                <div className="portal-auth-loading"><Loader2 size={24} className="animate-spin" /><span>Cargando...</span></div>
              ) : employees.length === 0 ? (
                <div className="portal-auth-no-emps">
                  <Users size={36} />
                  <p>Sin empleados activos en este portal</p>
                  <small>El administrador debe agregarlos en Ajustes</small>
                </div>
              ) : employees.map(emp => (
                <button key={emp.id} onClick={() => handleSelectEmployee(emp)} className="portal-auth-emp-btn">
                  <div className="portal-auth-emp-avatar" style={{ background: portalCfg?.colorBg, borderColor: portalCfg?.colorBorder }}>
                    {emp.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div className="portal-auth-emp-info">
                    <span className="portal-auth-emp-name">{emp.nombre}</span>
                    {emp.telefono && <span className="portal-auth-emp-phone">{emp.telefono}</span>}
                  </div>
                  <User size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                </button>
              ))}
            </motion.div>
          )}

          {/* ── PASO 2: Teclado PIN ────────────────────────────────── */}
          {step === 'pin' && (
            <motion.div key="pin" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>

              {/* Indicador de dígitos */}
              <div className="portal-auth-dots" aria-label="PIN ingresado">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} className={`portal-auth-dot ${i < pin.length ? 'portal-auth-dot--filled' : ''}`} />
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="portal-auth-error">
                  <AlertCircle size={15} /><span>{error}</span>
                </div>
              )}

              {/* Teclado numérico */}
              <div className="portal-auth-keypad">
                {KEYS.map((key) => {
                  if (key === '⌫') return (
                    <button key={key} onClick={handleDelete} className="portal-key portal-key--action" aria-label="Borrar">
                      <Delete size={20} />
                    </button>
                  )
                  if (key === '✓') return (
                    <button key={key} onClick={handleSubmit} disabled={loading || pin.length < 4}
                      className="portal-key portal-key--confirm" aria-label="Confirmar">
                      {loading ? <Loader2 size={20} className="animate-spin" /> : '✓'}
                    </button>
                  )
                  return (
                    <button key={key} onClick={() => handleKey(key)} className="portal-key" aria-label={`Dígito ${key}`}>
                      {key}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ─── Botón de Volver ──────────────────────────────────────── */}
        {(step === 'pin' || (step === 'employee-select' && !rolParam)) && (
          <button onClick={handleBack} className="portal-auth-back-btn">
            <ChevronLeft size={16} /> Volver
          </button>
        )}

      </div>
    </div>
  )
}
