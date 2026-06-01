import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Wifi } from 'lucide-react'
import usePortalStore from '../store/portalStore'
import { ROLES, PORTAL_CONFIG } from '../constants'

export default function PortalLayout() {
  const { portalEmployee, clearPortalEmployee, currentLogId } = usePortalStore()
  const nav = useNavigate()
  const config = PORTAL_CONFIG[portalEmployee?.rol] || { color: 'var(--color-primary)', emoji: '👤', label: 'Portal', labelCorto: 'Portal' }

  const handleLogout = async () => {
    if (currentLogId) {
      try {
        const { logLogout } = await import('../services/accessLogService')
        await logLogout(currentLogId)
      } catch (e) {
        console.error('Error logging logout:', e)
      }
    }
    clearPortalEmployee()
    nav('/portal/auth', { replace: true })
  }

  return (
    <div className="portal-layout" style={{ '--accent-color': config.color }}>
      <header className="portal-header">
        <div className="portal-header-info">
          <div 
            className="portal-role-badge" 
            style={{ 
              background: config.colorBg || 'rgba(128,128,128,0.1)', 
              border: `1px solid ${config.colorBorder || 'rgba(128,128,128,0.2)'}`, 
              color: config.color 
            }}
          >
            {config.emoji} {config.label}
          </div>
          <span className="portal-employee-name">{portalEmployee?.nombre || '—'}</span>
        </div>
        <div className="portal-header-actions">
          <span className="portal-online-dot">
            <Wifi size={14} />
            En línea
          </span>
          <button onClick={handleLogout} className="portal-logout-btn" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main className="portal-main">
        <Outlet />
      </main>
    </div>
  )
}
