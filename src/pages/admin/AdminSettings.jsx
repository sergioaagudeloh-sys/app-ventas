import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Settings, Database, Trash2, CheckCircle, AlertTriangle, Save, Paintbrush, Smartphone, Building2, Sun, Moon, Link, X, LogOut, Filter, Plus, Lock, Mail, KeyRound, Eye, EyeOff, ChevronRight, ArrowLeft, ChevronDown, Download, Megaphone, CalendarDays, Type, Receipt, TrendingUp, ShoppingBag, Wallet, BarChart3, Tag, Heart, Package, CreditCard, Sparkles, User, Truck, Percent, Calendar, Shield, ToggleLeft, QrCode, Printer, Users, Copy, CheckCircle2, Loader2, LayoutGrid, MessageSquare } from 'lucide-react'
import { COLLECTIONS, ORDER_STATES, PAYMENT_METHODS, DEV_PIN, PORTAL_CONFIG } from '../../constants'
import { updateAppConfig, updateCatalogFilters, resetAppData } from '../../services/appConfigService'
import { signOutAdmin, updateAdminCredentials } from '../../services/authService'
import useAppConfigStore from '../../store/appConfigStore'
import useAuthStore from '../../store/authStore'
import { auth } from '../../config/firebaseConfig'
import BackButton from '../../components/ui/BackButton'
import { reportMonthlyBillingToDeveloper } from '../../services/telemetryService'

import { ADVANCED_PALETTES, getActiveColors } from '../../constants/palettes'
import { FONTS, FONT_CATEGORIES, FONTS_BY_CATEGORY } from '../../constants/fonts'
import usePWAInstall from '../../hooks/usePWAInstall'
import { useAds, useCreateAd, useUpdateAd, useDeleteAd } from '../../hooks/useAds'
import { useProducts } from '../../hooks/useInventory'
import { useBilling } from '../../hooks/useBilling'
import { useOrders } from '../../hooks/useOrders'
import { exportDeveloperReceiptPDF } from '../../services/pdfService'
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon } from '../../hooks/useCoupons'
import { formatCurrency } from '../../utils/formatters'
import LeafletMapPicker from '../../components/ui/LeafletMapPicker'
import QRCode from 'qrcode'
import DeliveryCustomMessengerPanel from '../../components/admin/settings/DeliveryCustomMessengerPanel'

// ─── DATOS FICTICIOS (SEEDS) ──────────────────────────────────────────────
const SEED_CATEGORIES = [
  { id: 'cat-camisetas', nombre: 'Camisetas', descripcion: 'Camisetas de algodón' },
  { id: 'cat-pantalones', nombre: 'Pantalones', descripcion: 'Pantalones y jeans' },
  { id: 'cat-accesorios', nombre: 'Accesorios', descripcion: 'Gorras, relojes, etc' }
]

const SEED_PRODUCTS = [
  {
    id: 'prod-1',
    nombre: 'Camiseta Básica Negra',
    descripcion: 'Camiseta de algodón peinado 100%. Ajuste perfecto.',
    categoria: 'Camisetas',
    precioBase: 45000,
    costoBase: 20000,
    genero: 'unisex',
    activo: true,
    destacado: true,
    imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=600&auto=format&fit=crop',
    variantes: [
      { id: 'v1', talla: 'M', color: 'Negro', stock: 15, sku: 'TS-BLK-M' },
      { id: 'v2', talla: 'L', color: 'Negro', stock: 5, sku: 'TS-BLK-L' }
    ]
  },
  {
    id: 'prod-2',
    nombre: 'Pantalón Cargo Urbano',
    descripcion: 'Pantalón con múltiples bolsillos, ideal para el día a día.',
    categoria: 'Pantalones',
    precioBase: 120000,
    costoBase: 60000,
    genero: 'hombre',
    activo: true,
    destacado: false,
    imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop',
    variantes: [
      { id: 'v3', talla: '32', color: 'Verde Oliva', stock: 8, sku: 'PN-GRN-32' },
      { id: 'v4', talla: '34', color: 'Verde Oliva', stock: 12, sku: 'PN-GRN-34' }
    ]
  },
  {
    id: 'prod-3',
    nombre: 'Gorra Clásica Vintage',
    descripcion: 'Gorra con diseño retro y correa ajustable.',
    categoria: 'Accesorios',
    precioBase: 35000,
    costoBase: 15000,
    genero: 'unisex',
    activo: true,
    destacado: true,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=600&auto=format&fit=crop',
    variantes: [
      { id: 'v5', talla: 'Única', color: 'Azul Marino', stock: 20, sku: 'CP-BLU-U' }
    ]
  }
]

const SEED_USERS = [
  { id: '3001234567', celular: '3001234567', nombre: 'Juan Pérez' },
  { id: '3109876543', celular: '3109876543', nombre: 'María Gómez' }
]

const SEED_ORDERS = [
  {
    id: 'ord-1',
    orderNumber: 'PED-1001',
    cliente: { celular: '3001234567', nombre: 'Juan Pérez' },
    items: [
      { productId: 'prod-1', variantId: 'v1', nombre: 'Camiseta Básica Negra', talla: 'M', color: 'Negro', cantidad: 2, precio: 45000 }
    ],
    total: 90000,
    estado: ORDER_STATES.PENDING,
    metodoPago: PAYMENT_METHODS.CASH
  },
  {
    id: 'ord-2',
    orderNumber: 'PED-1002',
    cliente: { celular: '3109876543', nombre: 'María Gómez' },
    items: [
      { productId: 'prod-2', variantId: 'v4', nombre: 'Pantalón Cargo Urbano', talla: '34', color: 'Verde Oliva', cantidad: 1, precio: 120000 },
      { productId: 'prod-3', variantId: 'v5', nombre: 'Gorra Clásica Vintage', talla: 'Única', color: 'Azul Marino', cantidad: 1, precio: 35000 }
    ],
    total: 155000,
    estado: ORDER_STATES.COMPLETED,
    metodoPago: PAYMENT_METHODS.TRANSFER
  }
]

// ─── CUSTOM DATE PICKER COMPONENT ────────────────────────────────────────
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
          {/* Overlay oscuro */}
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
          {/* Contenedor centrador: flex fixed que no interfiere con las animaciones de framer-motion */}
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
          {/* Calendario animado */}
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
            {/* Mes/Año + label */}
            <div className="text-center mb-1">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Seleccionar fecha</p>
            </div>

            {/* Navegación */}
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

            {/* Días de la semana */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_ES.map(d => (
                <div key={d} className="text-center text-[11px] font-bold text-muted py-1">{d}</div>
              ))}
            </div>

            {/* Celdas de días */}
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

            {/* Footer */}
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

// ─── Componente: Card de QR por portal ───
function PortalQRCard({ rol, cfg, employeeCount, baseUrl }) {
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [rendered, setRendered] = useState(false)
  const qrUrl = `${baseUrl}${cfg.authRoute}`

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, qrUrl, {
      width: 140,
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
      className="qr-card" style={{ borderColor: cfg.colorBorder, background: cfg.colorBg + '33', padding: '1rem', borderRadius: '1rem' }}>
      <div className="flex items-center gap-2 mb-2 w-full justify-start text-left">
        <span className="text-xl">{cfg.emoji}</span>
        <div>
          <h4 className="text-xs font-bold text-app" style={{ color: cfg.color }}>{cfg.label}</h4>
          <span className="text-[10px] text-muted flex items-center gap-1">
            <Users size={10} /> {employeeCount} {employeeCount === 1 ? 'activo' : 'activos'}
          </span>
        </div>
      </div>
      <div className="qr-canvas-wrapper p-1.5 bg-white border border-app rounded-lg mb-2">
        <canvas ref={canvasRef} style={{ width: '100px', height: '100px' }} />
      </div>
      <div className="qr-card-actions grid grid-cols-3 gap-1 w-full">
        <button onClick={handleDownload} className="qr-action-btn flex items-center justify-center p-1 rounded-lg border text-[10px] gap-1 hover:bg-surface-2 transition-colors border-app" title="Descargar PNG">
          <Download size={11} /> PNG
        </button>
        <button onClick={handlePrint} className="qr-action-btn flex items-center justify-center p-1 rounded-lg border text-[10px] gap-1 hover:bg-surface-2 transition-colors border-app" title="Imprimir">
          <Printer size={11} /> Imprimir
        </button>
        <button onClick={handleCopy} className="qr-action-btn flex items-center justify-center p-1 rounded-lg border text-[10px] gap-1 hover:bg-surface-2 transition-colors border-app" title="Copiar URL">
          {copied ? <CheckCircle2 size={11} className="text-success" /> : <Copy size={11} />}
          {copied ? 'Listo' : 'Link'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── CUSTOM SELECT COMPONENT ──────────────────────────────────────────────

function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className="relative w-full" style={{ zIndex: open ? 50 : 'auto' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full h-11 pl-4 pr-10 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer flex items-center justify-between"
        style={{ borderColor: open ? 'var(--color-primary)' : undefined }}
      >
        <span className={selected ? 'text-app' : 'text-muted'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={`absolute right-3 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <ChevronDown size={18} />
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay para cerrar al hacer click fuera */}
            <div className="fixed inset-0" style={{ zIndex: 48 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 mt-1 rounded-xl border border-app overflow-hidden shadow-xl"
              style={{ zIndex: 49, background: 'var(--color-surface)' }}
            >
              {options.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2
                    ${opt.value === value
                      ? 'bg-primary text-white font-bold'
                      : 'text-app hover:bg-surface-2'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── STYLISH PRINTABLE QR MODAL FOR TABLES ─────────────────────────────────
function TableQRModal({ table, onClose }) {
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [rendered, setRendered] = useState(false)
  const qrUrl = `${window.location.origin}/?tableId=${table.id}`

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, qrUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#0f0f1a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).then(() => setRendered(true)).catch(console.error)
  }, [qrUrl])

  const handleDownload = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `QR-${table.nombre.replace(/\s+/g, '_')}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  const handlePrint = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR ${table.nombre}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; flex-direction: column;
                   align-items: center; justify-content: center; min-height: 100vh; margin: 0;
                   background: #fff; color: #0f172a; }
            .qr-print-container { text-align: center; padding: 2.5rem; border: 2px dashed #cbd5e1; border-radius: 2rem; max-width: 380px; }
            .qr-emoji { font-size: 3.5rem; margin-bottom: 0.5rem; }
            h1 { font-size: 2rem; font-weight: 900; margin: 0.5rem 0; text-transform: uppercase; letter-spacing: 0.05em; }
            p { color: #475569; font-size: 1rem; font-weight: 600; margin: 0.25rem 0 1.75rem; }
            img { display: block; margin: 0 auto; border: 4px solid #f1f5f9; border-radius: 1.5rem; padding: 0.75rem; background: #fff; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
            .scan-instructions { font-size: 0.875rem; color: #64748b; margin-top: 1.5rem; font-weight: 500; }
            small { display: block; margin-top: 0.75rem; color: #94a3b8; font-size: 0.7rem; word-break: break-all; }
            @media print { 
              body { min-height: auto; }
              .qr-print-container { border: none; padding: 0; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close()">
          <div class="qr-print-container">
            <div class="qr-emoji">🛎️</div>
            <h1>${table.nombre}</h1>
            <p>ESCANEAME PARA PEDIR A LA MESA</p>
            <img src="${canvas.toDataURL()}" width="260" height="260" />
            <div class="scan-instructions">Abre la cámara de tu celular para ver nuestra carta digital</div>
            <small>${qrUrl}</small>
          </div>
        </body>
      </html>
    `)
    win.document.close()
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justify: 'center' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-sm bg-surface border border-app rounded-3xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-surface-2 hover:bg-surface-3 text-muted hover:text-app flex items-center justify-center transition-all"
        >
          <X size={16} />
        </button>

        <div className="text-center space-y-4">
          <div className="text-3xl">🛎️</div>
          <div>
            <h3 className="text-lg font-black text-app uppercase">{table.nombre}</h3>
            <p className="text-xs text-muted">Generador de Código QR para Autoservicio</p>
          </div>

          <div className="flex justify-center p-3 bg-white border border-app rounded-2xl w-fit mx-auto shadow-sm">
            <canvas ref={canvasRef} style={{ width: '180px', height: '180px' }} />
          </div>

          <p className="text-xs text-muted max-w-xs mx-auto">
            Pega este sticker en la mesa física para que tus clientes escaneen con la cámara de su celular y realicen su pedido directamente.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={handleDownload}
              className="flex flex-col items-center gap-1 p-2 bg-surface-2 hover:bg-surface-3 text-app border border-app rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer border-none"
            >
              <Download size={14} className="text-primary animate-pulse" />
              <span>PNG</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex flex-col items-center gap-1 p-2 bg-surface-2 hover:bg-surface-3 text-app border border-app rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer border-none"
            >
              <Printer size={14} className="text-primary" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-1 p-2 bg-surface-2 hover:bg-surface-3 text-app border border-app rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer border-none"
            >
              {copied ? (
                <CheckCircle2 size={14} className="text-success" />
              ) : (
                <Copy size={14} className="text-primary" />
              )}
              <span>{copied ? 'Copiado' : 'Copiar URL'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── COMPONENTE CONFIGURACIÓN DE MESAS (CRUD) ──────────────────────────────
function AdminTablesCRUD({ onSuccess, onError }) {
  const [tables, setTables] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [editTable, setEditTable] = useState(null)
  const [qrTable, setQrTable] = useState(null)
  
  // Campos del Formulario
  const [nombre, setNombre] = useState('')
  const [capacidad, setCapacidad] = useState(4)
  const [ubicacion, setUbicacion] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let unsub
    import('../../services/tableService').then(({ subscribeToTables }) => {
      unsub = subscribeToTables((data) => {
        setTables(data)
        setLoadingList(false)
      })
    }).catch(err => {
      console.error(err)
      setLoadingList(false)
    })
    return () => { if (unsub) unsub() }
  }, [])

  useEffect(() => {
    if (editTable) {
      setNombre(editTable.nombre || '')
      setCapacidad(editTable.capacidad || 4)
      setUbicacion(editTable.ubicacion || '')
      setObservaciones(editTable.observaciones || '')
    } else {
      setNombre('')
      setCapacidad(4)
      setUbicacion('')
      setObservaciones('')
    }
  }, [editTable])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return onError('El nombre de la mesa es obligatorio.')
    setSaving(true)
    try {
      const { createTable, updateTable } = await import('../../services/tableService')
      const payload = {
        nombre: nombre.trim(),
        capacidad: Number(capacidad),
        ubicacion: ubicacion.trim(),
        observaciones: observaciones.trim(),
      }

      if (editTable) {
        await updateTable(editTable.id, payload)
        onSuccess('Mesa actualizada correctamente.')
        setEditTable(null)
      } else {
        await createTable(payload)
        onSuccess('Mesa creada correctamente.')
        setNombre('')
        setCapacidad(4)
        setUbicacion('')
        setObservaciones('')
      }
    } catch (err) {
      console.error(err)
      onError('Error al guardar la mesa.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (table) => {
    if (window.confirm(`¿Estás seguro de eliminar la ${table.nombre}?`)) {
      try {
        const { deleteTable } = await import('../../services/tableService')
        await deleteTable(table.id)
        onSuccess('Mesa eliminada correctamente.')
        if (editTable?.id === table.id) setEditTable(null)
      } catch (err) {
        onError('Error al eliminar la mesa.')
      }
    }
  }

  return (
    <div className="p-5 sm:p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: Listado de Mesas */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-1.5">
              <LayoutGrid size={14} className="text-primary" />
              Mesas del Salón ({tables.length})
            </p>
            {editTable && (
              <button
                onClick={() => setEditTable(null)}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <Plus size={12} /> Nueva Mesa
              </button>
            )}
          </div>

          {loadingList ? (
            <div className="flex items-center justify-center p-8 bg-surface-2/40 rounded-2xl border border-app">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : tables.length === 0 ? (
            <div className="p-6 bg-surface-2/40 rounded-2xl border border-dashed border-app text-center">
              <LayoutGrid size={32} className="mx-auto text-muted/50 mb-2" />
              <p className="text-sm font-semibold text-app">No hay mesas configuradas</p>
              <p className="text-xs text-muted mt-1">Usa el formulario lateral para agregar tu primera mesa.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className={`p-4 bg-surface-2/70 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    editTable?.id === table.id ? 'border-primary ring-1 ring-primary' : 'border-app hover:border-app-hover'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-app text-sm truncate">{table.nombre}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{
                         background: table.estado === 'disponible' ? '#34d39922' : table.estado === 'ocupada' ? '#fb923c22' : '#f8717122',
                         color: table.estado === 'disponible' ? '#34d399' : table.estado === 'ocupada' ? '#fb923c' : '#f87171'
                      }}>
                        {table.estado === 'solicitando_cuenta' ? 'Cuenta' : table.estado}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">Capacidad: {table.capacidad} personas · Zona: {table.ubicacion || 'General'}</p>
                    {table.observaciones && <p className="text-[11px] text-muted italic mt-1 truncate">📍 {table.observaciones}</p>}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setQrTable(table)}
                      className="w-8 h-8 rounded-lg bg-surface border border-app hover:border-app-hover flex items-center justify-center text-muted hover:text-app transition-colors shadow-sm"
                      title="Generar QR Autoservicio"
                    >
                      <QrCode size={14} className="text-primary animate-pulse" />
                    </button>

                    <button
                      onClick={() => setEditTable(table)}
                      className="w-8 h-8 rounded-lg bg-surface border border-app hover:border-app-hover flex items-center justify-center text-muted hover:text-app transition-colors shadow-sm"
                      title="Editar mesa"
                    >
                      <Paintbrush size={14} />
                    </button>

                    <button
                      onClick={() => handleDelete(table)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-colors shadow-sm"
                      title="Eliminar mesa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Formulario Crear / Editar */}
        <div className="lg:col-span-5">
          <div className="bg-surface rounded-2xl border border-app p-5 space-y-4 shadow-sm">
            <p className="text-sm font-bold text-app">{editTable ? 'Editar Mesa' : 'Agregar Nueva Mesa'}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Nombre / Identificador</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Mesa 1, Barra 2"
                  className="w-full h-10 px-3 rounded-xl border border-app bg-surface-2 focus:border-primary/40 outline-none text-sm text-app transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Capacidad (Personas)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={capacidad}
                  onChange={(e) => setCapacidad(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-app bg-surface-2 focus:border-primary/40 outline-none text-sm text-app transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Ubicación / Zona</label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej. Terraza, Salón Principal"
                  className="w-full h-10 px-3 rounded-xl border border-app bg-surface-2 focus:border-primary/40 outline-none text-sm text-app transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Observaciones</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows="2"
                  className="w-full p-3 rounded-xl border border-app bg-surface-2 focus:border-primary/40 outline-none text-sm text-app transition-colors resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                {editTable && (
                  <button
                    type="button"
                    onClick={() => setEditTable(null)}
                    className="flex-1 h-10 bg-surface-2 hover:bg-surface border border-app text-app rounded-xl font-bold text-xs transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 bg-primary text-white rounded-xl font-bold text-xs hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <><Save size={14} /> {editTable ? 'Actualizar' : 'Guardar'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de Código QR de Mesa */}
      <AnimatePresence>
        {qrTable && (
          <TableQRModal
            table={qrTable}
            onClose={() => setQrTable(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── COMPONENTE FORMULARIO DE EMPLEADO (CRUD) ──────────────────────────────

function EmployeeFormCard({ onSuccess, onError }) {
  const editEmp = window.editEmployeeState

  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('vendedor')
  const [pin, setPin] = useState('')
  const [telefono, setTelefono] = useState('')
  const [salario, setSalario] = useState(0)
  const [frecuenciaPago, setFrecuenciaPago] = useState('quincenal')
  const [fechaPago, setFechaPago] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [activo, setActivo] = useState(true)
  const [loading, setLoading] = useState(false)

  // Cargar datos si estamos editando
  useEffect(() => {
    if (editEmp) {
      setNombre(editEmp.nombre || '')
      setRol(editEmp.rol || 'vendedor')
      setPin(editEmp.pin || '')
      setTelefono(editEmp.telefono || '')
      setSalario(editEmp.salario || 0)
      setFrecuenciaPago(editEmp.frecuenciaPago || 'quincenal')
      setFechaPago(editEmp.fechaPago || '')
      setObservaciones(editEmp.observaciones || '')
      setActivo(editEmp.activo !== false)
    } else {
      setNombre('')
      setRol('vendedor')
      setPin('')
      setTelefono('')
      setSalario(0)
      setFrecuenciaPago('quincenal')
      setFechaPago('')
      setObservaciones('')
      setActivo(true)
    }
  }, [editEmp])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return onError('El nombre es obligatorio.')
    if (!pin.trim()) return onError('El código PIN es obligatorio.')
    if (pin.length < 4 || pin.length > 6 || isNaN(Number(pin))) {
      return onError('El PIN debe ser un número de 4 a 6 dígitos.')
    }

    setLoading(true)
    try {
      const { saveEmployee } = await import('../../services/employeeService')
      const payload = {
        id: editEmp?.id,
        nombre: nombre.trim(),
        rol,
        pin: pin.trim(),
        telefono: telefono.trim(),
        salario: Number(salario) || 0,
        frecuenciaPago,
        fechaPago,
        observaciones: observaciones.trim(),
        activo,
        createdAt: editEmp?.createdAt || null
      }
      await saveEmployee(payload)
      onSuccess(editEmp ? 'Empleado actualizado correctamente.' : 'Empleado creado correctamente.')
      window.setEditEmployee(null)
    } catch (err) {
      console.error(err)
      onError('Error al guardar el empleado.')
    } finally {
      setLoading(false)
    }
  }

  const rolOptions = Object.entries(PORTAL_CONFIG).map(([key, cfg]) => ({
    value: key,
    label: `${cfg.emoji} ${cfg.labelCorto} (${cfg.label})`
  }))

  const frecuenciaOptions = [
    { value: 'mensual', label: 'Mensual' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'semanal', label: 'Semanal' }
  ]

  return (
    <form onSubmit={handleSave} className="p-5 rounded-2xl border border-app bg-surface-2 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-app pb-3">
        <p className="text-sm font-bold text-app flex items-center gap-1.5">
          <User size={16} className="text-primary" />
          {editEmp ? 'Editar Perfil de Empleado' : 'Registrar Nuevo Empleado'}
        </p>
        {editEmp && (
          <button
            type="button"
            onClick={() => window.setEditEmployee(null)}
            className="text-xs text-muted hover:text-app hover:underline font-medium"
          >
            Cancelar
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Nombre completo */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Nombre Completo *</label>
          <input
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Juan Pérez"
            className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Teléfono Móvil (WhatsApp)</label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej. +573001234567"
            className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Rol Operativo (CustomSelect) */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Rol Operativo (Portal) *</label>
          <CustomSelect
            value={rol}
            onChange={setRol}
            options={rolOptions}
            placeholder="Seleccionar rol"
          />
        </div>

        {/* PIN de seguridad */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Código PIN Táctil (4-6 dígitos) *</label>
          <input
            type="password"
            maxLength={6}
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej. 1234"
            className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors tracking-widest font-mono"
          />
        </div>

        {/* Nómina y Salarios */}
        <div className="p-3 bg-surface rounded-xl border border-app space-y-3">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Configuración de Nómina y Salario</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-muted mb-1">Salario Fijo</label>
              <input
                type="number"
                min="0"
                value={salario || ''}
                onChange={(e) => setSalario(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="Monto"
                className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-app text-xs text-app focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted mb-1">Frecuencia</label>
              <CustomSelect
                value={frecuenciaPago}
                onChange={setFrecuenciaPago}
                options={frecuenciaOptions}
                placeholder="Frecuencia"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted mb-1">Próxima Fecha de Pago</label>
            <CustomDatePicker
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              placeholder="Próximo día de pago"
            />
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Observaciones / Datos adicionales</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Detalles sobre el turno, horario, etc..."
            className="w-full min-h-[60px] p-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Save size={16} />
        )}
        {editEmp ? 'Actualizar Datos de Empleado' : 'Registrar y Guardar Empleado'}
      </button>
    </form>
  )
}






// Componente helper para bloquear el scroll en el body cuando un modal está abierto
function ThemeModalLock({ children }) {
  useEffect(() => {
    // Guardar el overflow original
    const originalStyle = window.getComputedStyle(document.body).overflow
    // Desactivar scroll
    document.body.style.overflow = 'hidden'
    return () => {
      // Restaurar original
      document.body.style.overflow = originalStyle
    }
  }, [])

  return <>{children}</>
}

// Helper para fusionar profundamente la configuración de Optimización Comercial con los valores por defecto del estándar
const mergeCommercialOptimization = (firestoreConfig) => {
  return {
    enabled: true, // Siempre en true para que las sub-herramientas activas se apliquen
    tools: {
      smartTags: {
        enabled: firestoreConfig?.tools?.smartTags?.enabled ?? true,
        bestSeller: {
          enabled: firestoreConfig?.tools?.smartTags?.bestSeller?.enabled ?? true,
          text: firestoreConfig?.tools?.smartTags?.bestSeller?.text || 'Más Vendido',
          bg: firestoreConfig?.tools?.smartTags?.bestSeller?.bg || '#ef4444',
          textCol: firestoreConfig?.tools?.smartTags?.bestSeller?.textCol || '#ffffff',
          style: firestoreConfig?.tools?.smartTags?.bestSeller?.style || 'pill',
          minSales: firestoreConfig?.tools?.smartTags?.bestSeller?.minSales ?? 5
        },
        unmissableOffer: {
          enabled: firestoreConfig?.tools?.smartTags?.unmissableOffer?.enabled ?? true,
          text: firestoreConfig?.tools?.smartTags?.unmissableOffer?.text || 'Oferta Imperdible',
          bg: firestoreConfig?.tools?.smartTags?.unmissableOffer?.bg || '#f59e0b',
          textCol: firestoreConfig?.tools?.smartTags?.unmissableOffer?.textCol || '#ffffff',
          style: firestoreConfig?.tools?.smartTags?.unmissableOffer?.style || 'pill'
        },
        lastUnit: {
          enabled: firestoreConfig?.tools?.smartTags?.lastUnit?.enabled ?? true,
          text: firestoreConfig?.tools?.smartTags?.lastUnit?.text || 'Última Unidad',
          bg: firestoreConfig?.tools?.smartTags?.lastUnit?.bg || '#3b82f6',
          textCol: firestoreConfig?.tools?.smartTags?.lastUnit?.textCol || '#ffffff',
          style: firestoreConfig?.tools?.smartTags?.lastUnit?.style || 'pill',
          threshold: firestoreConfig?.tools?.smartTags?.lastUnit?.threshold ?? 3
        },
        newProduct: {
          enabled: firestoreConfig?.tools?.smartTags?.newProduct?.enabled ?? true,
          text: firestoreConfig?.tools?.smartTags?.newProduct?.text || 'Nuevo',
          bg: firestoreConfig?.tools?.smartTags?.newProduct?.bg || '#10b981',
          textCol: firestoreConfig?.tools?.smartTags?.newProduct?.textCol || '#ffffff',
          style: firestoreConfig?.tools?.smartTags?.newProduct?.style || 'pill',
          daysLimit: firestoreConfig?.tools?.smartTags?.newProduct?.daysLimit ?? 7
        }
      },
      advancedGallery: {
        enabled: firestoreConfig?.tools?.advancedGallery?.enabled ?? true
      },
      visualVariations: {
        enabled: firestoreConfig?.tools?.visualVariations?.enabled ?? true
      },
      variationIndicators: {
        enabled: firestoreConfig?.tools?.variationIndicators?.enabled ?? true
      },
      cartRecommendations: {
        enabled: firestoreConfig?.tools?.cartRecommendations?.enabled ?? true,
        title: firestoreConfig?.tools?.cartRecommendations?.title || 'Recomendado para ti'
      },
      historyRecommendations: {
        enabled: firestoreConfig?.tools?.historyRecommendations?.enabled ?? true
      }
    }
  }
}

export default function AdminSettings() {
  const config = useAppConfigStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { logout } = useAuthStore()
  const { rawInstallable, handleInstall } = usePWAInstall()
  
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  const isStandalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
  
  // States para Developer Zone
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  // Autenticación de Desarrollador
  const [isDevAuthenticated, setIsDevAuthenticated] = useState(false)
  const [devPinInput, setDevPinInput] = useState('')
  const [devPinError, setDevPinError] = useState(false)
  const [confirmRestoreText, setConfirmRestoreText] = useState('')

  // Navegación de secciones (null = menú principal)
  const [activeSection, setActiveSection] = useState(null)
  const [activeSubSection, setActiveSubSection] = useState(null) // null | 'empleados' | 'entregas'
  const [isCommercialSectionExpanded, setIsCommercialSectionExpanded] = useState(false)
  const [isFormInitialized, setIsFormInitialized] = useState(false)
  const { metrics: billingMetrics, isLoading: billingLoading, savePercent, isSaving: billingIsSaving } = useBilling()
  const { data: orders = [] } = useOrders()
  const [commissionInput, setCommissionInput] = useState(null)
  const [animatedValues, setAnimatedValues] = useState({ totalMes: 0, comisionMes: 0, pedidosMes: 0, comisionHistorica: 0 })

  // Reporte automático de telemetría de facturación al panel central del desarrollador
  useEffect(() => {
    if (!billingLoading && billingMetrics) {
      const now = new Date()
      const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      reportMonthlyBillingToDeveloper(
        billingMetrics.totalMes || 0,
        billingMetrics.commissionPercent || 1,
        periodo
      )
    }
  }, [billingLoading, billingMetrics])

  // ─── FIRMA Y FACTURACIÓN DESARROLLADOR ─────────────────────────────────────
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef(null)

  const startDrawing = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000000'
    
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX)
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY)
    if (!clientX || !clientY) return

    const x = clientX - rect.left
    const y = clientY - rect.top
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX)
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY)
    if (!clientX || !clientY) return

    const x = clientX - rect.left
    const y = clientY - rect.top
    
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const handleExportDeveloperReceiptPDF = () => {
    try {
      const canvas = canvasRef.current
      if (!canvas) {
        console.error("Canvas ref is null")
        return
      }
      const signatureDataUrl = canvas.toDataURL('image/png')
      exportDeveloperReceiptPDF({ signatureDataUrl, orders, config, billingMetrics })
      setIsSignatureModalOpen(false)
    } catch (error) {
      console.error("Error al exportar el recibo en PDF:", error)
      alert("Error al generar el PDF: " + error.message)
    }
  }

  // Escuchar evento personalizado de la barra de navegación para regresar al menú de configuración principal
  useEffect(() => {
    const handleReset = () => {
      setActiveSection(null)
      setActiveSubSection(null)
    }
    window.addEventListener('reset-settings-menu', handleReset)
    return () => {
      window.removeEventListener('reset-settings-menu', handleReset)
    }
  }, [])

  // States para Configuración del Negocio
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  // States para Seguridad (Cambio de credenciales)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState(null)
  
  // Estado del Modal de Tema
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [isSeasonalDropdownOpen, setIsSeasonalDropdownOpen] = useState(false)

  // ─── MODAL CONFIRMACIÓN CRÍTICA (Fase 5) ────────────────────────────────
  const [criticalConfirmModal, setCriticalConfirmModal] = useState(null) // null | { title, desc, onConfirm }
  const [criticalConfirmText, setCriticalConfirmText] = useState('')

  // ─── PUBLICIDAD Y ANUNCIOS ──────────────────────────────────────────
  const { data: ads = [], isLoading: isLoadingAds } = useAds()
  const { data: products = [] } = useProducts()
  const createMutation = useCreateAd()
  const updateMutation = useUpdateAd()
  const deleteMutation = useDeleteAd()

  const [showAdForm, setShowAdForm] = useState(false)
  const [editingAdId, setEditingAdId] = useState(null)
  const [adToDelete, setAdToDelete] = useState(null)
  const [adFormData, setAdFormData] = useState({
    type: 'inventory',
    active: true,
    productId: '',
    discountType: 'percentage',
    discountValue: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    customTitle: '',
    customBanner: '',
    glowEffect: false,
    title: '',
    description: '',
    image: '',
    banner: '',
    colors: { bg: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', text: '#ffffff' },
    ctaText: 'Ver promoción',
    ctaAction: 'modal',
    ctaValue: '',
    category: '',
    isTemporalProduct: false,
    price: 0,
    promoPrice: 0,
  })

  const handleSaveAd = () => {
    if (adFormData.type === 'inventory' && !adFormData.productId) {
      alert('Por favor selecciona un producto')
      return
    }
    if (adFormData.type === 'custom' && !adFormData.title) {
      alert('Por favor ingresa un título')
      return
    }

    // Validar máximo 5 anuncios activos
    if (adFormData.active) {
      const activeCount = ads.filter(a => a.active && a.id !== editingAdId).length
      if (activeCount >= 5) {
        alert('Límite alcanzado: Sólo puedes tener un máximo de 5 publicidades activas de forma simultánea. Desactiva otra publicidad para poder activar esta.')
        return
      }
    }

    const payload = {
      type: adFormData.type,
      active: adFormData.active,
      startDate: adFormData.startDate,
      endDate: adFormData.endDate,
    }

    if (adFormData.type === 'inventory') {
      payload.productId = adFormData.productId
      payload.discountType = adFormData.discountType
      payload.discountValue = Number(adFormData.discountValue)
      payload.customTitle = adFormData.customTitle || ''
      payload.customBanner = adFormData.customBanner || ''
      payload.glowEffect = adFormData.glowEffect || false
    } else {
      payload.title = adFormData.title
      payload.description = adFormData.description || ''
      payload.image = adFormData.image || ''
      payload.banner = adFormData.banner || ''
      payload.colors = adFormData.colors || { bg: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', text: '#ffffff' }
      payload.ctaText = adFormData.ctaText || 'Ver promoción'
      payload.ctaAction = adFormData.ctaAction || 'modal'
      payload.ctaValue = adFormData.ctaValue || ''
      payload.category = adFormData.category || ''
      payload.isTemporalProduct = adFormData.isTemporalProduct || false
      if (adFormData.isTemporalProduct) {
        payload.price = Number(adFormData.price) || 0
        payload.promoPrice = Number(adFormData.promoPrice) || 0
      }
    }

    if (editingAdId) {
      updateMutation.mutate({ id: editingAdId, data: payload }, {
        onSuccess: () => {
          setShowAdForm(false)
          setEditingAdId(null)
        }
      })
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setShowAdForm(false)
        }
      })
    }
  }

  // ─── GESTIÓN DE CUPONES DE DESCUENTO ─────────────────────────────────
  const { data: coupons = [], isLoading: isLoadingCoupons } = useCoupons()
  const createCouponMutation = useCreateCoupon()
  const updateCouponMutation = useUpdateCoupon()
  const deleteCouponMutation = useDeleteCoupon()

  const [showCouponForm, setShowCouponForm] = useState(false)
  const [editingCouponId, setEditingCouponId] = useState(null)
  const [couponToDelete, setCouponToDelete] = useState(null)
  const [couponFormData, setCouponFormData] = useState({
    code: '',
    type: 'percentage', // percentage | fixed
    value: '',
    minPurchase: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    active: true
  })

  // Mapa de usos de cupones: { 'CODIGO': número_de_pedidos }
  const couponUsageMap = useMemo(() => {
    const map = {}
    orders.forEach(order => {
      if (order.couponCode) {
        const code = order.couponCode.toUpperCase()
        map[code] = (map[code] || 0) + 1
      }
    })
    return map
  }, [orders])

  const handleSaveCoupon = () => {
    if (!couponFormData.code) {
      alert('Ingresa el código del cupón')
      return
    }
    if (!couponFormData.value || Number(couponFormData.value) <= 0) {
      alert('Ingresa un valor de descuento válido mayor a 0')
      return
    }

    const payload = {
      code: couponFormData.code.toUpperCase().trim(),
      type: couponFormData.type,
      value: Number(couponFormData.value),
      minPurchase: Number(couponFormData.minPurchase || 0),
      startDate: couponFormData.startDate,
      endDate: couponFormData.endDate,
      active: couponFormData.active
    }

    if (editingCouponId) {
      updateCouponMutation.mutate({ id: editingCouponId, data: payload }, {
        onSuccess: () => {
          setShowCouponForm(false)
          setEditingCouponId(null)
        }
      })
    } else {
      createCouponMutation.mutate(payload, {
        onSuccess: () => {
          setShowCouponForm(false)
        }
      })
    }
  }

  const [formData, setFormData] = useState(() => {
    const state = useAppConfigStore.getState()
    return {
      appName: state.appName || '',
      sellerName: state.sellerName || '',
      appIcon: state.appIcon || '',
      pwaAppName: state.pwaAppName || '',
      pwaAppIcon: state.pwaAppIcon || '',
      pwaUseBrandIcon: state.pwaUseBrandIcon || false,
      theme: state.theme || 'rosa-elegante',
      activeSeasonalEvent: state.activeSeasonalEvent || 'none',
      whatsappAdmin: state.whatsappAdmin || '',
      bankInfo: {
        banco: state.bankInfo?.banco || '',
        tipoCuenta: state.bankInfo?.tipoCuenta || 'ahorros',
        numeroCuenta: state.bankInfo?.numeroCuenta || '',
        titular: state.bankInfo?.titular || '',
        cedulaNit: state.bankInfo?.cedulaNit || '',
        qrUrl: state.bankInfo?.qrUrl || ''
      },
      bankInfo2: {
        activa: state.bankInfo2?.activa || false,
        banco: state.bankInfo2?.banco || '',
        tipoCuenta: state.bankInfo2?.tipoCuenta || 'ahorros',
        numeroCuenta: state.bankInfo2?.numeroCuenta || '',
        titular: state.bankInfo2?.titular || '',
        cedulaNit: state.bankInfo2?.cedulaNit || '',
        qrUrl: state.bankInfo2?.qrUrl || ''
      },
      catalogFilters: state.catalogFilters || {
        categories: true,
        sizes: true,
        colors: true,
        customAttributes: []
      },
      appFont: state.appFont || 'inter',
      appRadius: state.appRadius || 'rounded',
      catalogBanner: state.catalogBanner || { type: 'none', value: '' },
      catalogLayout: state.catalogLayout || 'grid2',
      animationsEnabled: state.animationsEnabled ?? true,
      guidedModeEnabled: state.guidedModeEnabled ?? true,
      actionColor: state.actionColor || '',
      welcomeWavesEnabled: state.welcomeWavesEnabled ?? true,
      loginTrustMessage: state.loginTrustMessage || '',
      slogan: state.slogan || '',
      hasMultipleEmployees: state.hasMultipleEmployees ?? false,
      employeeCount: state.employeeCount ?? 0,
      employees: state.employees ?? [],
      deliverySettings: state.deliverySettings || {
        pickup: { enabled: true, address: '', instructions: 'Recoge tu pedido directamente en nuestro local.' },
        shipping: { enabled: true, cost: 0, estimatedTime: '30 a 60 min', instructions: 'Recibe tu pedido en la comodidad de tu casa.' },
        digital: { enabled: false, instructions: 'Entrega digital o prestación de servicio presencial.' }
      },
      wholesaleSettings: state.wholesaleSettings || {
        enabled: true,
        minQuantity: 12,
        discountType: 'percentage', // 'percentage' | 'fixed'
        discountValue: 15
      },
      catalogMode: state.catalogMode || 'standard',
      claimsEnabled: state.claimsEnabled ?? false,
      orderTrackingEnabled: state.orderTrackingEnabled ?? false,
      developerPhone: state.developerPhone || '',
      creditsEnabled: state.creditsEnabled ?? true,
      couponsEnabled: state.couponsEnabled ?? true,
      trackingWaTemplate: state.trackingWaTemplate || '',
      appPromo: state.appPromo || {
        enabled: false,
        title: '',
        message: '',
        androidUrl: '',
        iosUrl: '',
        promoImageUrl: ''
      },
      tablesEnabled: state.tablesEnabled ?? false,
      commercialOptimization: mergeCommercialOptimization(state.commercialOptimization)
    }
  })

  // Sincronizar store local con formulario al cargar
  const [dbEmployees, setDbEmployees] = useState([])
  const [editEmployeeState, setEditEmployeeState] = useState(null)

  // Exponer al scope global para que EmployeeFormCard pueda sincronizarse limpiamente
  window.editEmployeeState = editEmployeeState
  window.setEditEmployee = setEditEmployeeState

  useEffect(() => {
    if (config.isLoaded) {
      let unsub
      import('../../services/employeeService').then(({ subscribeToEmployees }) => {
        unsub = subscribeToEmployees(setDbEmployees)
      }).catch(console.error)
      return () => { if (unsub) unsub() }
    }
  }, [config.isLoaded])

  useEffect(() => {
    if (config.isLoaded && !isFormInitialized) {
      setFormData({
        appName: config.appName || '',
        sellerName: config.sellerName || '',
        appIcon: config.appIcon || '',
        pwaAppName: config.pwaAppName || '',
        pwaAppIcon: config.pwaAppIcon || '',
        pwaUseBrandIcon: config.pwaUseBrandIcon || false,
        theme: config.theme || 'rosa-elegante',
        activeSeasonalEvent: config.activeSeasonalEvent || 'none',
        whatsappAdmin: config.whatsappAdmin || '',
        bankInfo: {
          banco: config.bankInfo?.banco || '',
          tipoCuenta: config.bankInfo?.tipoCuenta || 'ahorros',
          numeroCuenta: config.bankInfo?.numeroCuenta || '',
          titular: config.bankInfo?.titular || '',
          cedulaNit: config.bankInfo?.cedulaNit || '',
          qrUrl: config.bankInfo?.qrUrl || ''
        },
        bankInfo2: {
          activa: config.bankInfo2?.activa || false,
          banco: config.bankInfo2?.banco || '',
          tipoCuenta: config.bankInfo2?.tipoCuenta || 'ahorros',
          numeroCuenta: config.bankInfo2?.numeroCuenta || '',
          titular: config.bankInfo2?.titular || '',
          cedulaNit: config.bankInfo2?.cedulaNit || '',
          qrUrl: config.bankInfo2?.qrUrl || ''
        },
        catalogFilters: config.catalogFilters || {
          categories: true,
          sizes: true,
          colors: true,
          customAttributes: []
        },
        appFont: config.appFont || 'inter',
        appRadius: config.appRadius || 'rounded',
        catalogBanner: config.catalogBanner || { type: 'none', value: '' },
        catalogLayout: config.catalogLayout || 'grid2',
        animationsEnabled: config.animationsEnabled ?? true,
        guidedModeEnabled: config.guidedModeEnabled ?? true,
        actionColor: config.actionColor || '',
        welcomeWavesEnabled: config.welcomeWavesEnabled ?? true,
        loginTrustMessage: config.loginTrustMessage || '',
        slogan: config.slogan || '',
        hasMultipleEmployees: config.hasMultipleEmployees ?? false,
        employeeCount: config.employeeCount ?? 0,
        employees: config.employees ?? [],
        deliverySettings: config.deliverySettings || {
          pickup: { enabled: true, address: '', instructions: 'Recoge tu pedido directamente en nuestro local.' },
          shipping: { enabled: true, cost: 0, estimatedTime: '30 a 60 min', instructions: 'Recibe tu pedido en la comodidad de tu casa.' },
          digital: { enabled: false, instructions: 'Entrega digital o prestación de servicio presencial.' }
        },
        wholesaleSettings: config.wholesaleSettings || {
          enabled: true,
          minQuantity: 12,
          discountType: 'percentage', // 'percentage' | 'fixed'
          discountValue: 15
        },
        catalogMode: config.catalogMode || 'standard',
        claimsEnabled: config.claimsEnabled ?? false,
        orderTrackingEnabled: config.orderTrackingEnabled ?? false,
        developerPhone: config.developerPhone || '',
        creditsEnabled: config.creditsEnabled ?? true,
        couponsEnabled: config.couponsEnabled ?? true,
        trackingWaTemplate: config.trackingWaTemplate || '',
        appPromo: config.appPromo || {
          enabled: false,
          title: '',
          message: '',
          androidUrl: '',
          iosUrl: '',
          promoImageUrl: ''
        },
        tablesEnabled: config.tablesEnabled ?? false,
        commercialOptimization: mergeCommercialOptimization(config.commercialOptimization)
      })
      setIsFormInitialized(true)
    }
  }, [config.isLoaded, isFormInitialized, config])

  // Efecto para preview en tiempo real de la paleta
  useEffect(() => {
    // Si formData.theme aún no está listo, no hacer nada
    if (!formData.theme) return

    const root = document.documentElement
    const activeColors = getActiveColors(formData.theme, config.isDarkMode, formData.activeSeasonalEvent)
    
    Object.entries(activeColors).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    return () => {
      // Al desmontar, restaurar el tema oficial guardado
      const originalColors = getActiveColors(config.theme, config.isDarkMode, config.activeSeasonalEvent)
      Object.entries(originalColors).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })
    }
  }, [formData.theme, formData.activeSeasonalEvent, config.isDarkMode, config.theme, config.activeSeasonalEvent])

  // Guardar configuración en Firebase
  const handleSaveConfig = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      // Guardar configuración general
      await updateAppConfig(formData)

      // Guardar filtros de catálogo en su documento independiente
      if (formData.catalogFilters) {
        await updateCatalogFilters(formData.catalogFilters)
      }

      config.setConfig(formData)
      setIsFormInitialized(false)
      setSaveMessage({ type: 'success', text: 'Configuraciones guardadas y aplicadas a toda la aplicación.' })
      setTimeout(() => setSaveMessage(null), 4000)
    } catch (error) {
      console.error(error)
      setSaveMessage({ type: 'error', text: 'Ocurrió un error al guardar las configuraciones.' })
    } finally {
      setIsSaving(false)
    }
  }

  // Cerrar Sesión
  const handleLogout = async () => {
    try {
      await signOutAdmin()
      logout()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Actualizar Credenciales de Administrador
  const handleUpdateCredentials = async (e) => {
    e.preventDefault()
    if (!currentPassword) {
      setAuthMessage({ type: 'error', text: 'Debes ingresar tu contraseña actual por seguridad.' })
      return
    }
    if (!newEmail && !newPassword) {
      setAuthMessage({ type: 'error', text: 'Ingresa un nuevo correo o contraseña para actualizar.' })
      return
    }

    setAuthLoading(true)
    setAuthMessage(null)

    try {
      await updateAdminCredentials({ currentPassword, newEmail, newPassword })
      setAuthMessage({ type: 'success', text: 'Credenciales actualizadas exitosamente.' })
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      console.error(err)
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthMessage({ type: 'error', text: 'La contraseña actual es incorrecta.' })
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthMessage({ type: 'error', text: 'El nuevo correo ya está registrado.' })
      } else if (err.code === 'auth/invalid-email') {
        setAuthMessage({ type: 'error', text: 'El formato del nuevo correo es inválido.' })
      } else {
        setAuthMessage({ type: 'error', text: err.message || 'Error al actualizar credenciales.' })
      }
    } finally {
      setAuthLoading(false)
    }
  }

  // Activar modo personalizado
  const toggleCustomMode = () => {
    if (typeof formData.theme === 'object') {
      // Volver a predefinida
      setFormData({ ...formData, theme: 'rosa-elegante' })
    } else {
      // Convertir a objeto personalizado basado en el actual
      const basePalette = ADVANCED_PALETTES[formData.theme] || ADVANCED_PALETTES['rosa-elegante']
      setFormData({
        ...formData,
        theme: {
          light: { ...basePalette.light },
          dark: { ...basePalette.dark }
        }
      })
    }
  }

  // Manejar cambio en color personalizado
  const handleCustomColorChange = (key, value) => {
    const mode = config.isDarkMode ? 'dark' : 'light'
    setFormData({
      ...formData,
      theme: {
        ...formData.theme,
        [mode]: { ...formData.theme[mode], [key]: value }
      }
    })
  }

  // Custom Attributes Handlers
  const handleAddCustomAttribute = () => {
    const current = formData.catalogFilters.customAttributes || []
    setFormData({
      ...formData,
      catalogFilters: {
        ...formData.catalogFilters,
        customAttributes: [...current, { id: 'attr-' + Date.now(), name: '', type: 'text' }]
      }
    })
  }

  const handleCustomAttributeChange = (index, field, value) => {
    const updated = [...(formData.catalogFilters.customAttributes || [])]
    if (field === 'options') {
      // Allow spaces while typing by keeping the raw string in UI state if needed, but for simplicity:
      // In a real app we might want a controlled state, but splitting by comma works for basic usage.
      // Wait, if they type "a, ", they won't see the space. Let's just store the array.
      updated[index].options = value.split(',').map(s => s.trimStart())
    } else {
      updated[index][field] = value
      if (field === 'type' && value === 'select') {
        updated[index].options = []
      }
    }
    setFormData({
      ...formData,
      catalogFilters: { ...formData.catalogFilters, customAttributes: updated }
    })
  }

  const handleRemoveCustomAttribute = (index) => {
    const updated = [...(formData.catalogFilters.customAttributes || [])]
    updated.splice(index, 1)
    setFormData({
      ...formData,
      catalogFilters: { ...formData.catalogFilters, customAttributes: updated }
    })
  }

  // Developer Zone handlers - Restauración real de la aplicación a cero
  const handleFullReset = async () => {
    if (confirmRestoreText !== 'RESTAURAR') return
    if (!window.confirm('¿Estás COMPLETAMENTE SEGURO de restaurar la aplicación? Se eliminarán de forma REAL y permanente todos los productos, categorías, pedidos, créditos, cupones, anuncios y usuarios (excepto tu cuenta de administrador actual). Esta acción no se puede deshacer.')) return

    setLoading(true)
    setMessage({ type: 'success', text: 'Restaurando base de datos a cero (borrado real)...' })

    try {
      const collectionsToClean = [
        COLLECTIONS.PRODUCTS,
        COLLECTIONS.CATEGORIES,
        COLLECTIONS.ORDERS,
        COLLECTIONS.CREDITS,
        'coupons',
        'ads'
      ]

      const deletedCount = await resetAppData(collectionsToClean, 'sergioaagudeloh@gmail.com')

      setConfirmRestoreText('')
      setMessage({ type: 'success', text: `¡Restauración exitosa! Se eliminaron un total de ${deletedCount} registros de negocio de forma permanente. La aplicación está lista en cero.` })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Error al restaurar la aplicación: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  // ─── Definición de secciones del menú ──────────────────────────────────────
  const MENU_SECTIONS = [
    {
      id: 'cupones',
      label: 'Cupones de Descuento',
      description: 'Genera códigos promocionales y ofertas',
      icon: Tag,
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-500',
    },
    {
      id: 'publicidad',
      label: 'Publicidad y Promociones',
      description: 'Gestiona banners y promociones híbridas',
      icon: Megaphone,
      iconBg: 'bg-pink-500/10',
      iconColor: 'text-pink-500',
    },
    {
      id: 'marca',
      label: 'Identidad de Marca',
      description: 'Nombre de la tienda y logo',
      icon: Building2,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      id: 'personalizar',
      label: 'Personalizar Tienda',
      description: 'Configura el personal de ventas y opciones de la tienda',
      icon: Sparkles,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      id: 'apariencia',
      label: 'Apariencia y Colores',
      description: 'Tema, paleta y modo oscuro',
      icon: Paintbrush,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      id: 'ventas',
      label: 'Ventas y Transferencias',
      description: 'WhatsApp y datos bancarios',
      icon: Smartphone,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
    {
      id: 'seguridad',
      label: 'Seguridad y Accesos',
      description: 'Cambiar correo o contraseña',
      icon: Lock,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
    },
    {
      id: 'developer',
      label: 'Herramientas de Desarrollador',
      description: 'Facturación, restauración y filtros avanzados del catálogo',
      icon: Settings,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
    },
    {
      id: 'pwa',
      label: 'Descargar Aplicación',
      description: 'Instalar en este dispositivo',
      icon: Download,
      iconBg: 'bg-teal-500/10',
      iconColor: 'text-teal-500',
    },
  ]

  // ─── Control de Acceso del Desarrollador (Gate) ───────────────────────────
  const renderDeveloperGate = () => {
    const handleSubmit = (e) => {
      e.preventDefault()
      if (devPinInput === DEV_PIN) {
        setIsDevAuthenticated(true)
        setDevPinError(false)
      } else {
        setDevPinError(true)
      }
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto p-6 bg-surface rounded-3xl border border-app shadow-xl mt-8"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3.5">
            <KeyRound size={24} />
          </div>
          <h3 className="text-base font-black text-app">Zona Protegida de Desarrollador</h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Ingresa el PIN maestro del desarrollador para acceder a la facturación y herramientas internas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-app mb-1.5 block text-center">PIN de Seguridad (4 dígitos)</label>
            <div className="flex justify-center gap-2.5">
              <input
                type="password"
                maxLength={4}
                value={devPinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '') // Solo números
                  setDevPinInput(val)
                  if (devPinError) setDevPinError(false)
                }}
                placeholder="••••"
                className={`w-28 h-12 text-center rounded-xl bg-surface-2 border text-xl tracking-[0.4em] font-black text-app focus:outline-none focus:border-primary transition-all ${
                  devPinError ? 'border-red-500 focus:border-red-500' : 'border-app'
                }`}
              />
            </div>
            {devPinError && (
              <p className="text-[11px] text-red-500 font-semibold mt-2 text-center">El PIN ingresado es incorrecto.</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-primary text-white font-bold text-sm rounded-xl transition-all active:scale-95 hover:opacity-90 flex items-center justify-center gap-2"
          >
            <KeyRound size={16} /> Desbloquear Sección
          </button>
        </form>
      </motion.div>
    )
  }

  // ─── Previsualizador de Dispositivo Móvil en Tiempo Real ──────────────────
  const renderMobilePreview = () => {
    const currentThemeColors = getActiveColors(formData.theme, config.isDarkMode)
    const primaryColor = currentThemeColors['--color-primary']
    const actionBtnColor = formData.actionColor || primaryColor
    const fontName = FONTS[formData.appFont]?.name || 'Inter'

    return (
      <div 
        className="flex flex-col items-center justify-start lg:col-span-5 sticky top-6 bg-surface-2 p-6 rounded-3xl border border-app h-[580px] w-full mt-6 lg:mt-0"
        style={{ fontFamily: `'${fontName}', sans-serif` }}
      >
        {/* Enlace para cargar la tipografía dinámica de Google Fonts para la vista previa */}
        <link href={`https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;700;900&display=swap`} rel="stylesheet" />

        <div className="text-center mb-4">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">Vista Previa del Cliente</span>
        </div>

        {/* Armazón del Celular */}
        <div className="w-[270px] h-[480px] rounded-[40px] border-[8px] border-slate-800 bg-app shadow-2xl relative overflow-hidden flex flex-col">
          {/* Altavoz/Notch del Celular */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center">
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
          </div>

          {/* 1. Header de la Tienda */}
          <div className="h-12 bg-surface/75 backdrop-blur-md border-b border-app flex items-center justify-between px-3 pt-3 shrink-0 z-40">
            <div className="flex items-center gap-1.5">
              {formData.appIcon ? (
                <img src={formData.appIcon} alt="Logo" className="w-6 h-6 rounded-md object-cover" onError={(e) => { e.target.style.display = 'none' }} />
              ) : (
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                  S
                </div>
              )}
              <span className="text-xs font-black text-app truncate max-w-[100px]">{formData.appName || 'Mi Tienda'}</span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center">
              <ShoppingBag size={14} className="text-primary" />
            </div>
          </div>

          {/* 2. Cuerpo Simulador Catálogo */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-app select-none">
            {/* Banner de Bienvenida simulado si es Marca o Publicidad */}
            <div className="h-24 rounded-xl bg-gradient-to-r from-primary/20 to-primary-focus/10 border border-primary/10 p-3 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-primary/10 blur-lg" />
              <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Colección Nueva</p>
              <p className="text-xs font-black text-app mt-0.5 leading-tight">¡Envíos gratis en compras hoy!</p>
            </div>

            {/* Fila de Tarjetas Ficticias */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface rounded-xl border border-app overflow-hidden p-2 flex flex-col">
                <div className="h-20 bg-surface-2 rounded-lg mb-2 overflow-hidden relative">
                  <img src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=150&auto=format&fit=crop" alt="P" className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] font-black text-app truncate">Camiseta Pro</p>
                <p className="text-[10px] text-muted">$45.000</p>
                {/* Botón Acción en Tiempo Real */}
                <button 
                  className="mt-2 w-full h-6 rounded-md text-[9px] font-bold text-white flex items-center justify-center transition-colors"
                  style={{ backgroundColor: actionBtnColor }}
                >
                  Agregar
                </button>
              </div>

              <div className="bg-surface rounded-xl border border-app overflow-hidden p-2 flex flex-col">
                <div className="h-20 bg-surface-2 rounded-lg mb-2 overflow-hidden relative">
                  <img src="https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=150&auto=format&fit=crop" alt="P" className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] font-black text-app truncate">Cargo Pant</p>
                <p className="text-[10px] text-muted">$120.000</p>
                {/* Botón Acción en Tiempo Real */}
                <button 
                  className="mt-2 w-full h-6 rounded-md text-[9px] font-bold text-white flex items-center justify-center transition-colors"
                  style={{ backgroundColor: actionBtnColor }}
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>

          {/* 3. Barra Navegación Inferior Simulada (Con el botón de ofertas del cliente animado) */}
          <div className="h-12 bg-surface border-t border-app flex items-center justify-around px-2 z-40 shrink-0 select-none pb-1">
            <div className="flex-1 flex flex-col items-center justify-center opacity-40">
              <ShoppingBag size={14} className="text-muted" />
              <span className="text-[8px] font-medium mt-0.5 scale-90">Catálogo</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center opacity-40">
              <Heart size={14} className="text-muted" />
              <span className="text-[8px] font-medium mt-0.5 scale-90">Favoritos</span>
            </div>
            
            {/* Botón Circular de Ofertas */}
            <div className="flex-1 flex flex-col items-center justify-start relative">
              <div className="flex flex-col items-center justify-center -translate-y-2 relative">
                {/* Ondas concéntricas ficticias */}
                <div className="absolute w-10 h-10 rounded-full bg-primary/20 animate-ping" />
                <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-surface bg-primary text-white shadow-md">
                  <Tag size={16} />
                </div>
                <span className="text-[7px] font-black uppercase tracking-wider text-primary scale-90 mt-0.5">
                  Ofertas
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center opacity-40">
              <Package size={14} className="text-muted" />
              <span className="text-[8px] font-medium mt-0.5 scale-90">Pedidos</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center opacity-40">
              <CreditCard size={14} className="text-muted" />
              <span className="text-[8px] font-medium mt-0.5 scale-90">Créditos</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Header compartido (Menú o Sección) ────────────────────────────────────
  const activeInfo = MENU_SECTIONS.find(s => s.id === activeSection)

  return (
    <motion.div
      key={activeSection ?? 'menu'}
      initial={{ opacity: 0, x: activeSection ? 30 : -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`p-4 md:p-8 mx-auto pb-24 overflow-x-hidden relative ${
        activeSection 
          ? (activeSection === 'marca' || activeSection === 'apariencia' ? 'max-w-6xl' : 'max-w-3xl') 
          : 'max-w-2xl'
      }`}
    >
      {/* Toast de guardado renderizado en Portal para evitar brincos de animación */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {saveMessage && (
            <motion.div
              initial={{ opacity: 0, y: -40, x: '-50%', scale: 0.95 }}
              animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
              exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className={`fixed top-4 left-1/2 z-[9999] px-5 py-3.5 rounded-2xl shadow-2xl border border-app bg-surface/95 backdrop-blur-xl flex items-center gap-3.5 w-[calc(100%-2rem)] max-w-sm text-sm font-extrabold transition-colors duration-300 md:left-auto md:right-4 md:translate-x-0 md:initial-none`}
              style={{
                // En desktop sobrescribimos el centrado en x de Tailwind usando variables responsivas
                transform: window.innerWidth >= 768 ? 'none' : undefined,
                left: window.innerWidth >= 768 ? 'auto' : '50%',
              }}
            >
              {saveMessage.type === 'error' ? (
                <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <AlertTriangle size={14} className="stroke-[3]" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <CheckCircle size={14} className="stroke-[3]" />
                </div>
              )}
              <p className="text-app mt-0.5 flex-1">{saveMessage.text}</p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        {activeSection ? (
          <BackButton
            onClick={() => {
              if (activeSubSection) {
                setActiveSubSection(null)
              } else {
                setActiveSection(null)
              }
            }}
            className="hover:bg-primary hover:text-white hover:border-primary shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shrink-0">
            <Settings size={20} className="text-white" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-app">
            {activeSection 
              ? (activeSubSection === 'empleados' 
                  ? 'Gestión de Personal' 
                  : activeSubSection === 'mesas'
                    ? 'Configuración de Mesas'
                  : activeSubSection === 'entregas' 
                    ? 'Métodos de Entrega' 
                    : activeSubSection === 'temporada'
                      ? 'Eventos por Temporada'
                      : activeInfo?.label)
              : 'Configuración'
            }
          </h1>
          <p className="text-sm text-muted">
            {activeSection 
              ? (activeSubSection === 'empleados' 
                  ? 'Configura el personal de ventas' 
                  : activeSubSection === 'mesas'
                    ? 'Agrega y administra las mesas del salón'
                  : activeSubSection === 'entregas' 
                    ? 'Opciones de entrega y retiro físico o digital' 
                    : activeSubSection === 'temporada'
                      ? 'Activa decoraciones y colores especiales'
                      : activeInfo?.description)
              : 'Ajustes de tu tienda'
            }
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: MENÚ PRINCIPAL ─────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {!activeSection && (
        <div className="flex flex-col gap-4">

          {/* ── Tarjeta 1: Tienda ─────────────────────────────────── */}
          <div className="bg-surface rounded-3xl shadow-sm overflow-hidden">
            <p className="text-[10px] font-black text-muted uppercase tracking-widest px-5 pt-4 pb-2">Tienda</p>
            {['cupones', 'publicidad', 'marca', 'personalizar', 'apariencia'].map((id) => {
              const section = MENU_SECTIONS.find(s => s.id === id)
              if (!section) return null
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${section.iconBg}`}>
                    <Icon size={20} className={section.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-app">{section.label}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">{section.description}</p>
                  </div>
                  <ChevronRight size={18} className="text-muted shrink-0" />
                </button>
              )
            })}
          </div>

          {/* ── Tarjeta 2: Gestión ────────────────────────────────── */}
          <div className="bg-surface rounded-3xl shadow-sm overflow-hidden">
            <p className="text-[10px] font-black text-muted uppercase tracking-widest px-5 pt-4 pb-2">Gestión</p>
            {['ventas', 'seguridad'].map((id) => {
              const section = MENU_SECTIONS.find(s => s.id === id)
              if (!section) return null
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${section.iconBg}`}>
                    <Icon size={20} className={section.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-app">{section.label}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">{section.description}</p>
                  </div>
                  <ChevronRight size={18} className="text-muted shrink-0" />
                </button>
              )
            })}
          </div>

          {/* ── Tarjeta 3: Sistema ────────────────────────────────── */}
          <div className="bg-surface rounded-3xl shadow-sm overflow-hidden">
            <p className="text-[10px] font-black text-muted uppercase tracking-widest px-5 pt-4 pb-2">Sistema</p>
            {['developer', 'pwa'].map((id) => {
              const section = MENU_SECTIONS.find(s => s.id === id)
              if (!section) return null
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${section.iconBg}`}>
                    <Icon size={20} className={section.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-app">{section.label}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">{section.description}</p>
                  </div>
                  <ChevronRight size={18} className="text-muted shrink-0" />
                </button>
              )
            })}
          </div>

        </div>
      )}

      {/* Botón Cerrar Sesión (solo en menú principal) */}
      {!activeSection && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 font-bold hover:bg-red-500/10 transition-all active:scale-95"
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: IDENTIDAD DE MARCA ─────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'marca' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="bg-surface rounded-3xl shadow-sm overflow-hidden lg:col-span-7 flex flex-col">
            <div className="p-5 sm:p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-app mb-2">Nombre del Negocio</label>
                <input
                  type="text"
                  value={formData.appName}
                  onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                  placeholder="Ej. Mi Tienda Smart"
                  className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-app mb-2">Nombre del Vendedor</label>
                <input
                  type="text"
                  value={formData.sellerName}
                  onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                  placeholder="Ej. Sergio"
                  className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-app mb-2 flex items-center gap-2">
                  WhatsApp para Pedidos
                  <span className="text-xs font-normal text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-app">Sin el "+"</span>
                </label>
                <input
                  type="tel"
                  value={formData.whatsappAdmin}
                  onChange={(e) => setFormData({ ...formData, whatsappAdmin: e.target.value })}
                  placeholder="Ej. 573001234567"
                  className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-app mb-2">URL del Logo</label>
                <div className="flex gap-3 items-center">
                  <div className="relative flex-1">
                    <Link size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={formData.appIcon}
                      onChange={(e) => setFormData({ ...formData, appIcon: e.target.value })}
                      placeholder="https://ejemplo.com/logo.png"
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  {formData.appIcon && (
                    <div className="w-12 h-12 rounded-xl border border-app bg-surface overflow-hidden shrink-0">
                      <img src={formData.appIcon} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-app mb-2">Mensaje de confianza en el Login</label>
                <input
                  type="text"
                  value={formData.loginTrustMessage}
                  onChange={(e) => setFormData({ ...formData, loginTrustMessage: e.target.value })}
                  placeholder="Ej. Tu tienda de confianza"
                  className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-app mb-2">Eslogan de la tienda (Aparece bajo el logo en el Login)</label>
                <input
                  type="text"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  placeholder="Ej. Lencería y Accesorios para Ti"
                  className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app md:col-span-2">
                <div>
                  <p className="text-sm font-bold text-app">Ondas animadas en el Logotipo</p>
                  <p className="text-xs text-muted mt-0.5">Efecto sonar animado detrás de tu logotipo en pantallas de bienvenida</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input type="checkbox" className="sr-only peer"
                    checked={formData.welcomeWavesEnabled}
                    onChange={(e) => setFormData({ ...formData, welcomeWavesEnabled: e.target.checked })} />
                  <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                </label>
              </div>

              {/* ─── CONFIGURACIÓN DE APLICACIÓN MÓVIL (PWA) ─── */}
              <div className="border-t border-app pt-5 md:col-span-2 space-y-4">
                <h3 className="text-sm font-black text-primary tracking-wider uppercase">
                  Configuración de Aplicación Móvil (PWA)
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Define el nombre y el icono con el que se instalará la aplicación en la pantalla de inicio del celular de tus clientes.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                      <div>
                        <p className="text-sm font-bold text-app">Usar logo de la tienda como ícono de la app</p>
                        <p className="text-xs text-muted mt-0.5">Se colocará el logo de tu tienda centrado sobre un fondo con el color principal de la marca</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                        <input type="checkbox" className="sr-only peer"
                          checked={formData.pwaUseBrandIcon}
                          onChange={(e) => setFormData({ ...formData, pwaUseBrandIcon: e.target.checked })} />
                        <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-app mb-2 uppercase tracking-wider">Nombre de la App Móvil</label>
                    <input
                      type="text"
                      value={formData.pwaAppName}
                      onChange={(e) => setFormData({ ...formData, pwaAppName: e.target.value })}
                      placeholder="Ej. Moni App"
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors text-sm"
                    />
                  </div>

                  <div>
                    {!formData.pwaUseBrandIcon ? (
                      <>
                        <label className="block text-xs font-bold text-app mb-2 uppercase tracking-wider">URL del Icono de Instalación (PWA)</label>
                        <div className="flex gap-3 items-center">
                          <div className="relative flex-1">
                            <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                              type="text"
                              value={formData.pwaAppIcon}
                              onChange={(e) => setFormData({ ...formData, pwaAppIcon: e.target.value })}
                              placeholder="https://ejemplo.com/icono.png"
                              className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors text-sm"
                            />
                          </div>
                          {formData.pwaAppIcon && (
                            <div className="w-12 h-12 rounded-xl border border-app bg-surface overflow-hidden shrink-0">
                              <img src={formData.pwaAppIcon} alt="Preview PWA" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="block text-xs font-bold text-app mb-2 uppercase tracking-wider">Vista Previa del Icono PWA</label>
                        <div className="flex gap-4 items-center p-3 bg-surface-2 rounded-xl border border-app">
                          <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center p-2.5 shadow-md shrink-0 transition-all duration-300"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          >
                            {formData.appIcon ? (
                              <img src={formData.appIcon} alt="Icono Tienda" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-white/20 animate-pulse" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-app">{formData.pwaAppName || formData.appName || 'Mi Aplicación'}</p>
                            <p className="text-[10px] text-muted">Generado dinámicamente</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>
            <div className="p-5 border-t border-app bg-surface-2/30">
              <button
                onClick={async () => {
                  try {
                    await updateAppConfig({ 
                      appIcon: formData.appIcon, 
                      appName: formData.appName, 
                      sellerName: formData.sellerName,
                      whatsappAdmin: formData.whatsappAdmin || '',
                      welcomeWavesEnabled: formData.welcomeWavesEnabled ?? true,
                      loginTrustMessage: formData.loginTrustMessage || '',
                      slogan: formData.slogan || '',
                      pwaAppName: formData.pwaAppName || '',
                      pwaAppIcon: formData.pwaAppIcon || '',
                      pwaUseBrandIcon: formData.pwaUseBrandIcon || false
                    })
                    setSaveMessage({ type: 'success', text: 'Identidad de marca y PWA guardados correctamente.' })
                    setTimeout(() => setSaveMessage(null), 3000)
                  } catch (e) {
                    setSaveMessage({ type: 'error', text: 'Error al actualizar.' })
                  }
                }}
                className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <Save size={18} /> Guardar Cambios
              </button>
            </div>
          </div>
          {renderMobilePreview()}
        </div>
      )}

      {/* ─── VISTA: PERSONALIZAR TIENDA ────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'personalizar' && (
        activeSubSection === null ? (
          <div className="bg-surface rounded-3xl border border-app shadow-sm flex flex-col relative p-6">
            <p className="text-sm text-muted mb-4">Selecciona una categoría para comenzar a personalizar tu tienda:</p>
            
            <div className="divide-y divide-app">
              
              {/* Gestión de Personal */}
              <button
                onClick={() => setActiveSubSection('empleados')}
                className="w-full flex items-center gap-4 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10">
                  <User size={20} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-app">Gestión de Personal</p>
                  <p className="text-xs text-muted mt-0.5">Configura empleados, vendedores and el registro de ventas en el POS.</p>
                </div>
                <ChevronRight size={18} className="text-muted shrink-0" />
              </button>

              {/* Métodos de Entrega */}
              <button
                onClick={() => setActiveSubSection('entregas')}
                className="w-full flex items-center gap-4 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-green-500/10">
                  <Truck size={20} className="text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-app">Métodos de Entrega</p>
                  <p className="text-xs text-muted mt-0.5">Establece retiros en local, envíos a domicilio, costos and entregas digitales.</p>
                </div>
                <ChevronRight size={18} className="text-muted shrink-0" />
              </button>

              {/* Ventas al por Mayor */}
              <button
                onClick={() => setActiveSubSection('mayorista')}
                className="w-full flex items-center gap-4 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-violet-500/10">
                  <Percent size={20} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-app">Ventas al por Mayor</p>
                  <p className="text-xs text-muted mt-0.5">Configura la cantidad mínima, el tipo de descuento and el valor de mayoreo.</p>
                </div>
                <ChevronRight size={18} className="text-muted shrink-0" />
              </button>

              {/* Eventos por Temporada */}
              <button
                onClick={() => setActiveSubSection('temporada')}
                className="w-full flex items-center gap-4 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-pink-500/10">
                  <Calendar size={20} className="text-pink-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-app">Eventos por Temporada</p>
                  <p className="text-xs text-muted mt-0.5">Activa temas visuales especiales (Navidad, Halloween, Día de la Madre/Padre).</p>
                </div>
                <ChevronRight size={18} className="text-muted shrink-0" />
              </button>

              {/* Garantías y Reclamos */}
              <button
                onClick={() => setActiveSubSection('garantias')}
                className="w-full flex items-center gap-4 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-orange-500/10">
                  <Shield size={20} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-app">Garantías y Reclamos</p>
                  <p className="text-xs text-muted mt-0.5">Permite a tus clientes iniciar reclamos o solicitar cambios sobre pedidos completados.</p>
                </div>
                <ChevronRight size={18} className="text-muted shrink-0" />
              </button>

              {/* Seguimiento de Pedidos */}
              <button
                onClick={() => setActiveSubSection('seguimiento')}
                className="w-full flex items-center gap-4 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-teal-500/10">
                  <Package size={20} className="text-teal-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-app">Seguimiento de Pedidos</p>
                  <p className="text-xs text-muted mt-0.5">Permite a tus clientes seguir sus pedidos en tiempo real por WhatsApp sin iniciar sesión.</p>
                </div>
                <ChevronRight size={18} className="text-muted shrink-0" />
              </button>

              {/* Módulos Activos */}
              <button
                onClick={() => setActiveSubSection('modulos')}
                className="w-full flex items-center gap-4 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-500/10">
                  <ToggleLeft size={20} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-app">Módulos Activos</p>
                  <p className="text-xs text-muted mt-0.5">Configura and activa/desactiva los módulos del negocio (Crédito, Reclamos, Cupones, Mayoreo).</p>
                </div>
                <ChevronRight size={18} className="text-muted shrink-0" />
              </button>

              {/* Configuración de Mesas */}
              {formData.tablesEnabled && (
                <button
                  onClick={() => setActiveSubSection('mesas')}
                  className="w-full flex items-center gap-4 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10">
                    <LayoutGrid size={20} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-app">Configuración de Mesas</p>
                    <p className="text-xs text-muted mt-0.5">Configura las mesas del restaurante/salón para el Portal de Mesero.</p>
                  </div>
                  <ChevronRight size={18} className="text-muted shrink-0" />
                </button>
              )}

            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-3xl border border-app shadow-sm flex flex-col relative">

            {/* SUBSECCIÓN FORM: Configuración de Mesas */}
            {activeSubSection === 'mesas' && (
              <AdminTablesCRUD
                onSuccess={(msg) => {
                  setSaveMessage({ type: 'success', text: msg })
                  setTimeout(() => setSaveMessage(null), 3000)
                }}
                onError={(msg) => {
                  setSaveMessage({ type: 'error', text: msg })
                  setTimeout(() => setSaveMessage(null), 3000)
                }}
              />
            )}

            {/* SUBSECCIÓN FORM: Gestión de Personal */}
            {activeSubSection === 'empleados' && (
              <>
                <div className="p-5 sm:p-6 space-y-6">
                  {/* Interruptor Principal */}
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-app">Múltiples Empleados</p>
                      <p className="text-xs text-muted mt-0.5">Activa esta opción si tu negocio cuenta con personal operativo o de ventas</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input type="checkbox" className="sr-only peer"
                        checked={formData.hasMultipleEmployees}
                        onChange={async (e) => {
                          const checked = e.target.checked
                          setFormData({ ...formData, hasMultipleEmployees: checked })
                          try {
                            await updateAppConfig({ hasMultipleEmployees: checked })
                            setSaveMessage({ type: 'success', text: checked ? 'Módulo de empleados activado.' : 'Módulo de empleados desactivado.' })
                            setTimeout(() => setSaveMessage(null), 3000)
                          } catch (err) {
                            console.error(err)
                          }
                        }} />
                      <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>

                  {formData.hasMultipleEmployees && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* COLUMNA IZQUIERDA: Listado de Empleados (7 cols) */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-1.5">
                            <Users size={14} className="text-primary" />
                            Personal Registrado ({dbEmployees.length})
                          </p>
                          {/* Botón rápido para limpiar selección y añadir nuevo */}
                          <button
                            onClick={() => {
                              // Resetear formulario de edición/creación
                              document.getElementById('emp-form-card')?.scrollIntoView({ behavior: 'smooth' })
                              window.setEditEmployee(null)
                            }}
                            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                          >
                            <Plus size={12} /> Nuevo Empleado
                          </button>
                        </div>

                        {dbEmployees.length === 0 ? (
                          <div className="p-6 bg-surface-2/40 rounded-2xl border border-dashed border-app text-center">
                            <Users size={32} className="mx-auto text-muted/50 mb-2" />
                            <p className="text-sm font-semibold text-app">No hay empleados registrados</p>
                            <p className="text-xs text-muted mt-1">Usa el formulario lateral para agregar tu primer empleado.</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            {dbEmployees.map((emp) => {
                              const portal = PORTAL_CONFIG[emp.rol] || { emoji: '👤', labelCorto: emp.rol, color: 'var(--color-primary)' }
                              return (
                                <div
                                  key={emp.id}
                                  className={`p-4 bg-surface-2/70 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                    window.editEmployeeState?.id === emp.id ? 'border-primary ring-1 ring-primary' : 'border-app hover:border-app-hover'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-lg border border-app shrink-0 shadow-sm">
                                      {portal.emoji}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-app">{emp.nombre}</p>
                                        {!emp.activo && (
                                          <span className="text-[10px] bg-red-500/10 text-red-500 font-bold px-1.5 py-0.5 rounded-full">Inactivo</span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-xs text-muted">
                                        <span className="font-medium" style={{ color: portal.color }}>
                                          {portal.labelCorto}
                                        </span>
                                        <span>•</span>
                                        <span>PIN: <strong className="text-app tracking-widest">{emp.pin}</strong></span>
                                        <span>•</span>
                                        <span>{formatCurrency(emp.salario)} ({emp.frecuenciaPago})</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-app">
                                    {/* Toggle de Activo */}
                                    <button
                                      onClick={async () => {
                                        try {
                                          const nextActive = !emp.activo
                                          const { toggleEmployeeStatus } = await import('../../services/employeeService')
                                          await toggleEmployeeStatus(emp.id, nextActive)
                                          setSaveMessage({ type: 'success', text: `Empleado ${nextActive ? 'activado' : 'desactivado'} correctamente.` })
                                          setTimeout(() => setSaveMessage(null), 2500)
                                        } catch (err) {
                                          setSaveMessage({ type: 'error', text: 'Error al cambiar estado.' })
                                        }
                                      }}
                                      className={`h-7 px-2.5 rounded-lg font-bold text-[10px] border flex items-center justify-center gap-1 transition-all ${
                                        emp.activo 
                                          ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20' 
                                          : 'bg-surface border-app text-muted hover:bg-surface-2'
                                      }`}
                                    >
                                      {emp.activo ? 'Activo' : 'Inactivo'}
                                    </button>

                                    {/* Botón Editar */}
                                    <button
                                      onClick={() => {
                                        window.setEditEmployee(emp)
                                        document.getElementById('emp-form-card')?.scrollIntoView({ behavior: 'smooth' })
                                      }}
                                      className="w-8 h-8 rounded-lg bg-surface border border-app hover:border-app-hover flex items-center justify-center text-muted hover:text-app transition-colors shadow-sm"
                                      title="Editar empleado"
                                    >
                                      <Paintbrush size={14} />
                                    </button>

                                    {/* Botón Eliminar */}
                                    <button
                                      onClick={async () => {
                                        if (window.confirm(`¿Estás seguro de eliminar a ${emp.nombre}? Esta acción no se puede deshacer.`)) {
                                          try {
                                            const { deleteEmployee } = await import('../../services/employeeService')
                                            await deleteEmployee(emp.id)
                                            setSaveMessage({ type: 'success', text: 'Empleado eliminado correctamente.' })
                                            setTimeout(() => setSaveMessage(null), 2500)
                                            if (window.editEmployeeState?.id === emp.id) {
                                              window.setEditEmployee(null)
                                            }
                                          } catch (err) {
                                            setSaveMessage({ type: 'error', text: 'Error al eliminar.' })
                                          }
                                        }
                                      }}
                                      className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-colors shadow-sm"
                                      title="Eliminar empleado"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* COLUMNA DERECHA: Formulario Crear / Editar (5 cols) */}
                      <div id="emp-form-card" className="lg:col-span-5">
                        <EmployeeFormCard
                          onSuccess={(msg) => {
                            setSaveMessage({ type: 'success', text: msg })
                            setTimeout(() => setSaveMessage(null), 3000)
                          }}
                          onError={(msg) => {
                            setSaveMessage({ type: 'error', text: msg })
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-app bg-surface-2/30">
                  {/* Panel QR dinámico si Múltiples Empleados está activado */}
                  {formData.hasMultipleEmployees && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <QrCode size={18} className="text-primary" />
                        <h3 className="text-sm font-bold text-app">Códigos QR de Acceso Operativo</h3>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        Los empleados pueden escanear estos códigos QR para ser redirigidos directamente al lobby táctil de su respectivo rol sin navegar por la web pública.
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                        {Object.entries(PORTAL_CONFIG).map(([rol, cfg]) => {
                          const count = dbEmployees.filter(e => e.rol === rol && e.activo !== false).length
                          return (
                            <PortalQRCard
                              key={rol}
                              rol={rol}
                              cfg={cfg}
                              employeeCount={count}
                              baseUrl={window.location.origin}
                            />
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              </>
            )}

            {/* SUBSECCIÓN FORM: Métodos de Entrega */}
            {activeSubSection === 'entregas' && (
              <>
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Retiro en Local */}
                  <div className="p-4 bg-surface-2/60 rounded-2xl border border-app space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-app">Retiro en Tienda / Local</p>
                        <p className="text-xs text-muted">Permite al cliente retirar el pedido físicamente</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" className="sr-only peer"
                          checked={formData.deliverySettings?.pickup?.enabled ?? true}
                          onChange={(e) => setFormData({
                            ...formData,
                            deliverySettings: {
                              ...formData.deliverySettings,
                              pickup: { ...(formData.deliverySettings?.pickup || {}), enabled: e.target.checked }
                            }
                          })} />
                        <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>

                    {(formData.deliverySettings?.pickup?.enabled ?? true) && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2">
                        {/* Selector de Mapa para el local del negocio */}
                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-muted mb-2">Ubicación del Local en el Mapa</label>
                          <LeafletMapPicker
                            address={formData.deliverySettings?.pickup?.address || ''}
                            coords={formData.deliverySettings?.pickup?.coords || null}
                            onChange={({ address, coords }) => {
                              setFormData(prev => ({
                                ...prev,
                                deliverySettings: {
                                  ...prev.deliverySettings,
                                  pickup: {
                                    ...(prev.deliverySettings?.pickup || {}),
                                    address: address || (prev.deliverySettings?.pickup?.address || ''),
                                    coords
                                  }
                                }
                              }))
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted mb-1">Dirección de Retiro (Manual)</label>
                          <input
                            type="text"
                            value={formData.deliverySettings?.pickup?.address || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              deliverySettings: {
                                ...formData.deliverySettings,
                                pickup: { ...(formData.deliverySettings?.pickup || {}), address: e.target.value }
                              }
                            })}
                            placeholder="Ej. Calle 10 # 4-50, Centro"
                            className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted mb-1">Instrucciones de recogida</label>
                          <input
                            type="text"
                            value={formData.deliverySettings?.pickup?.instructions || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              deliverySettings: {
                                ...formData.deliverySettings,
                                pickup: { ...(formData.deliverySettings?.pickup || {}), instructions: e.target.value }
                              }
                            })}
                            placeholder="Ej. Acercarse a caja con el número de pedido"
                            className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Domicilio / Envío */}
                  <div className="p-4 bg-surface-2/60 rounded-2xl border border-app space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-app">Envío a Domicilio</p>
                        <p className="text-xs text-muted">Permite despachar pedidos a la dirección del cliente</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" className="sr-only peer"
                          checked={formData.deliverySettings?.shipping?.enabled ?? true}
                          onChange={(e) => setFormData({
                            ...formData,
                            deliverySettings: {
                              ...formData.deliverySettings,
                              shipping: { ...(formData.deliverySettings?.shipping || {}), enabled: e.target.checked }
                            }
                          })} />
                        <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>
                  </div>

                  {/* Entrega Digital */}
                  <div className="p-4 bg-surface-2/60 rounded-2xl border border-app space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-app">Servicios / Entrega Digital</p>
                        <p className="text-xs text-muted">Adecuado para servicios presenciales o productos virtuales</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" className="sr-only peer"
                          checked={formData.deliverySettings?.digital?.enabled ?? false}
                          onChange={(e) => setFormData({
                            ...formData,
                            deliverySettings: {
                              ...formData.deliverySettings,
                              digital: { ...(formData.deliverySettings?.digital || {}), enabled: e.target.checked }
                            }
                          })} />
                        <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>

                    {(formData.deliverySettings?.digital?.enabled ?? false) && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-muted mb-1">Instrucciones</label>
                          <input
                            type="text"
                            value={formData.deliverySettings?.digital?.instructions || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              deliverySettings: {
                                ...formData.deliverySettings,
                                digital: { ...(formData.deliverySettings?.digital || {}), instructions: e.target.value }
                              }
                            })}
                            placeholder="Ej. Te enviaremos el enlace por WhatsApp"
                            className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Mensajero Propio */}
                  <DeliveryCustomMessengerPanel formData={formData} setFormData={setFormData} />

                </div>

                <div className="p-5 border-t border-app bg-surface-2/30">
                  <button
                    onClick={async () => {
                      try {
                        const pEnabled = formData.deliverySettings?.pickup?.enabled ?? true;
                        const sEnabled = formData.deliverySettings?.shipping?.enabled ?? true;
                        const dEnabled = formData.deliverySettings?.digital?.enabled ?? false;
                        if (!pEnabled && !sEnabled && !dEnabled) {
                          setSaveMessage({ type: 'error', text: 'Debes habilitar al menos un método de entrega.' })
                          return;
                        }

                        await updateAppConfig({ 
                          deliverySettings: formData.deliverySettings || null
                        })
                        setSaveMessage({ type: 'success', text: 'Métodos de entrega guardados correctamente.' })
                        setTimeout(() => setSaveMessage(null), 3000)
                      } catch (e) {
                        setSaveMessage({ type: 'error', text: 'Error al guardar.' })
                      }
                    }}
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    <Save size={18} /> Guardar Métodos de Entrega
                  </button>
                </div>
              </>
            )}

            {/* SUBSECCIÓN FORM: Ventas al por Mayor */}
            {activeSubSection === 'mayorista' && (
              <>
                <div className="p-5 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                    <div>
                      <p className="text-sm font-bold text-app">Activar Solicitudes al por Mayor</p>
                      <p className="text-xs text-muted mt-0.5">Permite a los clientes solicitar cotizaciones y precios mayoristas en el catálogo</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input type="checkbox" className="sr-only peer"
                        checked={formData.wholesaleSettings?.enabled ?? true}
                        onChange={(e) => setFormData({
                          ...formData,
                          wholesaleSettings: {
                            ...(formData.wholesaleSettings || {}),
                            enabled: e.target.checked
                          }
                        })} />
                      <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>
                </div>

                <div className="p-5 border-t border-app bg-surface-2/30">
                  <button
                    onClick={async () => {
                      try {
                        await updateAppConfig({ 
                          wholesaleSettings: {
                            enabled: formData.wholesaleSettings?.enabled ?? true
                          }
                        })
                        setSaveMessage({ type: 'success', text: 'Configuración de venta al por mayor guardada correctamente.' })
                        setTimeout(() => setSaveMessage(null), 3000)
                      } catch (e) {
                        setSaveMessage({ type: 'error', text: 'Error al guardar la configuración.' })
                      }
                    }}
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    <Save size={18} /> Guardar Configuración de Mayoreo
                  </button>
                </div>
              </>
            )}

            {/* SUBSECCIÓN FORM: Eventos por Temporada */}
            {activeSubSection === 'temporada' && (
              <>
                <div className="p-5 sm:p-6 space-y-6">
                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-app uppercase tracking-wider">Selecciona una Temporada Activa</label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto p-2.5 pr-2">
                      {[
                        { id: 'none', label: 'Ninguno (Tema normal)', desc: 'Desactiva efectos visuales extras', emoji: '✨', colors: [] },
                        { id: 'navidad', label: 'Navidad', desc: 'Rojos y verdes navideños', emoji: '🎄', colors: ['#d32f2f', '#388e3c'] },
                        { id: 'halloween', label: 'Halloween', desc: 'Naranjas y morados mágicos', emoji: '🎃', colors: ['#f57c00', '#7b1fa2'] },
                        { id: 'madre', label: 'Día de la Madre', desc: 'Rosados y fucsias maternales', emoji: '🌸', colors: ['#ec407a', '#ab47bc'] },
                        { id: 'padre', label: 'Día del Padre', desc: 'Azul clásico y gris cuero', emoji: '👔', colors: ['#0288d1', '#455a64'] },
                        { id: 'nino', label: 'Día del Niño', desc: 'Amarillo alegre y celeste pastel', emoji: '🧸', colors: ['#fbc02d', '#29b6f6'] },
                        { id: 'amistad', label: 'Amor y Amistad', desc: 'Rojos pasión y rosa suave', emoji: '❤️', colors: ['#e91e63', '#f48fb1'] },
                        { id: 'verano', label: 'Verano', desc: 'Amarillo brillante y turquesa playa', emoji: '☀️', colors: ['#ffeb3b', '#00bcd4'] },
                        { id: 'semanasanta', label: 'Semana Santa', desc: 'Morados litúrgicos y blanco lino', emoji: '🌾', colors: ['#673ab7', '#eae6df'] },
                        { id: 'mascota', label: 'Día de la Mascota', desc: 'Cafés y beige cálidos', emoji: '🐾', colors: ['#8d6e63', '#d7ccc8'] }
                      ].map((evt) => {
                        const isActive = (formData.activeSeasonalEvent || 'none') === evt.id
                        return (
                          <motion.button
                            key={evt.id}
                            type="button"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setFormData({ ...formData, activeSeasonalEvent: evt.id })}
                            className={`p-4 rounded-2xl text-left flex gap-4 items-start transition-all duration-300 relative outline-none focus:outline-none ${
                              isActive 
                                ? 'bg-primary/[0.04]' 
                                : 'bg-surface-2 hover:bg-surface-2/60'
                            }`}
                            style={{ 
                              border: 'none', 
                              outline: 'none', 
                              boxShadow: isActive ? '0 0 16px 2px color-mix(in srgb, var(--color-primary) 35%, transparent)' : 'none' 
                            }}
                          >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                              isActive ? 'bg-primary/10' : 'bg-surface'
                            }`}>
                              <span className="text-xl">{evt.emoji}</span>
                            </div>
                            
                            <div className="flex-1 min-w-0 pr-8">
                              <p className={`font-bold text-xs mb-0.5 transition-colors ${isActive ? 'text-primary' : 'text-app'}`}>
                                {evt.label}
                              </p>
                              <p className="text-[10px] text-muted leading-relaxed line-clamp-2">
                                {evt.desc}
                              </p>
                            </div>

                            <div className="absolute right-4 top-4 flex gap-1">
                              {evt.colors.map((c, i) => (
                                <span 
                                  key={i} 
                                  className="w-3.5 h-3.5 rounded-full border border-app/30 shadow-sm shrink-0"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>

                  {formData.activeSeasonalEvent && formData.activeSeasonalEvent !== 'none' && (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3.5 items-start">
                      <div className="text-xl mt-0.5">ℹ️</div>
                      <div className="text-xs text-muted leading-relaxed">
                        <p className="font-bold text-primary mb-0.5">Modo de Temporada Activo</p>
                        Esta opción aplica una paleta de colores especial a toda la aplicación para tus clientes sin modificar tu tema base. Al desactivarlo, tu tienda volverá a sus colores predefinidos.
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-app bg-surface-2/30">
                  <button
                    onClick={async () => {
                      try {
                        await updateAppConfig({ 
                          activeSeasonalEvent: formData.activeSeasonalEvent || 'none'
                        })
                        config.setConfig({
                          activeSeasonalEvent: formData.activeSeasonalEvent || 'none'
                        })
                        setSaveMessage({ type: 'success', text: 'Evento por temporada guardado y aplicado correctamente.' })
                        setTimeout(() => setSaveMessage(null), 3000)
                      } catch (e) {
                        setSaveMessage({ type: 'error', text: 'Error al guardar la temporada.' })
                      }
                    }}
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    <Save size={18} /> Guardar Cambios de Temporada
                  </button>
                </div>
              </>
            )}

            {/* SUBSECCIÓN FORM: Garantías y Reclamos */}
            {activeSubSection === 'garantias' && (
              <>
                <div className="p-5 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                    <div>
                      <p className="text-sm font-bold text-app">Activar Garantías y Reclamos</p>
                      <p className="text-xs text-muted mt-0.5">Permite a tus clientes iniciar reclamos o solicitar cambios sobre sus pedidos completados</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input type="checkbox" className="sr-only peer"
                        checked={formData.claimsEnabled ?? false}
                        onChange={(e) => setFormData({ ...formData, claimsEnabled: e.target.checked })} />
                      <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>
                </div>

                <div className="p-5 border-t border-app bg-surface-2/30">
                  <button
                    onClick={async () => {
                      try {
                        await updateAppConfig({ 
                          claimsEnabled: formData.claimsEnabled ?? false
                        })
                        config.setConfig({
                          claimsEnabled: formData.claimsEnabled ?? false
                        })
                        setSaveMessage({ type: 'success', text: 'Configuración de garantías guardada correctamente.' })
                        setTimeout(() => setSaveMessage(null), 3000)
                      } catch (e) {
                        setSaveMessage({ type: 'error', text: 'Error al guardar.' })
                      }
                    }}
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    <Save size={18} /> Guardar Configuración de Garantías
                  </button>
                </div>
              </>
            )}

            {/* SUBSECCIÓN FORM: Seguimiento de Pedidos */}
            {activeSubSection === 'seguimiento' && (
              <>
                <div className="p-5 sm:p-6 space-y-6">
                  
                  {/* Switch General */}
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app shadow-xs">
                    <div>
                      <p className="text-sm font-bold text-app">Activar Seguimiento de Pedidos</p>
                      <p className="text-xs text-muted mt-0.5">Habilita un portal público y genera enlaces de WhatsApp automáticos para que los clientes sigan sus pedidos en tiempo real</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input type="checkbox" className="sr-only peer"
                        checked={formData.orderTrackingEnabled ?? false}
                        onChange={(e) => setFormData({ ...formData, orderTrackingEnabled: e.target.checked })} />
                      <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>

                  {/* Panel Configuración Plantilla WhatsApp */}
                  {formData.orderTrackingEnabled && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-surface rounded-2xl border border-app shadow-xs space-y-4"
                    >
                      <div className="flex items-center gap-2 border-b border-app pb-2">
                        <MessageSquare size={16} className="text-primary" />
                        <h4 className="text-xs font-bold text-app uppercase tracking-wider">Mensaje de WhatsApp para Clientes</h4>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-semibold text-muted">Plantilla de Mensaje de Seguimiento</label>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                trackingWaTemplate: "¡Hola {cliente}! Muchas gracias por tu compra. 😊\n\nTu pedido *{pedido}* está en estado *{estado}* (Total: {total}).\n\nPuedes consultar su preparación y envío en tiempo real ingresando a nuestra aplicación, en la sección de *'Mis Pedidos'* y presionando el botón *'🚀 Ver Seguimiento en Tiempo Real'* en la tarjeta de tu compra.\n\n¡Gracias por confiar en *{tienda}*!"
                              })
                            }}
                            className="text-[10px] font-black text-primary hover:underline cursor-pointer border-none bg-transparent"
                          >
                            🔄 Restablecer Predeterminada
                          </button>
                        </div>
                        <textarea
                          rows={6}
                          value={formData.trackingWaTemplate}
                          onChange={(e) => setFormData({ ...formData, trackingWaTemplate: e.target.value })}
                          placeholder="Hola {cliente}, tu pedido {pedido} está..."
                          className="w-full p-3 rounded-xl border border-app bg-surface-2 focus:border-primary/40 outline-none text-xs text-app leading-relaxed transition-colors resize-none"
                        />
                        
                        {/* Chips de variables sugeridas para inserción rápida */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Etiquetas dinámicas disponibles (Toca para insertar):</p>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { label: '{cliente}', desc: 'Nombre cliente', val: '{cliente}' },
                              { label: '{pedido}', desc: '# Pedido', val: '{pedido}' },
                              { label: '{estado}', desc: 'Estado', val: '{estado}' },
                              { label: '{tienda}', desc: 'Nombre Tienda', val: '{tienda}' },
                              { label: '{total}', desc: 'Total Pedido', val: '{total}' },
                              { label: '{enlace}', desc: 'URL Seguimiento', val: '{enlace}' }
                            ].map(tag => (
                              <button
                                key={tag.label}
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    trackingWaTemplate: (formData.trackingWaTemplate || '') + tag.val
                                  })
                                }}
                                className="px-2.5 py-1 bg-surface-2 hover:bg-surface-3 border border-app rounded-lg text-[10px] font-mono font-bold text-muted hover:text-app transition-colors cursor-pointer"
                                title={tag.desc}
                              >
                                {tag.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Panel Promoción de Aplicación Oficial */}
                  {formData.orderTrackingEnabled && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-surface rounded-2xl border border-app shadow-xs space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-app pb-2">
                        <div className="flex items-center gap-2">
                          <Megaphone size={16} className="text-primary" />
                          <h4 className="text-xs font-bold text-app uppercase tracking-wider">Promoción de Aplicación PWA (Instalación Directa)</h4>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" className="sr-only peer"
                            checked={formData.appPromo?.enabled ?? false}
                            onChange={(e) => setFormData({
                              ...formData,
                              appPromo: { ...(formData.appPromo || {}), enabled: e.target.checked }
                            })} />
                          <div className="w-9 h-5 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                        </label>
                      </div>

                      {formData.appPromo?.enabled && (
                        <div className="space-y-4 pt-1">
                          {/* Banner título y mensaje */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-muted mb-1">Título del Banner</label>
                              <input
                                type="text"
                                value={formData.appPromo?.title || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  appPromo: { ...(formData.appPromo || {}), title: e.target.value }
                                })}
                                placeholder="Ej: ¡Instala nuestra App!"
                                className="w-full h-10 px-3 rounded-xl bg-surface-2 border border-app text-xs text-app focus:outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-muted mb-1">Imagen del Banner (URL)</label>
                              <input
                                type="text"
                                value={formData.appPromo?.promoImageUrl || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  appPromo: { ...(formData.appPromo || {}), promoImageUrl: e.target.value }
                                })}
                                placeholder="https://ejemplo.com/icon.png"
                                className="w-full h-10 px-3 rounded-xl bg-surface-2 border border-app text-xs text-app focus:outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-muted mb-1">Mensaje Comercial</label>
                            <textarea
                              rows={2.5}
                              value={formData.appPromo?.message || ''}
                              onChange={(e) => setFormData({
                                  ...formData,
                                  appPromo: { ...(formData.appPromo || {}), message: e.target.value }
                              })}
                              placeholder="Describe los beneficios de instalar la aplicación en el dispositivo..."
                              className="w-full p-3 rounded-xl border border-app bg-surface-2 focus:border-primary/40 outline-none text-xs text-app leading-snug transition-colors resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                </div>

                <div className="p-5 border-t border-app bg-surface-2/30">
                  <button
                    onClick={async () => {
                      try {
                        const payload = { 
                          orderTrackingEnabled: formData.orderTrackingEnabled ?? false,
                          trackingWaTemplate: formData.trackingWaTemplate || '',
                          appPromo: formData.appPromo || null
                        }
                        
                        await updateAppConfig(payload)
                        config.setConfig(payload)
                        
                        setSaveMessage({ type: 'success', text: 'Configuración de seguimiento y fidelización guardada correctamente.' })
                        setTimeout(() => setSaveMessage(null), 3000)
                      } catch (e) {
                        setSaveMessage({ type: 'error', text: 'Error al guardar la configuración.' })
                      }
                    }}
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer border-none"
                  >
                    <Save size={18} /> Guardar Configuración de Seguimiento
                  </button>
                </div>
              </>
            )}
            {activeSubSection === 'modulos' && (
              <>
                <div className="p-5 sm:p-6 space-y-5">
                  <p className="text-xs text-muted">Habilita o deshabilita los módulos globales del negocio. Los cambios se aplicarán en tiempo real para clientes y administradores.</p>
                  
                  {/* Switch Crédito */}
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                    <div>
                      <p className="text-sm font-bold text-app">Módulo de Crédito y Cuentas por Cobrar</p>
                      <p className="text-xs text-muted mt-0.5">Permite a los clientes seleccionar "Crédito" como forma de pago y habilita el control de fiados.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input type="checkbox" className="sr-only peer"
                        checked={formData.creditsEnabled || false}
                        onChange={(e) => setFormData({ ...formData, creditsEnabled: e.target.checked })} />
                      <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>

                  {/* Switch Cupones */}
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                    <div>
                      <p className="text-sm font-bold text-app">Módulo de Cupones y Ofertas Flash</p>
                      <p className="text-xs text-muted mt-0.5">Habilita cupones promocionales y barra de inserción de códigos de descuento en checkout.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input type="checkbox" className="sr-only peer"
                        checked={formData.couponsEnabled || false}
                        onChange={(e) => setFormData({ ...formData, couponsEnabled: e.target.checked })} />
                      <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>

                  {/* Switch Reclamaciones */}
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                    <div>
                      <p className="text-sm font-bold text-app">Módulo de Garantías y Reclamos</p>
                      <p className="text-xs text-muted mt-0.5">Permite a los clientes iniciar solicitudes de cambio o reclamo de garantía para pedidos completados.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input type="checkbox" className="sr-only peer"
                        checked={formData.claimsEnabled || false}
                        onChange={(e) => setFormData({ ...formData, claimsEnabled: e.target.checked })} />
                      <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>

                  {/* Switch Mayoreo */}
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                    <div>
                      <p className="text-sm font-bold text-app">Módulo de Ventas al por Mayor</p>
                      <p className="text-xs text-muted mt-0.5">Permite aplicar descuentos automáticos por volumen de compra mayorista configurado.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input type="checkbox" className="sr-only peer"
                        checked={formData.wholesaleSettings?.enabled || false}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          wholesaleSettings: { ...formData.wholesaleSettings, enabled: e.target.checked } 
                        })} />
                      <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>

                  {/* Switch Mesas y QR */}
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                    <div>
                      <p className="text-sm font-bold text-app">Módulo de Pedidos en Mesa y Autoservicio QR</p>
                      <p className="text-xs text-muted mt-0.5">Habilita el mapa de salón para meseros, comandas para cocina a la mesa, y autogestión de clientes por escaneo de QR.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input type="checkbox" className="sr-only peer"
                        checked={formData.tablesEnabled || false}
                        onChange={(e) => setFormData({ ...formData, tablesEnabled: e.target.checked })} />
                      <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>
                </div>

                <div className="p-5 border-t border-app bg-surface-2/30">
                  <button
                    onClick={async () => {
                      try {
                        const payload = {
                          creditsEnabled: formData.creditsEnabled ?? true,
                          couponsEnabled: formData.couponsEnabled ?? true,
                          claimsEnabled: formData.claimsEnabled ?? false,
                          tablesEnabled: formData.tablesEnabled ?? false,
                          wholesaleSettings: formData.wholesaleSettings
                        }
                        await updateAppConfig(payload)
                        config.setConfig(payload)
                        setSaveMessage({ type: 'success', text: 'Módulos actualizados correctamente.' })
                        setTimeout(() => setSaveMessage(null), 3000)
                      } catch (e) {
                        setSaveMessage({ type: 'error', text: 'Error al guardar configuración de módulos.' })
                      }
                    }}
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    <Save size={18} /> Guardar Configuración de Módulos
                  </button>
                </div>
              </>
            )}

          </div>
        )
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: APARIENCIA Y COLORES ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'apariencia' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="bg-surface rounded-3xl shadow-sm overflow-hidden lg:col-span-7 flex flex-col">
            <div className="p-5 sm:p-6 flex flex-col gap-5">
              {/* ── Modo Oscuro ── */}
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                <div>
                  <p className="text-sm font-bold text-app">Modo Oscuro</p>
                  <p className="text-xs text-muted mt-0.5">Cambia entre tema claro y oscuro</p>
                </div>
                <button
                  onClick={() => config.toggleDarkMode()}
                  className="flex items-center justify-center gap-2 w-14 h-10 rounded-xl border border-app hover:bg-surface transition-colors text-app"
                  title={config.isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                >
                  {config.isDarkMode ? <Sun size={20} className="text-warning"/> : <Moon size={20} className="text-primary"/>}
                </button>
              </div>

              {/* ── Animaciones ── */}
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                <div>
                  <p className="text-sm font-bold text-app">Animaciones de la App</p>
                  <p className="text-xs text-muted mt-0.5">Activar transiciones suaves</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input type="checkbox" className="sr-only peer"
                    checked={formData.animationsEnabled}
                    onChange={(e) => setFormData({ ...formData, animationsEnabled: e.target.checked })} />
                  <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                </label>
              </div>

              {/* ── Sistema de Compra Guiada ── */}
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                <div>
                  <p className="text-sm font-bold text-app">Sistema de Compra Guiada</p>
                  <p className="text-xs text-muted mt-0.5">Asistencia flotante para clientes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input type="checkbox" className="sr-only peer"
                    checked={formData.guidedModeEnabled}
                    onChange={(e) => setFormData({ ...formData, guidedModeEnabled: e.target.checked })} />
                  <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                </label>
              </div>

              {/* ── Tema de Colores ── */}
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
                <div>
                  <p className="text-sm font-bold text-app">Tema Principal</p>
                  <p className="text-xs text-muted mt-0.5">
                    Paleta: <span className="font-bold text-primary">{typeof formData.theme === 'object' ? 'Personalizado' : (ADVANCED_PALETTES[formData.theme]?.name || 'Modern Purple')}</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsThemeModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-app text-surface text-sm font-bold shadow-md active:scale-95 transition-all"
                >
                  <Paintbrush size={16} /> Cambiar
                </button>
              </div>

              {/* ── Color de Acción ── */}
              <div className="p-4 bg-surface-2 rounded-2xl border border-app">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-sm font-bold text-app">Color de Botones de Compra</p>
                    <p className="text-xs text-muted mt-0.5">Sobrescribe el color primario en el carrito y pago</p>
                  </div>
                  {formData.actionColor && (
                    <button onClick={() => setFormData({ ...formData, actionColor: '' })} className="text-xs text-primary hover:underline font-medium">Restablecer</button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={formData.actionColor || getActiveColors(formData.theme, config.isDarkMode)['--color-primary']} 
                    onChange={(e) => setFormData({ ...formData, actionColor: e.target.value })}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <div className="flex-1 px-4 py-3 text-white font-bold text-center rounded-xl text-sm transition-colors shadow-sm" style={{ backgroundColor: formData.actionColor || getActiveColors(formData.theme, config.isDarkMode)['--color-primary'] }}>
                    Agregar al Carrito
                  </div>
                </div>
              </div>

              {/* ── Tipografía ── */}
              <div className="p-4 bg-surface-2 rounded-2xl border border-app">
                <div className="flex items-center gap-2 mb-1">
                  <Type size={16} className="text-primary shrink-0" />
                  <p className="text-sm font-bold text-app">Tipografía</p>
                </div>
                <p className="text-xs text-muted mb-4">Fuente principal de toda la aplicación — {FONTS[formData.appFont]?.name || 'Inter'} ({FONTS[formData.appFont]?.category || 'Modernas'})</p>

                {/* Precargar todas las fuentes para preview */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                {FONT_CATEGORIES.map(cat =>
                  FONTS_BY_CATEGORY[cat].map(f => (
                    <link key={f.key} rel="stylesheet" href={f.url} />
                  ))
                )}

                <div className="space-y-4">
                  {FONT_CATEGORIES.map(cat => (
                    <div key={cat}>
                      {/* Etiqueta de categoría */}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{cat}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {FONTS_BY_CATEGORY[cat].map(({ key, name, description }) => {
                          const isSelected = formData.appFont === key
                          return (
                            <motion.button
                              key={key}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => setFormData({ ...formData, appFont: key })}
                              className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center overflow-hidden ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-app bg-surface hover:border-primary/30 hover:bg-surface-2'
                              }`}
                            >
                              {/* Indicador de seleccionado */}
                              {isSelected && (
                                <motion.div
                                  layoutId="font-selected"
                                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary"
                                />
                              )}
                              {/* Preview de la fuente */}
                              <span
                                className="text-2xl font-bold leading-none"
                                style={{
                                  fontFamily: `'${name}', serif`,
                                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text)'
                                }}
                              >
                                Aa
                              </span>
                              {/* Nombre de la fuente */}
                              <span className={`text-[11px] font-bold leading-tight ${
                                isSelected ? 'text-primary' : 'text-app'
                              }`}>
                                {name.split(' ')[0]}
                              </span>
                              {/* Descripción */}
                              <span className="text-[9px] text-muted leading-tight">{description}</span>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Radio de Bordes ── */}
              <div className="p-4 bg-surface-2 rounded-2xl border border-app">
                <p className="text-sm font-bold text-app mb-1">Estilo de Bordes</p>
                <p className="text-xs text-muted mb-3">Redondez de tarjetas de productos</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'squared', label: 'Cuadrado', radius: '4px' },
                    { id: 'rounded', label: 'Suave', radius: '12px' },
                    { id: 'pill', label: 'Redondo', radius: '32px' }
                  ].map((border) => (
                    <button
                      key={border.id}
                      onClick={() => setFormData({ ...formData, appRadius: border.id })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                        formData.appRadius === border.id ? 'border-primary bg-primary/5' : 'border-app bg-surface hover:border-primary/30'
                      }`}
                    >
                      <div className="w-full h-8 border-2 border-primary/40 bg-surface-2" style={{ borderRadius: border.radius }} />
                      <span className={`text-xs font-semibold ${formData.appRadius === border.id ? 'text-primary' : 'text-muted'}`}>{border.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Modo de Vista del Catálogo ── */}
              <div className="p-4 bg-surface-2 rounded-2xl border border-app">
                <p className="text-sm font-bold text-app mb-1">Diseño del Catálogo</p>
                <p className="text-xs text-muted mb-3">Columnas en la vista del cliente</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'list', label: 'Lista' },
                    { id: 'grid2', label: '2 Columnas' }
                  ].map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => setFormData({ ...formData, catalogLayout: layout.id })}
                      className={`py-2 px-1 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${
                        formData.catalogLayout === layout.id ? 'border-primary bg-primary/5 text-primary' : 'border-app bg-surface text-muted hover:border-primary/30'
                      }`}
                    >
                      <div className="flex gap-1 h-5">
                        {layout.id === 'list' && <div className="w-10 h-full bg-current rounded-sm opacity-50" />}
                        {layout.id === 'grid2' && <><div className="w-4 h-full bg-current rounded-sm opacity-50"/><div className="w-4 h-full bg-current rounded-sm opacity-50"/></>}
                      </div>
                      <span className="text-xs font-semibold">{layout.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
            </div>
            
            {/* Botón Guardar */}
            <div className="p-5 sm:p-6 border-t border-app bg-surface-2/30">
              <button onClick={handleSaveConfig} disabled={isSaving}
                className="w-full min-h-[52px] py-3 px-6 bg-primary text-white rounded-xl font-bold text-sm transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-3 shadow-lg shadow-primary/30 disabled:opacity-50">
                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={20} className="shrink-0" /> Guardar Cambios</>}
              </button>
            </div>
          </div>
          {renderMobilePreview()}
        </div>
      )}

      {/* ─── VISTA: PUBLICIDAD Y PROMOCIONES ────────────────────────────────── */}
      {activeSection === 'publicidad' && (
        <div className="space-y-6">
          {/* BOTÓN AGREGAR Y HEADER */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Crea y gestiona tus campañas híbridas y de inventario</p>
            </div>
            {!showAdForm && (
              <button
                onClick={() => {
                  setEditingAdId(null)
                  setAdFormData({
                    type: 'inventory',
                    active: true,
                    productId: '',
                    discountType: 'percentage',
                    discountValue: 0,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
                    customTitle: '',
                    customBanner: '',
                    glowEffect: false,
                    title: '',
                    description: '',
                    image: '',
                    banner: '',
                    colors: { bg: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', text: '#ffffff' },
                    ctaText: 'Ver promoción',
                    ctaAction: 'modal',
                    ctaValue: '',
                    category: '',
                    isTemporalProduct: false,
                    price: 0,
                    promoPrice: 0,
                  })
                  setShowAdForm(true)
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
                style={{ borderRadius: 'var(--radius-base)' }}
              >
                <Plus size={16} /> Nuevo Anuncio
              </button>
            )}
          </div>

          {/* FORMULARIO DE CREAR/EDITAR */}
          {showAdForm && (
            <div className="bg-surface rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-app bg-surface-2/30 flex justify-between items-center">
                <p className="font-bold text-app text-sm">
                  {editingAdId ? 'Editar Anuncio' : 'Nuevo Anuncio / Promoción'}
                </p>
                <button
                  onClick={() => setShowAdForm(false)}
                  className="w-7 h-7 rounded-full bg-surface-2 hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-muted transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                {/* Selector de Tipo */}
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">
                    Tipo de Promoción
                  </label>
                  <div className="flex bg-surface-2 border border-app rounded-xl overflow-hidden p-1">
                    <button
                      type="button"
                      onClick={() => setAdFormData({ ...adFormData, type: 'inventory' })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        adFormData.type === 'inventory' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-surface'
                      }`}
                    >
                      Producto del Inventario
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdFormData({ ...adFormData, type: 'custom' })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        adFormData.type === 'custom' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-surface'
                      }`}
                    >
                      Promoción Personalizada
                    </button>
                  </div>
                </div>

                {/* FORMULARIO: INVENTARIO */}
                {adFormData.type === 'inventory' && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-app mb-1 block">Seleccionar Producto</label>
                      <CustomSelect
                        value={adFormData.productId}
                        placeholder="Selecciona un producto..."
                        onChange={(val) => {
                          const prod = products.find(p => p.id === val)
                          setAdFormData({ ...adFormData, productId: val, customTitle: prod ? prod.nombre : '' })
                        }}
                        options={products.map(prod => ({
                          value: prod.id,
                          label: `${prod.nombre} ($${prod.precioBase.toLocaleString()})`
                        }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-app mb-1 block">Tipo Descuento</label>
                        <CustomSelect
                          value={adFormData.discountType}
                          onChange={(val) => setAdFormData({ ...adFormData, discountType: val })}
                          options={[
                            { value: 'percentage', label: 'Porcentaje (%)' },
                            { value: 'amount', label: 'Monto Fijo ($)' },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-app mb-1 block">Valor Descuento</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={adFormData.discountValue === 0 ? '' : String(adFormData.discountValue)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            // Evitar múltiples puntos decimales
                            const parts = raw.split('.');
                            const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
                            setAdFormData({ ...adFormData, discountValue: cleaned === '' ? 0 : cleaned });
                          }}
                          onBlur={(e) => {
                            // Al salir del campo, convertir a número limpio
                            const num = parseFloat(e.target.value);
                            setAdFormData(prev => ({ ...prev, discountValue: isNaN(num) ? 0 : num }));
                          }}
                          className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    {/* Vista Previa del Descuento */}
                    {adFormData.productId && (
                      <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-primary font-bold">
                        {(() => {
                          const prod = products.find(p => p.id === adFormData.productId)
                          if (!prod) return ''
                          const desc = adFormData.discountType === 'percentage'
                            ? (prod.precioBase * adFormData.discountValue) / 100
                            : adFormData.discountValue
                          const finalPrice = Math.max(0, prod.precioBase - desc)
                          return `Precio Base: $${prod.precioBase.toLocaleString()} | Descuento: -$${desc.toLocaleString()} | Precio Final: $${finalPrice.toLocaleString()}`
                        })()}
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-app mb-1 block">Título Personalizado (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Dejar vacío para usar el nombre del producto"
                        value={adFormData.customTitle}
                        onChange={(e) => setAdFormData({ ...adFormData, customTitle: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-app mb-1 block">Imagen Banner Opcional (URL)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={adFormData.customBanner}
                        onChange={(e) => setAdFormData({ ...adFormData, customBanner: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-app">
                      <div>
                        <p className="text-xs font-bold text-app">Efecto Brillo (Glow visual)</p>
                        <p className="text-[10px] text-muted">Añade un brillo animado premium a la tarjeta del producto</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={adFormData.glowEffect}
                        onChange={(e) => setAdFormData({ ...adFormData, glowEffect: e.target.checked })}
                        className="w-5 h-5 rounded text-primary focus:ring-primary border-app cursor-pointer"
                      />
                    </div>

                    {/* Preview en vivo para Producto de Inventario */}
                    {adFormData.productId && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-muted uppercase tracking-wider font-bold">Vista Previa del Anuncio (Inventario)</p>
                        {(() => {
                          const prod = products.find(p => p.id === adFormData.productId)
                          if (!prod) return null
                          
                          // Calcular precio final
                          const desc = adFormData.discountType === 'percentage'
                            ? (prod.precioBase * adFormData.discountValue) / 100
                            : adFormData.discountValue
                          const finalPrice = Math.max(0, prod.precioBase - desc)
                          const hasDiscount = desc > 0

                          const imageToShow = adFormData.customBanner || prod.imagen || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'
                          const titleToShow = adFormData.customTitle || prod.nombre

                          // Estilo del Glow
                          const glowStyle = adFormData.glowEffect
                            ? {
                                boxShadow: '0 0 15px 3px rgba(var(--color-primary-rgb, 233, 30, 140), 0.5)',
                                border: '1px solid var(--color-primary, #e91e8c)'
                              }
                            : {
                                border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))'
                              }

                          return (
                            <div 
                              className="relative overflow-hidden rounded-2xl bg-surface transition-all duration-300 flex flex-col md:flex-row items-center gap-4 p-4"
                              style={glowStyle}
                            >
                              {/* Imagen del Producto */}
                              <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-2 shrink-0 border border-app relative flex items-center justify-center">
                                {adFormData.customBanner || prod.imagen || prod.imageUrl ? (
                                  <>
                                    <img 
                                      src={adFormData.customBanner || prod.imagen || prod.imageUrl} 
                                      alt={titleToShow} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none'
                                        const sibling = e.target.nextSibling
                                        if (sibling) sibling.style.display = 'flex'
                                      }}
                                    />
                                    <div className="hidden absolute inset-0 flex items-center justify-center text-muted text-[10px] font-bold bg-surface-2">
                                      Imagen
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted text-[10px] font-bold">Imagen</span>
                                )}
                                {hasDiscount && (
                                  <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-md z-10">
                                    {adFormData.discountType === 'percentage' ? `-${adFormData.discountValue}%` : `-$${adFormData.discountValue.toLocaleString()}`}
                                  </div>
                                )}
                              </div>

                              {/* Detalles */}
                              <div className="flex-1 text-center md:text-left min-w-0">
                                <span className="inline-block bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full mb-1">
                                  {prod.categoria || 'Promoción'}
                                </span>
                                <h4 className="font-bold text-sm text-app truncate">{titleToShow}</h4>
                                
                                <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                                  {hasDiscount && (
                                    <span className="text-xs text-muted line-through">
                                      ${prod.precioBase.toLocaleString()}
                                    </span>
                                  )}
                                  <span className="text-sm font-extrabold text-primary">
                                    ${finalPrice.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Botón CTA ficticio */}
                              <div className="shrink-0 w-full md:w-auto">
                                <div className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold text-center shadow-lg shadow-primary/20">
                                  Ver Producto
                                </div>
                              </div>

                              {/* Detalle Glow Animado de fondo si aplica */}
                              {adFormData.glowEffect && (
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* FORMULARIO: PERSONALIZADO */}
                {adFormData.type === 'custom' && (
                  <div className="space-y-4 pt-2">
                    {/* Switch Producto Temporal */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-app">
                      <div>
                        <p className="text-xs font-bold text-app">¿Es un Producto Temporal?</p>
                        <p className="text-[10px] text-muted">Permite vender un combo o producto que no está en el inventario real</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={adFormData.isTemporalProduct}
                        onChange={(e) => setAdFormData({ ...adFormData, isTemporalProduct: e.target.checked })}
                        className="w-5 h-5 rounded text-primary focus:ring-primary border-app cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-app mb-1 block">Título</label>
                        <input
                          type="text"
                          required
                          value={adFormData.title}
                          onChange={(e) => setAdFormData({ ...adFormData, title: e.target.value })}
                          className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-app mb-1 block">Categoría Visual (ej: Combos, Ofertas)</label>
                        <input
                          type="text"
                          value={adFormData.category}
                          onChange={(e) => setAdFormData({ ...adFormData, category: e.target.value })}
                          className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                          placeholder="Combos"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-app mb-1 block">Descripción</label>
                      <textarea
                        rows={2}
                        value={adFormData.description}
                        onChange={(e) => setAdFormData({ ...adFormData, description: e.target.value })}
                        className="w-full p-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    {adFormData.isTemporalProduct && (
                      <div className="grid grid-cols-2 gap-4 bg-surface-2 p-4 rounded-2xl border border-app shadow-inner">
                        <div>
                          <label className="text-xs font-bold text-app mb-1 block">Precio Original ($)</label>
                          <input
                            type="number"
                            value={adFormData.price}
                            onChange={(e) => setAdFormData({ ...adFormData, price: Number(e.target.value) })}
                            className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-app mb-1 block">Precio Promoción ($)</label>
                          <input
                            type="number"
                            value={adFormData.promoPrice}
                            onChange={(e) => setAdFormData({ ...adFormData, promoPrice: Number(e.target.value) })}
                            className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-app mb-1 block">Imagen Cuadrada URL</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={adFormData.image}
                          onChange={(e) => setAdFormData({ ...adFormData, image: e.target.value })}
                          className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-app mb-1 block">Banner Horizontal URL</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={adFormData.banner}
                          onChange={(e) => setAdFormData({ ...adFormData, banner: e.target.value })}
                          className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    {/* ── Fondo y Color ── */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-app">Colores del Anuncio</p>

                      {/* Presets de degradados */}
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wider font-bold mb-2">Fondo (Degradado o Color Sólido)</p>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {[
                            { label: 'Rosa', bg: 'linear-gradient(135deg, #e91e8c, #ff4081)' },
                            { label: 'Púrpura', bg: 'linear-gradient(135deg, #7c3aed, #c026d3)' },
                            { label: 'Azul', bg: 'linear-gradient(135deg, #1565c0, #2979ff)' },
                            { label: 'Verde', bg: 'linear-gradient(135deg, #1b5e20, #43a047)' },
                            { label: 'Naranja', bg: 'linear-gradient(135deg, #e65100, #ff9800)' },
                            { label: 'Negro', bg: 'linear-gradient(135deg, #0f0f0f, #37474f)' },
                            { label: 'Dorado', bg: 'linear-gradient(135deg, #b8860b, #f5c518)' },
                            { label: 'App', bg: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' },
                          ].map(({ label, bg }) => (
                            <button
                              key={label}
                              type="button"
                              title={label}
                              onClick={() => setAdFormData({ ...adFormData, colors: { ...adFormData.colors, bg } })}
                              className={`h-10 rounded-xl border-2 transition-all ${adFormData.colors.bg === bg ? 'border-white shadow-lg scale-105' : 'border-transparent hover:border-white/40'}`}
                              style={{ background: bg }}
                            >
                              {adFormData.colors.bg === bg && (
                                <span className="text-white text-xs font-bold drop-shadow">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                        {/* Color sólido personalizado */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-app">
                          <input
                            type="color"
                            value={(() => {
                              const m = adFormData.colors.bg.match(/#[0-9a-fA-F]{6}/)
                              return m ? m[0] : '#e91e8c'
                            })()}
                            onChange={(e) => setAdFormData({ ...adFormData, colors: { ...adFormData.colors, bg: e.target.value } })}
                            className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent shrink-0"
                          />
                          <div>
                            <p className="text-xs font-bold text-app">Color personalizado</p>
                            <p className="text-[10px] text-muted">Selecciona un color sólido exacto</p>
                          </div>
                        </div>
                      </div>

                      {/* Color de texto */}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-app">
                        <input
                          type="color"
                          value={adFormData.colors.text || '#ffffff'}
                          onChange={(e) => setAdFormData({ ...adFormData, colors: { ...adFormData.colors, text: e.target.value } })}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent shrink-0"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-app">Color del texto</p>
                          <p className="text-[10px] text-muted">Color de títulos y descripción sobre el fondo</p>
                        </div>
                        {/* Botones rápidos Blanco/Negro */}
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setAdFormData({ ...adFormData, colors: { ...adFormData.colors, text: '#ffffff' } })}
                            className={`w-7 h-7 rounded-lg border-2 bg-white transition-all ${adFormData.colors.text === '#ffffff' ? 'border-primary scale-110' : 'border-app'}`}
                            title="Blanco"
                          />
                          <button
                            type="button"
                            onClick={() => setAdFormData({ ...adFormData, colors: { ...adFormData.colors, text: '#111111' } })}
                            className={`w-7 h-7 rounded-lg border-2 bg-black transition-all ${adFormData.colors.text === '#111111' ? 'border-primary scale-110' : 'border-app'}`}
                            title="Negro"
                          />
                        </div>
                      </div>

                      {/* Preview en vivo */}
                      <div
                        className="w-full h-16 rounded-2xl flex items-center justify-center overflow-hidden"
                        style={{ background: adFormData.colors.bg }}
                      >
                        <p className="font-bold text-sm px-4 text-center drop-shadow" style={{ color: adFormData.colors.text }}>
                          {adFormData.title || 'Vista previa del anuncio'}
                        </p>
                      </div>
                    </div>

                    {/* ── Texto del Botón CTA ── */}
                    <div>
                      <label className="text-xs font-bold text-app mb-1 block">Texto del Botón CTA</label>
                      <input
                        type="text"
                        value={adFormData.ctaText}
                        onChange={(e) => setAdFormData({ ...adFormData, ctaText: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                        placeholder="Ver promoción"
                      />
                    </div>

                    {/* ── Comportamiento CTA ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-app mb-1 block">Comportamiento Clic (Acción)</label>
                        <CustomSelect
                          value={adFormData.ctaAction}
                          onChange={(val) => setAdFormData({ ...adFormData, ctaAction: val })}
                          options={[
                            { value: 'modal', label: 'Abrir Detalle en Modal' },
                            { value: 'whatsapp', label: 'Abrir WhatsApp' },
                            { value: 'url', label: 'Abrir Enlace Externo' },
                            { value: 'category', label: 'Filtrar por Categoría' },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-app mb-1 block">Valor de la Acción</label>
                        <input
                          type="text"
                          value={adFormData.ctaValue}
                          onChange={(e) => setAdFormData({ ...adFormData, ctaValue: e.target.value })}
                          className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors"
                          placeholder={
                            adFormData.ctaAction === 'whatsapp' ? '+57300...' :
                            adFormData.ctaAction === 'category' ? 'Nombre o ID Categoría' :
                            adFormData.ctaAction === 'url' ? 'https://...' :
                            'Texto descriptivo largo para el modal...'
                          }
                        />
                      </div>
                    </div>

                    {/* ── Efecto Glow (igual que inventario) ── */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-app">
                      <div>
                        <p className="text-xs font-bold text-app">Efecto Brillo (Glow visual)</p>
                        <p className="text-[10px] text-muted">Añade un brillo animado premium a la tarjeta del anuncio</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={adFormData.glowEffect}
                        onChange={(e) => setAdFormData({ ...adFormData, glowEffect: e.target.checked })}
                        className="w-5 h-5 rounded text-primary focus:ring-primary border-app cursor-pointer"
                      />
                    </div>

                  </div>
                )}

                {/* Fechas de Vigencia Comunes */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-bold text-app mb-1 block">Fecha Inicio</label>
                    <CustomDatePicker
                      value={adFormData.startDate}
                      onChange={(e) => setAdFormData({ ...adFormData, startDate: e.target.value })}
                      placeholder="dd/mm/aaaa"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-app mb-1 block">Fecha Fin</label>
                    <CustomDatePicker
                      value={adFormData.endDate}
                      onChange={(e) => setAdFormData({ ...adFormData, endDate: e.target.value })}
                      placeholder="dd/mm/aaaa"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Guardar/Cancelar */}
              <div className="p-4 border-t border-app bg-surface-2/30 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdForm(false)}
                  className="flex-1 py-3 bg-surface border border-app text-app font-bold text-xs rounded-xl active:scale-95 transition-all hover:bg-surface-2"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAd}
                  className="flex-1 py-3 bg-primary text-white font-bold text-xs rounded-xl active:scale-95 transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                  style={{ borderRadius: 'var(--radius-base)' }}
                >
                  <Save size={16} /> Guardar
                </button>
              </div>
            </div>
          )}

          {/* LISTADO DE ANUNCIOS */}
          {!showAdForm && (
            <div className="bg-surface rounded-3xl shadow-sm overflow-hidden">
              {isLoadingAds ? (
                <div className="p-8 text-center text-muted">Cargando anuncios...</div>
              ) : ads.length === 0 ? (
                <div className="p-8 text-center text-muted text-sm">
                  No hay anuncios creados. ¡Crea el primero usando el botón de arriba!
                </div>
              ) : (
                <div className="divide-y divide-app">
                  {ads.map(ad => {
                    const linkedProduct = ad.type === 'inventory' ? products.find(p => p.id === ad.productId) : null
                    return (
                      <div key={ad.id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-surface-2/30 transition-colors">
                        <div className="flex gap-3 items-start">
                          {/* Miniatura */}
                          <div className="w-12 h-12 rounded-xl bg-surface-2 border border-app overflow-hidden shrink-0 flex items-center justify-center">
                            {(ad.type === 'inventory' ? (linkedProduct?.imageUrl || ad.customBanner) : (ad.image || ad.banner)) ? (
                              <img
                                src={ad.type === 'inventory' ? (linkedProduct?.imageUrl || ad.customBanner) : (ad.image || ad.banner)}
                                alt=""
                                className="w-full h-full object-cover rounded-xl"
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                            ) : (
                              <Megaphone size={20} className="text-muted" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                ad.type === 'inventory' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                              }`}>
                                {ad.type === 'inventory' ? 'Inventario' : ad.isTemporalProduct ? 'Prod. Temporal' : 'Personalizado'}
                              </span>
                              <span className={`text-[10px] font-bold ${ad.active ? 'text-green-600' : 'text-muted'}`}>
                                {ad.active ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-app mt-1">
                              {ad.type === 'inventory' ? (ad.customTitle || linkedProduct?.nombre || 'Producto Desvinculado') : ad.title}
                            </p>
                            <p className="text-xs text-muted mt-0.5">
                              Vigencia: {ad.startDate} al {ad.endDate}
                            </p>
                          </div>
                        </div>

                        {/* Controles de Acción */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {/* Toggle Activo */}
                          <button
                            onClick={() => {
                              if (!ad.active) {
                                const activeCount = ads.filter(a => a.active).length
                                if (activeCount >= 5) {
                                  alert('Límite alcanzado: Sólo puedes tener un máximo de 5 publicidades activas de forma simultánea. Desactiva otra publicidad para poder activar esta.')
                                  return
                                }
                              }
                              updateMutation.mutate({ id: ad.id, data: { active: !ad.active } })
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              ad.active
                                ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20'
                                : 'bg-surface border-app text-muted hover:bg-surface-2'
                            }`}
                          >
                            {ad.active ? 'Desactivar' : 'Activar'}
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => {
                              setEditingAdId(ad.id)
                              setAdFormData({
                                type: ad.type || 'inventory',
                                active: ad.active ?? true,
                                productId: ad.productId || '',
                                discountType: ad.discountType || 'percentage',
                                discountValue: ad.discountValue || 0,
                                startDate: ad.startDate || new Date().toISOString().split('T')[0],
                                endDate: ad.endDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
                                customTitle: ad.customTitle || '',
                                customBanner: ad.customBanner || '',
                                glowEffect: ad.glowEffect || false,
                                title: ad.title || '',
                                description: ad.description || '',
                                image: ad.image || '',
                                banner: ad.banner || '',
                                colors: ad.colors || { bg: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', text: '#ffffff' },
                                ctaText: ad.ctaText || 'Ver promoción',
                                ctaAction: ad.ctaAction || 'modal',
                                ctaValue: ad.ctaValue || '',
                                category: ad.category || '',
                                isTemporalProduct: ad.isTemporalProduct || false,
                                price: ad.price || 0,
                                promoPrice: ad.promoPrice || 0,
                              })
                              setShowAdForm(true)
                            }}
                            className="p-2 rounded-lg bg-surface-2 border border-app text-app hover:bg-primary hover:text-white transition-colors"
                          >
                            <Paintbrush size={14} />
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => setAdToDelete(ad)}
                            className="p-2 rounded-lg bg-red-500/5 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN PREMIUM */}
          {adToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Overlay con desenfoque */}
              <div 
                className="absolute inset-0 bg-black/75 backdrop-blur-[3px] transition-opacity duration-300"
                onClick={() => setAdToDelete(null)}
              />
              
              {/* Cuerpo del Modal */}
              <div 
                className="relative bg-surface rounded-3xl border border-app shadow-2xl p-6 w-full max-w-sm text-center overflow-hidden transition-all transform scale-100 duration-300 z-10 animate-in fade-in zoom-in-95 duration-200"
              >
                {/* Icono animado */}
                <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
                  <Trash2 size={24} className="animate-pulse" />
                </div>

                <h3 className="text-base font-bold text-app mb-2">¿Eliminar promoción?</h3>
                
                <p className="text-xs text-muted leading-relaxed mb-6">
                  Esta acción es permanente. El anuncio seleccionado se retirará de la tienda del cliente inmediatamente.
                </p>

                {/* Previsualización del elemento a borrar */}
                <div className="bg-surface-2 p-3 rounded-2xl border border-app text-left mb-6">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Nombre del Anuncio</p>
                  <p className="text-xs font-extrabold text-app mt-0.5 truncate">
                    {adToDelete.type === 'inventory' 
                      ? (adToDelete.customTitle || products.find(p => p.id === adToDelete.productId)?.nombre || 'Producto de Inventario')
                      : (adToDelete.title || 'Promoción Personalizada')
                    }
                  </p>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAdToDelete(null)}
                    className="flex-1 py-3 bg-surface border border-app text-app font-bold text-xs rounded-xl active:scale-95 transition-all hover:bg-surface-2"
                  >
                    No, Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteMutation.mutate(adToDelete.id)
                      setAdToDelete(null)
                    }}
                    className="flex-1 py-3 bg-red-500 text-white font-bold text-xs rounded-xl active:scale-95 transition-all hover:bg-red-600 shadow-lg shadow-red-500/20"
                  >
                    Sí, Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: CUPONES DE DESCUENTO ─────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'cupones' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-3xl border border-app shadow-sm p-6 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/10">
                  Fidelización de Clientes
                </span>
                <h3 className="text-lg font-bold text-app mt-1">Cupones de Descuento</h3>
                <p className="text-xs text-muted">Crea incentivos de compra y cupones de descuento para tus clientes</p>
              </div>
              <button
                onClick={() => {
                  setEditingCouponId(null)
                  setCouponFormData({
                    code: '',
                    type: 'percentage',
                    value: '',
                    minPurchase: '',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
                    active: true
                  })
                  setShowCouponForm(true)
                }}
                className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto"
              >
                <Plus size={16} />
                Nuevo Cupón
              </button>
            </div>

            {/* Listado de Cupones */}
            {isLoadingCoupons ? (
              <div className="text-center py-10 text-muted">Cargando cupones...</div>
            ) : coupons.length === 0 ? (
              <div className="py-12 text-center bg-surface-2 rounded-2xl border border-dashed border-app">
                <p className="text-3xl mb-2">🎫</p>
                <p className="text-xs text-muted font-medium">No has creado cupones de descuento aún.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coupons.map(coupon => {
                  const today = new Date().toISOString().split('T')[0]
                  const isExpired = today > coupon.endDate
                  const isCouponActive = coupon.active && !isExpired
                  const usageCount = couponUsageMap[coupon.code.toUpperCase()] || 0

                  return (
                    <div 
                      key={coupon.id}
                      className="bg-surface-2 border border-app rounded-2xl p-4.5 relative overflow-hidden flex flex-col justify-between"
                      style={{ borderLeftWidth: '4px', borderLeftColor: isCouponActive ? 'var(--color-primary)' : 'var(--color-border)' }}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-app tracking-wide bg-surface border border-app px-2 py-0.5 rounded-lg">
                              {coupon.code}
                            </span>
                            {/* Métrica de usos en Badge premium */}
                            <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10 shrink-0">
                              {usageCount === 1 ? 'Usado 1 vez' : `Usado ${usageCount} veces`}
                            </span>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                            isCouponActive 
                              ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                              : isExpired 
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                              : 'bg-surface border-app text-muted'
                          }`}>
                            {isCouponActive ? 'Activo' : isExpired ? 'Expirado' : 'Inactivo'}
                          </span>
                        </div>

                        <p className="text-sm font-black text-app">
                          Descuento: <span className="text-primary">
                            {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value.toLocaleString()}`}
                          </span>
                        </p>
                        
                        {coupon.minPurchase > 0 && (
                          <p className="text-[11px] text-muted mt-0.5">
                            Compra mínima: <strong className="text-app">{formatCurrency(coupon.minPurchase)}</strong>
                          </p>
                        )}
                        
                        <p className="text-[11px] text-muted mt-1">
                          Vigencia: {coupon.startDate} al {coupon.endDate}
                        </p>
                      </div>

                      {/* Controles de Acción */}
                      <div className="flex items-center justify-between mt-4.5 border-t border-app pt-3.5">
                        <button
                          onClick={() => {
                            if (!coupon.active) {
                              // Validar que no esté expirado antes de reactivar por comodidad
                              if (today > coupon.endDate) {
                                alert('Este cupón está expirado. Modifica la fecha de fin si deseas activarlo.')
                                return
                              }
                            }
                            updateCouponMutation.mutate({ id: coupon.id, data: { active: !coupon.active } })
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            coupon.active
                              ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20'
                              : 'bg-surface border-app text-muted hover:bg-surface-2'
                          }`}
                        >
                          {coupon.active ? 'Desactivar' : 'Activar'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingCouponId(coupon.id)
                              setCouponFormData({
                                code: coupon.code,
                                type: coupon.type,
                                value: coupon.value,
                                minPurchase: coupon.minPurchase || '',
                                startDate: coupon.startDate,
                                endDate: coupon.endDate,
                                active: coupon.active
                              })
                              setShowCouponForm(true)
                            }}
                            className="px-2.5 py-1.5 text-xs text-muted hover:text-app bg-surface border border-app rounded-lg transition-colors active:scale-95"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setCouponToDelete(coupon)}
                            className="p-1.5 text-xs text-red-500 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors active:scale-95"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Formulario Modal de Cupón */}
          <AnimatePresence>
            {showCouponForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowCouponForm(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className="relative w-full max-w-md bg-surface rounded-3xl shadow-2xl p-6 border border-app z-10"
                >
                  <button
                    onClick={() => setShowCouponForm(false)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-2 border border-app text-muted hover:text-app flex items-center justify-center transition-colors"
                  >
                    <X size={16} />
                  </button>

                  <h3 className="text-lg font-bold text-app mb-1">
                    {editingCouponId ? 'Editar Cupón' : 'Nuevo Cupón de Descuento'}
                  </h3>
                  <p className="text-xs text-muted mb-5">Configura las opciones y restricciones del cupón</p>

                  <div className="space-y-4">
                    {/* Código con Autogenerador */}
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Código del Cupón *</label>
                      <div className="flex flex-row gap-2 max-w-full">
                        <input
                          type="text"
                          value={couponFormData.code}
                          onChange={(e) => setCouponFormData(p => ({ ...p, code: e.target.value.toUpperCase().trim() }))}
                          className="flex-1 min-w-0 h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary text-sm font-bold tracking-wider uppercase"
                          placeholder="Ej: FLASH10"
                          maxLength={15}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                            let randomCode = 'FLASH-'
                            for (let i = 0; i < 5; i++) {
                              randomCode += chars.charAt(Math.floor(Math.random() * chars.length))
                            }
                            setCouponFormData(p => ({ ...p, code: randomCode }))
                          }}
                          className="h-11 px-3 sm:px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap"
                          title="Generar código aleatorio"
                        >
                          <Sparkles size={14} /> Generar
                        </button>
                      </div>
                    </div>

                    {/* Plantillas de Ofertas Rápidas */}
                    <div className="p-3 bg-surface-2 rounded-2xl border border-app">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Sparkles size={11} className="text-primary" /> Plantillas de Configuración Rápida
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCouponFormData(p => ({
                              ...p,
                              code: 'BIENVENIDA10',
                              type: 'percentage',
                              value: '10',
                              minPurchase: '0'
                            }))
                          }}
                          className="px-2.5 py-1.5 bg-surface hover:bg-primary/5 hover:border-primary/30 border border-app rounded-xl text-[10px] font-bold text-app transition-colors"
                        >
                          🎁 Bienvenida 10%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCouponFormData(p => ({
                              ...p,
                              code: 'MEGAPROMO20',
                              type: 'percentage',
                              value: '20',
                              minPurchase: '80000'
                            }))
                          }}
                          className="px-2.5 py-1.5 bg-surface hover:bg-primary/5 hover:border-primary/30 border border-app rounded-xl text-[10px] font-bold text-app transition-colors"
                        >
                          🔥 Mega Promo 20%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCouponFormData(p => ({
                              ...p,
                              code: 'DESCUENTAZO',
                              type: 'fixed',
                              value: '15000',
                              minPurchase: '50000'
                            }))
                          }}
                          className="px-2.5 py-1.5 bg-surface hover:bg-primary/5 hover:border-primary/30 border border-app rounded-xl text-[10px] font-bold text-app transition-colors"
                        >
                          ⚡ Ahorro $15.000
                        </button>
                      </div>
                    </div>

                    {/* Tipo de Descuento */}
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Tipo de Descuento *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCouponFormData(p => ({ ...p, type: 'percentage' }))}
                          className={`h-11 rounded-xl text-xs font-bold border transition-all ${
                            couponFormData.type === 'percentage'
                              ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                              : 'bg-surface border-app text-app hover:bg-surface-2'
                          }`}
                        >
                          Porcentaje (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCouponFormData(p => ({ ...p, type: 'fixed' }))}
                          className={`h-11 rounded-xl text-xs font-bold border transition-all ${
                            couponFormData.type === 'fixed'
                              ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                              : 'bg-surface border-app text-app hover:bg-surface-2'
                          }`}
                        >
                          Monto Fijo ($)
                        </button>
                      </div>
                    </div>

                    {/* Valor & Compra Mínima */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                          {couponFormData.type === 'percentage' ? 'Porcentaje (%) *' : 'Descuento ($) *'}
                        </label>
                        <input
                          type="number"
                          value={couponFormData.value}
                          onChange={(e) => setCouponFormData(p => ({ ...p, value: e.target.value }))}
                          className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary text-sm font-bold"
                          placeholder={couponFormData.type === 'percentage' ? 'Ej: 10' : 'Ej: 15000'}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Compra Mínima ($)</label>
                        <input
                          type="number"
                          value={couponFormData.minPurchase}
                          onChange={(e) => setCouponFormData(p => ({ ...p, minPurchase: e.target.value }))}
                          className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary text-sm font-bold"
                          placeholder="Opcional"
                        />
                      </div>
                    </div>

                    {/* Fechas de Vigencia */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Fecha Inicio</label>
                        <CustomDatePicker
                          value={couponFormData.startDate}
                          onChange={(e) => setCouponFormData(p => ({ ...p, startDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Fecha Fin</label>
                        <CustomDatePicker
                          value={couponFormData.endDate}
                          onChange={(e) => setCouponFormData(p => ({ ...p, endDate: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Checkbox de Activo */}
                    <div className="flex items-center gap-2.5 pt-2">
                      <input
                        type="checkbox"
                        id="couponActiveCheckbox"
                        checked={couponFormData.active}
                        onChange={(e) => setCouponFormData(p => ({ ...p, active: e.target.checked }))}
                        className="w-4.5 h-4.5 text-primary border-app rounded focus:ring-primary/20 accent-primary"
                      />
                      <label htmlFor="couponActiveCheckbox" className="text-xs font-bold text-app select-none cursor-pointer">
                        Habilitar cupón inmediatamente
                      </label>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCouponForm(false)}
                        className="flex-1 py-3 bg-surface border border-app text-app font-bold text-xs rounded-xl active:scale-95 transition-all hover:bg-surface-2"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCoupon}
                        className="flex-1 py-3 bg-primary text-white font-bold text-xs rounded-xl active:scale-95 transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                      >
                        <Save size={14} />
                        Guardar Cupón
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Modal de Eliminación */}
          {couponToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setCouponToDelete(null)}
              />
              <div className="relative w-full max-w-sm bg-surface rounded-3xl shadow-2xl p-6 border border-app z-10 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <AlertTriangle size={24} />
                </div>
                <h4 className="text-lg font-bold text-app mb-1">¿Eliminar Cupón?</h4>
                <p className="text-xs text-muted mb-6">
                  Esta acción es permanente. ¿Seguro de eliminar el cupón <strong>{couponToDelete.code}</strong>?
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCouponToDelete(null)}
                    className="flex-1 py-3 bg-surface border border-app text-app font-bold text-xs rounded-xl active:scale-95 transition-all hover:bg-surface-2"
                  >
                    No, Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteCouponMutation.mutate(couponToDelete.id)
                      setCouponToDelete(null)
                    }}
                    className="flex-1 py-3 bg-red-500 text-white font-bold text-xs rounded-xl active:scale-95 transition-all hover:bg-red-600 shadow-lg shadow-red-500/20"
                  >
                    Sí, Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: VENTAS Y TRANSFERENCIAS ────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'ventas' && (
        <div className="bg-surface rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-app mb-2 flex items-center gap-2">
                WhatsApp para Pedidos
                <span className="text-xs font-normal text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-app">Sin el "+"</span>
              </label>
              <input
                type="tel"
                value={formData.whatsappAdmin}
                onChange={(e) => setFormData({ ...formData, whatsappAdmin: e.target.value })}
                placeholder="Ej. 573001234567"
                className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="pt-4 border-t border-app space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-app text-sm uppercase tracking-wider">Cuentas Bancarias para Transferencia</h3>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">El cliente elige</span>
              </div>

              {/* ── Cuenta Principal ── */}
              <div className="rounded-2xl border-2 border-app bg-surface-2/50 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-surface-2 border-b border-app">
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-black">1</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-app">Cuenta Principal</p>
                    <p className="text-[10px] text-muted">Siempre visible para el cliente</p>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5">Entidad Bancaria</label>
                    <input type="text" value={formData.bankInfo.banco}
                      onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, banco: e.target.value } })}
                      placeholder="Ej. Bancolombia, Nequi..."
                      className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5">Tipo de Cuenta</label>
                    <div className="relative">
                      <select value={formData.bankInfo.tipoCuenta}
                        onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, tipoCuenta: e.target.value } })}
                        className="w-full h-11 pl-4 pr-10 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors appearance-none"
                        style={{ borderRadius: 'var(--radius-base)' }}>
                        <option value="ahorros">Ahorros</option>
                        <option value="corriente">Corriente</option>
                        <option value="digital">Billetera Digital</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-muted mb-1.5">Número de Cuenta</label>
                    <input type="text" value={formData.bankInfo.numeroCuenta}
                      onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, numeroCuenta: e.target.value } })}
                      placeholder="Ej. 123-456789-00"
                      className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5">Titular</label>
                    <input type="text" value={formData.bankInfo.titular}
                      onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, titular: e.target.value } })}
                      placeholder="Nombre de quien recibe"
                      className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5">Cédula / NIT (Opcional)</label>
                    <input type="text" value={formData.bankInfo.cedulaNit}
                      onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, cedulaNit: e.target.value } })}
                      placeholder="Ej. 1234567890"
                      className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-muted mb-1.5">URL del Código QR de Pago</label>
                    <input type="text" value={formData.bankInfo.qrUrl || ''}
                      onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, qrUrl: e.target.value } })}
                      placeholder="Ej. https://url-de-tu-imagen-qr.png"
                      className="w-full h-11 px-4 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
              </div>

              {/* ── Cuenta Secundaria ── */}
              <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 ${formData.bankInfo2.activa ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-dashed border-app bg-surface-2/30'}`}>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-app/50">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${formData.bankInfo2.activa ? 'bg-emerald-500' : 'bg-app/30'}`}>
                    <span className="text-white text-xs font-black">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-app">Cuenta Secundaria</p>
                    <p className="text-[10px] text-muted">El cliente podrá elegir entre las dos cuentas</p>
                  </div>
                  {/* Toggle para activar/desactivar */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer"
                      checked={formData.bankInfo2.activa}
                      onChange={(e) => setFormData({ ...formData, bankInfo2: { ...formData.bankInfo2, activa: e.target.checked } })} />
                    <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                  </label>
                </div>
                {formData.bankInfo2.activa && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1.5">Entidad Bancaria</label>
                      <input type="text" value={formData.bankInfo2.banco}
                        onChange={(e) => setFormData({ ...formData, bankInfo2: { ...formData.bankInfo2, banco: e.target.value } })}
                        placeholder="Ej. Davivienda, Nequi..."
                        className="w-full h-11 px-4 rounded-xl bg-surface border border-emerald-500/30 text-sm text-app focus:outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1.5">Tipo de Cuenta</label>
                      <div className="relative">
                        <select value={formData.bankInfo2.tipoCuenta}
                          onChange={(e) => setFormData({ ...formData, bankInfo2: { ...formData.bankInfo2, tipoCuenta: e.target.value } })}
                          className="w-full h-11 pl-4 pr-10 rounded-xl bg-surface border border-emerald-500/30 text-sm text-app focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                          style={{ borderRadius: 'var(--radius-base)' }}>
                          <option value="ahorros">Ahorros</option>
                          <option value="corriente">Corriente</option>
                          <option value="digital">Billetera Digital</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-muted mb-1.5">Número de Cuenta</label>
                      <input type="text" value={formData.bankInfo2.numeroCuenta}
                        onChange={(e) => setFormData({ ...formData, bankInfo2: { ...formData.bankInfo2, numeroCuenta: e.target.value } })}
                        placeholder="Ej. 123-456789-00"
                        className="w-full h-11 px-4 rounded-xl bg-surface border border-emerald-500/30 text-sm text-app focus:outline-none focus:border-emerald-500 transition-colors font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1.5">Titular</label>
                      <input type="text" value={formData.bankInfo2.titular}
                        onChange={(e) => setFormData({ ...formData, bankInfo2: { ...formData.bankInfo2, titular: e.target.value } })}
                        placeholder="Nombre de quien recibe"
                        className="w-full h-11 px-4 rounded-xl bg-surface border border-emerald-500/30 text-sm text-app focus:outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1.5">Cédula / NIT (Opcional)</label>
                      <input type="text" value={formData.bankInfo2.cedulaNit}
                        onChange={(e) => setFormData({ ...formData, bankInfo2: { ...formData.bankInfo2, cedulaNit: e.target.value } })}
                        placeholder="Ej. 1234567890"
                        className="w-full h-11 px-4 rounded-xl bg-surface border border-emerald-500/30 text-sm text-app focus:outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-muted mb-1.5">URL del Código QR de Pago</label>
                      <input type="text" value={formData.bankInfo2.qrUrl || ''}
                        onChange={(e) => setFormData({ ...formData, bankInfo2: { ...formData.bankInfo2, qrUrl: e.target.value } })}
                        placeholder="Ej. https://url-de-tu-imagen-qr.png"
                        className="w-full h-11 px-4 rounded-xl bg-surface border border-emerald-500/30 text-sm text-app focus:outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                  </div>
                )}
                {!formData.bankInfo2.activa && (
                  <div className="px-4 py-5 text-center">
                    <p className="text-xs text-muted">Activa el toggle para agregar una segunda cuenta bancaria</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6 border-t border-app bg-surface-2/30 space-y-3">
            {/* Advertencia de cambio crítico */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-500/90 leading-relaxed">
                <strong>Dato crítico:</strong> El WhatsApp y la cuenta bancaria son visibles para tus clientes en el checkout. Verifica la información antes de guardar.
              </p>
            </div>
            <button onClick={() => {
              setCriticalConfirmText('')
              setCriticalConfirmModal({
                title: '⚠️ Cambio en Datos de Pago',
                desc: 'Estás a punto de modificar el número de WhatsApp y/o la cuenta bancaria. Tus clientes usarán estos datos para contactarte y realizar pagos. Un dato incorrecto puede causar pérdidas.\n\nEscribe CONFIRMAR para continuar.',
                onConfirm: handleSaveConfig
              })
            }} disabled={isSaving}
              className="w-full min-h-[52px] py-3 px-6 bg-amber-500 text-white rounded-xl font-bold text-sm transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-3 shadow-lg shadow-amber-500/30 disabled:opacity-50">
              {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Lock size={18} className="shrink-0" /> Guardar Datos Críticos</>}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: FILTROS DEL CATÁLOGO ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'filtros' && (
        <div className="bg-surface rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6">
            {formData.catalogFilters && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'categories', label: 'Categorías', desc: 'Permite filtrar por categorías en el inicio.' },
                    { key: 'sizes', label: 'Tallas', desc: 'Se asignan por cada variante de producto.' },
                    { key: 'colors', label: 'Colores', desc: 'Selector de color por variante.' }
                  ].map(filterObj => (
                    <div key={filterObj.key} className="flex items-start gap-3 p-4 rounded-xl border border-app bg-surface-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-app">{filterObj.label}</h3>
                        <p className="text-xs text-muted mt-1">{filterObj.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                        <input type="checkbox" className="sr-only peer"
                          checked={formData.catalogFilters[filterObj.key]}
                          onChange={(e) => setFormData({ ...formData, catalogFilters: { ...formData.catalogFilters, [filterObj.key]: e.target.checked } })} />
                        <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-app pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-app">Atributos Personalizados</h3>
                      <p className="text-xs text-muted">Crea campos extra para tus productos (Ej: Sabor, Marca).</p>
                    </div>
                    <button type="button" onClick={handleAddCustomAttribute}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors">
                      <Plus size={16} /> Añadir
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.catalogFilters.customAttributes?.map((attr, index) => (
                      <div key={attr.id} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 bg-surface-2 border border-app rounded-xl">
                        <div className="flex-1 w-full">
                          <input type="text" placeholder="Nombre (Ej. Marca)" value={attr.name}
                            onChange={(e) => handleCustomAttributeChange(index, 'name', e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-app bg-surface text-sm focus:border-primary outline-none" />
                        </div>
                        <div className="w-full sm:w-auto flex bg-surface border border-app rounded-lg overflow-hidden h-10 shrink-0">
                          <button type="button" onClick={() => handleCustomAttributeChange(index, 'type', 'text')}
                            className={`flex-1 px-3 text-xs font-bold transition-colors ${attr.type === 'text' ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'}`}>Texto</button>
                          <div className="w-px bg-app opacity-20"></div>
                          <button type="button" onClick={() => handleCustomAttributeChange(index, 'type', 'select')}
                            className={`flex-1 px-3 text-xs font-bold transition-colors ${attr.type === 'select' ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'}`}>Opciones</button>
                        </div>
                        {attr.type === 'select' && (
                          <div className="flex-[1.5] w-full">
                            <input type="text" placeholder="Opciones (Ej: Nike, Adidas)"
                              value={attr.options ? attr.options.join(', ') : ''}
                              onChange={(e) => handleCustomAttributeChange(index, 'options', e.target.value)}
                              className="w-full h-10 px-3 rounded-lg border border-app bg-surface text-sm focus:border-primary outline-none" />
                            <p className="text-[10px] text-muted mt-1 px-1">Separa las opciones con comas.</p>
                          </div>
                        )}
                        <button onClick={() => handleRemoveCustomAttribute(index)}
                          className="w-full sm:w-10 h-10 flex items-center justify-center shrink-0 rounded-lg text-muted hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-500/20 transition-colors">
                          <Trash2 size={16} /> <span className="sm:hidden text-sm ml-2">Eliminar</span>
                        </button>
                      </div>
                    ))}
                    {(!formData.catalogFilters.customAttributes || formData.catalogFilters.customAttributes.length === 0) && (
                      <div className="text-center py-6 text-muted text-sm border border-dashed border-app rounded-xl">
                        No has creado ningún atributo personalizado aún.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="p-5 border-t border-app bg-surface">
            <button onClick={handleSaveConfig} disabled={isSaving}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
              <Save size={18} /> Guardar Filtros
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: HERRAMIENTAS DE PRUEBAS ────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'developer' && (
        !isDevAuthenticated ? (
          renderDeveloperGate()
        ) : (
          <div>
            {/* SUBSECCIÓN MENU: Listado de Herramientas de Desarrollador */}
            {activeSubSection === null && (
              <div className="space-y-4">
                {/* Cabecera superior simple y limpia */}
                <div className="flex items-center justify-between px-1 py-1 flex-wrap gap-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">Módulos de desarrollo</p>
                  <button
                    onClick={() => {
                      setIsDevAuthenticated(false)
                      setDevPinInput('')
                    }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Lock size={12} /> Bloquear Sección
                  </button>
                </div>

                {/* Grid o lista de tarjetas independientes y premium */}
                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      id: 'dev-filtros',
                      label: 'Filtros del Catálogo',
                      description: 'Filtros y atributos personalizados de productos',
                      icon: Filter,
                      iconBg: 'bg-indigo-500/10 hover:bg-indigo-500/15',
                      iconColor: 'text-indigo-500'
                    },
                    {
                      id: 'dev-opt-comercial',
                      label: 'Optimización Comercial',
                      description: 'Aumenta la conversión, valor promedio y deseo de compra con herramientas inteligentes',
                      icon: TrendingUp,
                      iconBg: 'bg-amber-500/10 hover:bg-amber-500/15',
                      iconColor: 'text-amber-500'
                    },
                    {
                      id: 'dev-facturacion',
                      label: 'Facturación',
                      description: 'Comisiones y métricas de ventas en tiempo real',
                      icon: Receipt,
                      iconBg: 'bg-emerald-500/10 hover:bg-emerald-500/15',
                      iconColor: 'text-emerald-500'
                    },
                    {
                      id: 'dev-restauracion',
                      label: 'Restauración de la aplicación',
                      description: 'Limpia la base de datos a cero y valores por defecto (Borrado Real)',
                      icon: Trash2,
                      iconBg: 'bg-red-500/10 hover:bg-red-500/15',
                      iconColor: 'text-red-500'
                    },
                    {
                      id: 'dev-contacto',
                      label: 'Contacto del Desarrollador',
                      description: 'Configura el WhatsApp del desarrollador para la publicidad del cliente',
                      icon: Smartphone,
                      iconBg: 'bg-blue-500/10 hover:bg-blue-500/15',
                      iconColor: 'text-blue-500'
                    }
                  ].map(tool => {
                    const ToolIcon = tool.icon
                    return (
                      <motion.button
                        key={tool.id}
                        whileHover={{ scale: 1.015, y: -2 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => setActiveSubSection(tool.id)}
                        className="w-full flex items-center gap-4 p-5 bg-surface rounded-2xl transition-all text-left shadow-sm hover:shadow-md cursor-pointer group"
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${tool.iconBg}`}>
                          <ToolIcon size={22} className={tool.iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-app group-hover:text-primary transition-colors">{tool.label}</p>
                          <p className="text-xs text-muted mt-1 leading-relaxed">{tool.description}</p>
                        </div>
                        <ChevronRight size={18} className="text-muted shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 1. Subsección: Filtros del Catálogo */}
            {activeSubSection === 'dev-filtros' && (
              <div className="bg-surface rounded-3xl shadow-sm overflow-hidden">
                <div className="p-5 sm:p-6">
                  {formData.catalogFilters && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { key: 'categories', label: 'Categorías', desc: 'Permite filtrar por categorías en el inicio.' },
                          { key: 'sizes', label: 'Tallas', desc: 'Se asignan por cada variante de producto.' },
                          { key: 'colors', label: 'Colores', desc: 'Selector de color por variante.' }
                        ].map(filterObj => (
                          <div key={filterObj.key} className="flex items-start gap-3 p-4 rounded-xl border border-app bg-surface-2">
                            <div className="flex-1">
                              <h3 className="text-sm font-bold text-app">{filterObj.label}</h3>
                              <p className="text-xs text-muted mt-1">{filterObj.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                              <input type="checkbox" className="sr-only peer"
                                checked={formData.catalogFilters[filterObj.key]}
                                onChange={(e) => setFormData({ ...formData, catalogFilters: { ...formData.catalogFilters, [filterObj.key]: e.target.checked } })} />
                              <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 border-t border-app pt-6">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-bold text-app">Atributos Personalizados</h3>
                            <p className="text-xs text-muted">Crea campos extra para tus productos (Ej: Sabor, Marca).</p>
                          </div>
                          <button type="button" onClick={handleAddCustomAttribute}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors">
                            <Plus size={16} /> Añadir
                          </button>
                        </div>
                        <div className="space-y-3">
                          {formData.catalogFilters.customAttributes?.map((attr, index) => (
                            <div key={attr.id} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 bg-surface-2 border border-app rounded-xl">
                              <div className="flex-1 w-full">
                                <input type="text" placeholder="Nombre (Ej. Marca)" value={attr.name}
                                  onChange={(e) => handleCustomAttributeChange(index, 'name', e.target.value)}
                                  className="w-full h-10 px-3 rounded-lg border border-app bg-surface text-sm focus:border-primary outline-none" />
                              </div>
                              <div className="w-full sm:w-auto flex bg-surface border border-app rounded-lg overflow-hidden h-10 shrink-0">
                                <button type="button" onClick={() => handleCustomAttributeChange(index, 'type', 'text')}
                                  className={`flex-1 px-3 text-xs font-bold transition-colors ${attr.type === 'text' ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'}`}>Texto</button>
                                <div className="w-px bg-app opacity-20"></div>
                                <button type="button" onClick={() => handleCustomAttributeChange(index, 'type', 'select')}
                                  className={`flex-1 px-3 text-xs font-bold transition-colors ${attr.type === 'select' ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'}`}>Opciones</button>
                              </div>
                              {attr.type === 'select' && (
                                <div className="flex-[1.5] w-full">
                                  <input type="text" placeholder="Opciones (Ej: Nike, Adidas)"
                                    value={attr.options ? attr.options.join(', ') : ''}
                                    onChange={(e) => handleCustomAttributeChange(index, 'options', e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-app bg-surface text-sm focus:border-primary outline-none" />
                                  <p className="text-[10px] text-muted mt-1 px-1">Separa las opciones con comas.</p>
                                </div>
                              )}
                              <button onClick={() => handleRemoveCustomAttribute(index)}
                                className="w-full sm:w-10 h-10 flex items-center justify-center shrink-0 rounded-lg text-muted hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-500/20 transition-colors">
                                <Trash2 size={16} /> <span className="sm:hidden text-sm ml-2">Eliminar</span>
                              </button>
                            </div>
                          ))}
                          {(!formData.catalogFilters.customAttributes || formData.catalogFilters.customAttributes.length === 0) && (
                            <div className="text-center py-6 text-muted text-sm border border-dashed border-app rounded-xl">
                              No has creado ningún atributo personalizado aún.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="p-5 border-t border-app bg-surface">
                  <button onClick={handleSaveConfig} disabled={isSaving}
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                    <Save size={18} /> Guardar Filtros
                  </button>
                </div>
              </div>
            )}

            {/* 2. Subsección: Facturación */}
            {activeSubSection === 'dev-facturacion' && (() => {
              const currentPercent = billingMetrics?.commissionPercent ?? 1
              const inputVal = commissionInput !== null ? commissionInput : String(currentPercent)
              const fmt = (v) => `$${Number(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

              return (
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-surface to-teal-500/5 p-5">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/5 -translate-y-8 translate-x-8" />
                    <div className="relative flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                        <Receipt size={24} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-app mb-1">Módulo de Facturación</p>
                        <p className="text-xs text-muted leading-relaxed">
                          Inicialmente ya hiciste tu pago para iniciar el proyecto. Gracias por contribuir a mejorar tu negocio.
                        </p>
                      </div>
                    </div>
                  </div>

                  {billingLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-surface-2 border border-app rounded-2xl p-4 animate-pulse">
                          <div className="h-3 bg-app/20 rounded-full w-16 mb-3" />
                          <div className="h-7 bg-app/20 rounded-full w-24" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface-2 border border-app rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <ShoppingBag size={14} className="text-blue-500" />
                          </div>
                          <p className="text-xs text-muted font-medium">Ventas del mes</p>
                        </div>
                        <p className="text-xl font-black text-app">{fmt(billingMetrics?.totalMes)}</p>
                      </div>

                      <div className="bg-surface-2 border border-emerald-500/20 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Wallet size={14} className="text-emerald-500" />
                          </div>
                          <p className="text-xs text-muted font-medium">Mi comisión del mes</p>
                        </div>
                        <p className="text-xl font-black text-emerald-500">{fmt(billingMetrics?.comisionMes)}</p>
                      </div>

                      <div className="bg-surface-2 border border-app rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <TrendingUp size={14} className="text-purple-500" />
                          </div>
                          <p className="text-xs text-muted font-medium">Pedidos completados</p>
                        </div>
                        <p className="text-xl font-black text-app">{billingMetrics?.pedidosMes ?? 0}</p>
                        <p className="text-xs text-muted mt-0.5">este mes</p>
                      </div>

                      <div className="bg-surface-2 border border-app rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <BarChart3 size={14} className="text-amber-500" />
                          </div>
                          <p className="text-xs text-muted font-medium">Comisión acumulada</p>
                        </div>
                        <p className="text-xl font-black text-app">{fmt(billingMetrics?.comisionHistorica)}</p>
                        <p className="text-xs text-muted mt-0.5">histórico total</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-surface rounded-2xl border border-app overflow-hidden">
                    <div className="px-5 pt-5 pb-4">
                      <p className="text-sm font-bold text-app mb-1">Porcentaje de comisión</p>
                      <p className="text-xs text-muted mb-4">Se aplica sobre el total de cada pedido completado.</p>
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-app mb-1.5 block">Comisión por venta (%)</label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={inputVal}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9.]/g, '')
                                const parts = raw.split('.')
                                const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw
                                setCommissionInput(cleaned)
                              }}
                              onBlur={(e) => {
                                if (e.target.value.trim() === '') {
                                  setCommissionInput(String(currentPercent))
                                } else {
                                  const num = parseFloat(e.target.value)
                                  setCommissionInput(isNaN(num) ? String(currentPercent) : String(num))
                                }
                              }}
                              className="w-full h-11 pl-3 pr-8 rounded-xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">%</span>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const num = parseFloat(inputVal)
                            if (!isNaN(num) && num >= 0) {
                              try {
                                await savePercent(num)
                                setCommissionInput(null)
                                setSaveMessage({ type: 'success', text: `Comisión actualizada al ${num}%` })
                                setTimeout(() => setSaveMessage(null), 3000)
                              } catch (error) {
                                setSaveMessage({ type: 'error', text: 'Error al actualizar la comisión.' })
                                setTimeout(() => setSaveMessage(null), 3000)
                              }
                            }
                          }}
                          disabled={billingIsSaving}
                          className="h-11 px-5 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2 shrink-0 disabled:opacity-60"
                          style={{ background: 'var(--color-primary)', color: 'white' }}
                        >
                          <Save size={16} className={billingIsSaving ? 'animate-spin opacity-40' : ''} />
                          {billingIsSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {!billingLoading && billingMetrics && (
                    <>
                      <div className="bg-surface rounded-2xl border border-app overflow-hidden">
                        <div className="px-5 py-4 border-b border-app">
                          <p className="text-sm font-bold text-app">Resumen de comisiones</p>
                          <p className="text-xs text-muted">Totales calculados sobre pedidos completados</p>
                        </div>
                        <div className="divide-y divide-app">
                          {[
                            { label: 'Ventas del mes', value: fmt(billingMetrics.totalMes), sub: `${billingMetrics.pedidosMes} pedidos completados` },
                            { label: 'Comisión del mes', value: fmt(billingMetrics.comisionMes), highlight: true },
                            { label: 'Total ventas histórico', value: fmt(billingMetrics.totalHistorico), sub: 'Todos los tiempos' },
                            { label: 'Comisión histórica acumulada', value: fmt(billingMetrics.comisionHistorica), highlight: true },
                          ].map((row, i) => (
                            <div key={i} className="flex items-center justify-between px-5 py-3.5">
                              <div>
                                <p className="text-xs font-semibold text-app">{row.label}</p>
                                {row.sub && <p className="text-[10px] text-muted mt-0.5">{row.sub}</p>}
                              </div>
                              <p className={`text-sm font-black ${row.highlight ? 'text-emerald-500' : 'text-app'}`}>{row.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-surface rounded-2xl shadow-sm p-5 space-y-4">
                        <div>
                          <p className="text-sm font-bold text-app mb-1">Generar Recibo y Firma de Conformidad</p>
                          <p className="text-xs text-muted leading-relaxed">
                            Genera el recibo detallado de comisiones mensuales para que el cliente lo firme y lo exporte en PDF.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => {
                              setIsSignatureModalOpen(true)
                              setTimeout(() => clearCanvas(), 50)
                            }}
                            className="h-11 px-5 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-sm"
                          >
                            <Receipt size={16} />
                            Firmar y Exportar Recibo del Mes
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isSignatureModalOpen && (
                          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => setIsSignatureModalOpen(false)}
                              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
                            />
                            <motion.div
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.95, opacity: 0 }}
                              className="bg-surface rounded-3xl p-6 shadow-2xl relative max-w-sm w-full mx-4 space-y-4"
                            >
                              <div className="flex items-center justify-between border-b border-primary/5 pb-3">
                                <div>
                                  <h3 className="text-sm font-bold text-app">Firma de Conformidad</h3>
                                  <p className="text-[10px] text-muted">Dibuja la firma táctil del cliente en el recuadro</p>
                                </div>
                                <button
                                  onClick={() => setIsSignatureModalOpen(false)}
                                  className="w-8 h-8 rounded-xl bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted cursor-pointer"
                                >
                                  <X size={16} />
                                </button>
                              </div>

                              <div className="bg-surface-2 rounded-2xl overflow-hidden flex flex-col items-center p-2 shadow-inner">
                                <canvas
                                  ref={canvasRef}
                                  width={300}
                                  height={150}
                                  onMouseDown={startDrawing}
                                  onMouseMove={draw}
                                  onMouseUp={stopDrawing}
                                  onMouseLeave={stopDrawing}
                                  onTouchStart={startDrawing}
                                  onTouchMove={draw}
                                  onTouchEnd={stopDrawing}
                                  className="bg-white rounded-xl cursor-crosshair max-w-full"
                                  style={{ display: 'block', touchAction: 'none' }}
                                />
                              </div>

                              <div className="flex gap-3 pt-2">
                                <button
                                  onClick={clearCanvas}
                                  className="flex-1 h-11 rounded-xl font-bold text-xs bg-surface-2 hover:bg-surface-3 text-app active:scale-95 transition-all cursor-pointer"
                                >
                                  Limpiar Firma
                                </button>
                                <button
                                  onClick={handleExportDeveloperReceiptPDF}
                                  className="flex-1 h-11 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 transition-all cursor-pointer"
                                >
                                  Generar PDF
                                </button>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              )
            })()}

            {/* 3. Subsección: Restauración de la aplicación */}
            {activeSubSection === 'dev-restauracion' && (
              <div className="bg-surface rounded-3xl border border-red-500/20 shadow-sm overflow-hidden">
                <div className="p-5 sm:p-6 bg-red-500/5">
                  <p className="text-sm text-app/70">Restaura la aplicación a sus valores iniciales eliminando todos los datos de negocio de forma real.</p>
                </div>
                <div className="p-5 sm:p-6">
                  {message && (
                    <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${message.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-success/10 text-success'}`}>
                      {message.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                      <p className="text-sm font-bold mt-0.5">{message.text}</p>
                    </div>
                  )}
                  <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-6">
                    <h3 className="font-bold text-red-500 mb-2 flex items-center gap-2">
                      <AlertTriangle size={18} /> ¡ADVERTENCIA DE ACCIÓN DESTRUCTIVA!
                    </h3>
                    <p className="text-sm text-app/80 mb-4">
                      Esta acción eliminará de forma <strong>permanente y real</strong> todos los productos, categorías, cupones, anuncios, pedidos, créditos y usuarios (excepto tu cuenta de administrador actual). Esto dejará la base de datos totalmente vacía para poder entregar o replicar la aplicación en otro cliente.
                    </p>
                    
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-app/60 uppercase mb-2">
                        Escribe <span className="text-red-500 font-extrabold">RESTAURAR</span> para confirmar:
                      </label>
                      <input
                        type="text"
                        placeholder="Escribe aquí..."
                        id="confirmRestoreInput"
                        value={confirmRestoreText}
                        className="w-full h-11 px-4 rounded-xl bg-surface border border-red-500/20 text-app focus:outline-none focus:border-red-500 font-bold tracking-wider"
                        onChange={(e) => setConfirmRestoreText(e.target.value)}
                      />
                    </div>

                    <button
                      id="btnExecuteRestore"
                      onClick={handleFullReset}
                      disabled={confirmRestoreText !== 'RESTAURAR' || loading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 min-h-12 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all disabled:opacity-30 disabled:hover:bg-red-500 text-center"
                    >
                      <Trash2 size={16} className="shrink-0" /> <span>Restaurar Aplicación a Cero (Borrado Real)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Subsección: Contacto del Desarrollador */}
            {activeSubSection === 'dev-contacto' && (
              <div className="bg-surface rounded-3xl shadow-sm overflow-hidden">
                <div className="p-5 sm:p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-app mb-2 flex items-center gap-2">
                      WhatsApp del Desarrollador
                      <span className="text-xs font-normal text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-app">Sin el "+"</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.developerPhone || ''}
                      onChange={(e) => setFormData({ ...formData, developerPhone: e.target.value })}
                      placeholder="Ej. 573001234567"
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                    />
                    <p className="text-xs text-muted mt-2">
                      Este número se usará para que los clientes te contacten si están interesados en una aplicación para su propio negocio.
                    </p>
                  </div>
                </div>
                <div className="p-5 border-t border-app bg-surface">
                  <button onClick={handleSaveConfig} disabled={isSaving}
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                    <Save size={18} /> Guardar Contacto
                  </button>
                </div>
              </div>
            )}

            {/* 5. Subsección: Optimización Comercial */}
            {activeSubSection === 'dev-opt-comercial' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-surface rounded-3xl shadow-sm border border-app overflow-hidden">
                  {/* Cabecera Única */}
                  <div className="p-5 sm:p-6 border-b border-app bg-surface-2/30">
                    <h3 className="text-base font-extrabold text-app flex items-center gap-2">
                      <Sparkles size={18} className="text-amber-500" />
                      Optimización Comercial y Conversión
                    </h3>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Activa y personaliza las herramientas inteligentes para potenciar las ventas y conversión de tu catálogo.
                    </p>
                  </div>

                  {/* Lista unificada de opciones */}
                  <div className="divide-y divide-app">
                    {/* H1: Etiquetas Inteligentes */}
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 pr-4">
                          <span className="font-bold text-app text-sm flex items-center gap-1.5">
                            <Tag size={15} className="text-primary" />
                            1. Etiquetas Inteligentes de Conversión
                          </span>
                          <span className="text-xs text-muted mt-0.5 block leading-relaxed">
                            Indicadores visuales en las tarjetas (Más Vendido, Oferta Imperdible, etc.) para generar urgencia de compra.
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={formData.commercialOptimization.tools?.smartTags?.enabled ?? true}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                commercialOptimization: {
                                  ...formData.commercialOptimization,
                                  tools: {
                                    ...formData.commercialOptimization.tools,
                                    smartTags: {
                                      ...formData.commercialOptimization.tools.smartTags,
                                      enabled: e.target.checked
                                    }
                                  }
                                }
                              })
                            }}
                          />
                          <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                        </label>
                      </div>

                      {formData.commercialOptimization.tools?.smartTags?.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-app border-dashed animate-in fade-in">
                          {/* Más Vendido */}
                          <div className="bg-surface-2 p-4 rounded-2xl border border-app space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-app">Etiqueta: Más Vendido</span>
                              <input
                                type="checkbox"
                                checked={formData.commercialOptimization.tools.smartTags.bestSeller?.enabled ?? true}
                                onChange={(e) => {
                                  const tags = { ...formData.commercialOptimization.tools.smartTags }
                                  tags.bestSeller.enabled = e.target.checked
                                  setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Texto</label>
                                <input
                                  type="text"
                                  value={formData.commercialOptimization.tools.smartTags.bestSeller?.text || ''}
                                  onChange={(e) => {
                                    const tags = { ...formData.commercialOptimization.tools.smartTags }
                                    tags.bestSeller.text = e.target.value
                                    setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                  }}
                                  className="w-full h-9 px-2 rounded-lg bg-surface border border-app text-app focus:outline-none text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Ventas Mínimas</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={formData.commercialOptimization.tools.smartTags.bestSeller?.minSales ?? 5}
                                  onChange={(e) => {
                                    const tags = { ...formData.commercialOptimization.tools.smartTags }
                                    tags.bestSeller.minSales = Number(e.target.value)
                                    setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                  }}
                                  className="w-full h-9 px-2 rounded-lg bg-surface border border-app text-app focus:outline-none text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Color Fondo</label>
                                <div className="flex items-center gap-1 h-9 bg-surface border border-app rounded-lg px-1">
                                  <input
                                    type="color"
                                    value={formData.commercialOptimization.tools.smartTags.bestSeller?.bg || '#ef4444'}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.bestSeller.bg = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-5 h-5 rounded border border-app cursor-pointer shrink-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    placeholder="#EF4444"
                                    value={formData.commercialOptimization.tools.smartTags.bestSeller?.bg || ''}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.bestSeller.bg = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-full bg-transparent text-app focus:outline-none text-[10px] font-mono uppercase"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Color Texto</label>
                                <div className="flex items-center gap-1 h-9 bg-surface border border-app rounded-lg px-1">
                                  <input
                                    type="color"
                                    value={formData.commercialOptimization.tools.smartTags.bestSeller?.textCol || '#ffffff'}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.bestSeller.textCol = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-5 h-5 rounded border border-app cursor-pointer shrink-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    placeholder="#FFFFFF"
                                    value={formData.commercialOptimization.tools.smartTags.bestSeller?.textCol || ''}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.bestSeller.textCol = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-full bg-transparent text-app focus:outline-none text-[10px] font-mono uppercase"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Oferta Imperdible */}
                          <div className="bg-surface-2 p-4 rounded-2xl border border-app space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-app">Etiqueta: Oferta</span>
                              <input
                                type="checkbox"
                                checked={formData.commercialOptimization.tools.smartTags.unmissableOffer?.enabled ?? true}
                                onChange={(e) => {
                                  const tags = { ...formData.commercialOptimization.tools.smartTags }
                                  tags.unmissableOffer.enabled = e.target.checked
                                  setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Texto</label>
                                <input
                                  type="text"
                                  value={formData.commercialOptimization.tools.smartTags.unmissableOffer?.text || ''}
                                  onChange={(e) => {
                                    const tags = { ...formData.commercialOptimization.tools.smartTags }
                                    tags.unmissableOffer.text = e.target.value
                                    setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                  }}
                                  className="w-full h-9 px-2 rounded-lg bg-surface border border-app text-app focus:outline-none text-xs"
                                />
                              </div>
                              <div />
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Color Fondo</label>
                                <div className="flex items-center gap-1 h-9 bg-surface border border-app rounded-lg px-1">
                                  <input
                                    type="color"
                                    value={formData.commercialOptimization.tools.smartTags.unmissableOffer?.bg || '#f59e0b'}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.unmissableOffer.bg = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-5 h-5 rounded border border-app cursor-pointer shrink-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    placeholder="#F59E0B"
                                    value={formData.commercialOptimization.tools.smartTags.unmissableOffer?.bg || ''}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.unmissableOffer.bg = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-full bg-transparent text-app focus:outline-none text-[10px] font-mono uppercase"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Color Texto</label>
                                <div className="flex items-center gap-1 h-9 bg-surface border border-app rounded-lg px-1">
                                  <input
                                    type="color"
                                    value={formData.commercialOptimization.tools.smartTags.unmissableOffer?.textCol || '#ffffff'}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.unmissableOffer.textCol = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-5 h-5 rounded border border-app cursor-pointer shrink-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    placeholder="#FFFFFF"
                                    value={formData.commercialOptimization.tools.smartTags.unmissableOffer?.textCol || ''}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.unmissableOffer.textCol = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-full bg-transparent text-app focus:outline-none text-[10px] font-mono uppercase"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Última Unidad */}
                          <div className="bg-surface-2 p-4 rounded-2xl border border-app space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-app">Etiqueta: Última Unidad</span>
                              <input
                                type="checkbox"
                                checked={formData.commercialOptimization.tools.smartTags.lastUnit?.enabled ?? true}
                                onChange={(e) => {
                                  const tags = { ...formData.commercialOptimization.tools.smartTags }
                                  tags.lastUnit.enabled = e.target.checked
                                  setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Texto</label>
                                <input
                                  type="text"
                                  value={formData.commercialOptimization.tools.smartTags.lastUnit?.text || ''}
                                  onChange={(e) => {
                                    const tags = { ...formData.commercialOptimization.tools.smartTags }
                                    tags.lastUnit.text = e.target.value
                                    setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                  }}
                                  className="w-full h-9 px-2 rounded-lg bg-surface border border-app text-app focus:outline-none text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Umbral Stock</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={formData.commercialOptimization.tools.smartTags.lastUnit?.threshold ?? 3}
                                  onChange={(e) => {
                                    const tags = { ...formData.commercialOptimization.tools.smartTags }
                                    tags.lastUnit.threshold = Number(e.target.value)
                                    setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                  }}
                                  className="w-full h-9 px-2 rounded-lg bg-surface border border-app text-app focus:outline-none text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Color Fondo</label>
                                <div className="flex items-center gap-1 h-9 bg-surface border border-app rounded-lg px-1">
                                  <input
                                    type="color"
                                    value={formData.commercialOptimization.tools.smartTags.lastUnit?.bg || '#3b82f6'}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.lastUnit.bg = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-5 h-5 rounded border border-app cursor-pointer shrink-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    placeholder="#3B82F6"
                                    value={formData.commercialOptimization.tools.smartTags.lastUnit?.bg || ''}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.lastUnit.bg = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-full bg-transparent text-app focus:outline-none text-[10px] font-mono uppercase"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Color Texto</label>
                                <div className="flex items-center gap-1 h-9 bg-surface border border-app rounded-lg px-1">
                                  <input
                                    type="color"
                                    value={formData.commercialOptimization.tools.smartTags.lastUnit?.textCol || '#ffffff'}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.lastUnit.textCol = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-5 h-5 rounded border border-app cursor-pointer shrink-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    placeholder="#FFFFFF"
                                    value={formData.commercialOptimization.tools.smartTags.lastUnit?.textCol || ''}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.lastUnit.textCol = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-full bg-transparent text-app focus:outline-none text-[10px] font-mono uppercase"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Nuevo */}
                          <div className="bg-surface-2 p-4 rounded-2xl border border-app space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-app">Etiqueta: Nuevo</span>
                              <input
                                type="checkbox"
                                checked={formData.commercialOptimization.tools.smartTags.newProduct?.enabled ?? true}
                                onChange={(e) => {
                                  const tags = { ...formData.commercialOptimization.tools.smartTags }
                                  tags.newProduct.enabled = e.target.checked
                                  setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Texto</label>
                                <input
                                  type="text"
                                  value={formData.commercialOptimization.tools.smartTags.newProduct?.text || ''}
                                  onChange={(e) => {
                                    const tags = { ...formData.commercialOptimization.tools.smartTags }
                                    tags.newProduct.text = e.target.value
                                    setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                  }}
                                  className="w-full h-9 px-2 rounded-lg bg-surface border border-app text-app focus:outline-none text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Días Límite</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={formData.commercialOptimization.tools.smartTags.newProduct?.daysLimit ?? 7}
                                  onChange={(e) => {
                                    const tags = { ...formData.commercialOptimization.tools.smartTags }
                                    tags.newProduct.daysLimit = Number(e.target.value)
                                    setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                  }}
                                  className="w-full h-9 px-2 rounded-lg bg-surface border border-app text-app focus:outline-none text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Color Fondo</label>
                                <div className="flex items-center gap-1 h-9 bg-surface border border-app rounded-lg px-1">
                                  <input
                                    type="color"
                                    value={formData.commercialOptimization.tools.smartTags.newProduct?.bg || '#10b981'}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.newProduct.bg = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-5 h-5 rounded border border-app cursor-pointer shrink-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    placeholder="#10B981"
                                    value={formData.commercialOptimization.tools.smartTags.newProduct?.bg || ''}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.newProduct.bg = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-full bg-transparent text-app focus:outline-none text-[10px] font-mono uppercase"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] text-muted block mb-1">Color Texto</label>
                                <div className="flex items-center gap-1 h-9 bg-surface border border-app rounded-lg px-1">
                                  <input
                                    type="color"
                                    value={formData.commercialOptimization.tools.smartTags.newProduct?.textCol || '#ffffff'}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.newProduct.textCol = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-5 h-5 rounded border border-app cursor-pointer shrink-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    placeholder="#FFFFFF"
                                    value={formData.commercialOptimization.tools.smartTags.newProduct?.textCol || ''}
                                    onChange={(e) => {
                                      const tags = { ...formData.commercialOptimization.tools.smartTags }
                                      tags.newProduct.textCol = e.target.value
                                      setFormData({ ...formData, commercialOptimization: { ...formData.commercialOptimization, tools: { ...formData.commercialOptimization.tools, smartTags: tags } } })
                                    }}
                                    className="w-full bg-transparent text-app focus:outline-none text-[10px] font-mono uppercase"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* H2: Galería Avanzada */}
                    <div className="p-5 sm:p-6 flex items-center justify-between">
                      <div className="flex-1 pr-4">
                        <span className="font-bold text-app text-sm flex items-center gap-1.5">
                          <Building2 size={15} className="text-primary" />
                          2. Experiencia de Galería Avanzada de Imágenes
                        </span>
                        <span className="text-xs text-muted leading-relaxed mt-0.5 block">
                          Habilita un carrusel táctil interactivo en la ficha detallada si existen imágenes secundarias en el inventario.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.commercialOptimization.tools?.advancedGallery?.enabled ?? true}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              commercialOptimization: {
                                ...formData.commercialOptimization,
                                tools: {
                                  ...formData.commercialOptimization.tools,
                                  advancedGallery: { enabled: e.target.checked }
                                }
                              }
                            })
                          }}
                        />
                        <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>

                    {/* H3: Recomendaciones en Carrito */}
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 pr-4">
                          <span className="font-bold text-app text-sm flex items-center gap-1.5">
                            <ShoppingBag size={15} className="text-primary" />
                            3. Recomendaciones Inteligentes en Carrito
                          </span>
                          <span className="text-xs text-muted leading-relaxed mt-0.5 block">
                            Muestra sugerencias de compra complementarias (relacionados, más vendidos, ofertas) directamente dentro del carrito del cliente.
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={formData.commercialOptimization.tools?.cartRecommendations?.enabled ?? true}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                commercialOptimization: {
                                  ...formData.commercialOptimization,
                                  tools: {
                                    ...formData.commercialOptimization.tools,
                                    cartRecommendations: {
                                      ...formData.commercialOptimization.tools.cartRecommendations,
                                      enabled: e.target.checked
                                    }
                                  }
                                }
                              })
                            }}
                          />
                          <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                        </label>
                      </div>

                      {formData.commercialOptimization.tools?.cartRecommendations?.enabled && (
                        <div className="pt-3 border-t border-app border-dashed animate-in fade-in">
                          <label className="text-[10px] text-muted block mb-1 font-bold">Título del Módulo Recomendador</label>
                          <input
                            type="text"
                            value={formData.commercialOptimization.tools.cartRecommendations.title || ''}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                commercialOptimization: {
                                  ...formData.commercialOptimization,
                                  tools: {
                                    ...formData.commercialOptimization.tools,
                                    cartRecommendations: {
                                      ...formData.commercialOptimization.tools.cartRecommendations,
                                      title: e.target.value
                                    }
                                  }
                                }
                              })
                            }}
                            className="w-full sm:w-1/2 h-10 px-3 rounded-lg bg-surface border border-app text-app focus:outline-none text-xs"
                          />
                        </div>
                      )}
                    </div>

                    {/* H4: Recomendaciones por Historial */}
                    <div className="p-5 sm:p-6 flex items-center justify-between">
                      <div className="flex-1 pr-4">
                        <span className="font-bold text-app text-sm flex items-center gap-1.5">
                          <ShoppingBag size={15} className="text-primary" />
                          4. Sugerencias Basadas en Historial del Cliente
                        </span>
                        <span className="text-xs text-muted leading-relaxed mt-0.5 block">
                          Si el cliente tiene compras previas, recomienda categorías vinculadas a sus preferencias históricas. Si no, aplica el fallback de más vendidos.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.commercialOptimization.tools?.historyRecommendations?.enabled ?? true}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              commercialOptimization: {
                                ...formData.commercialOptimization,
                                tools: {
                                  ...formData.commercialOptimization.tools,
                                  historyRecommendations: { enabled: e.target.checked }
                                }
                              }
                            })
                          }}
                        />
                        <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Botón de Guardado */}
                <div className="p-5 border-t border-app bg-surface rounded-3xl shadow-sm border">
                  <button onClick={handleSaveConfig} disabled={isSaving}
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                    <Save size={18} /> Guardar Configuración Comercial
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: SEGURIDAD Y ACCESOS ────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'seguridad' && (
        <div className="bg-surface rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 bg-surface-2">
            <div className="bg-surface border border-orange-500/20 rounded-2xl p-5 md:p-6">
              <form onSubmit={handleUpdateCredentials} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-app mb-2 flex items-center gap-2">
                    <KeyRound size={16} className="text-orange-500" />
                    Contraseña Actual (Requerida por seguridad)
                  </label>
                  <div className="relative">
                    <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Tu contraseña actual"
                      className="w-full h-12 px-4 pr-12 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-orange-500 transition-colors" />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app">
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="border-t border-app"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-app mb-2 flex items-center gap-2">
                      <Mail size={16} className="text-primary" /> Nuevo Correo (Opcional)
                    </label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={auth.currentUser?.email || "correo@ejemplo.com"}
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-app mb-2 flex items-center gap-2">
                      <Lock size={16} className="text-primary" /> Nueva Contraseña (Opcional)
                    </label>
                    <div className="relative">
                      <input type={showNewPassword ? 'text' : 'password'} value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                        className="w-full h-12 px-4 pr-12 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app">
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
                {authMessage && (
                  <div className={`p-4 rounded-xl flex items-start gap-3 border ${authMessage.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                    {authMessage.type === 'error' ? <AlertTriangle size={20} className="shrink-0" /> : <CheckCircle size={20} className="shrink-0" />}
                    <p className="text-sm font-bold mt-0.5">{authMessage.text}</p>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={authLoading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors disabled:opacity-50">
                    {authLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={18} /> Actualizar Credenciales</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── VISTA: DESCARGAR APLICACIÓN (PWA) ────────────────────────────────── */}
      {activeSection === 'pwa' && (
        <div className="bg-surface rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 text-primary relative shadow-inner">
              {config.appIcon ? (
                <img src={config.appIcon} alt="App Logo" className="w-full h-full object-cover rounded-3xl" />
              ) : (
                <Smartphone size={40} />
              )}
            </div>
            
            <h3 className="text-lg font-bold text-app mb-2">{config.appName || 'App Ventas'}</h3>
            <p className="text-sm text-muted max-w-sm mb-6 leading-relaxed">
              Instala esta aplicación en tu dispositivo para disfrutar de un acceso rápido, mejor rendimiento y una experiencia de pantalla completa sin barra de navegación.
            </p>

            {!isStandalone ? (
              <div className="w-full flex flex-col items-center gap-4">
                <button
                  onClick={rawInstallable ? handleInstall : () => {
                    if (isIOS) {
                      alert("📱 Para instalar en iOS:\n\n1. Pulsa el botón de Compartir (↑) en la barra inferior de Safari.\n2. Selecciona 'Agregar a la pantalla de inicio'.")
                    } else {
                      alert("📥 Para instalar en Android/Chrome:\n\n1. Toca los tres puntos (⋮) del menú.\n2. Elige 'Instalar aplicación' o 'Agregar a la pantalla principal'.")
                    }
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                  style={{ borderRadius: 'var(--radius-base)' }}
                >
                  <Download size={18} />
                  Instalar en este Dispositivo
                </button>

                {/* Mostrar instrucciones secundarias de apoyo abajo del botón */}
                <div className="w-full p-4 rounded-2xl bg-surface-2 border border-app text-sm text-muted">
                  {isIOS ? (
                    <div className="text-xs text-muted leading-relaxed text-left max-w-md">
                      📱 <strong>Instrucciones para iPhone/iPad:</strong> pulsa el botón de <strong>Compartir</strong> <span className="text-primary font-bold">↑</span> en la barra inferior de Safari y luego selecciona <strong>"Agregar a la pantalla de inicio"</strong>.
                    </div>
                  ) : (
                    <div className="text-left space-y-2.5">
                      <p className="font-semibold text-app text-xs uppercase tracking-wider text-center mb-1">¿No aparece el instalador directo?</p>
                      <p className="text-xs leading-relaxed text-muted">
                        Puedes instalarla manualmente en tu dispositivo siguiendo estos pasos en Chrome:
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted leading-relaxed">
                        <li>Toca el menú de <strong>tres puntos</strong> <strong className="text-app">(⋮)</strong> en la parte superior derecha de tu navegador Chrome.</li>
                        <li>Selecciona la opción <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</li>
                        <li>Confirma en la ventana emergente y se añadirá el ícono de acceso rápido.</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full p-4 rounded-2xl bg-surface-2 border border-app text-sm text-muted">
                <p className="font-semibold text-primary flex items-center justify-center gap-2">
                  <CheckCircle size={18} />
                  ¡Ya estás ejecutando la aplicación instalada!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── VISTA: FACTURACIÓN ──────────────────────────────────────────────────── */}
      {activeSection === 'facturacion' && (
        !isDevAuthenticated ? (
          renderDeveloperGate()
        ) : (() => {
          // Sincronizar el input con el valor real cuando llegan los datos por primera vez
          const currentPercent = billingMetrics?.commissionPercent ?? 1

          const inputVal = commissionInput !== null ? commissionInput : String(currentPercent)

          // Función de formato de moneda
          const fmt = (v) => `$${Number(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

          return (
            <div className="space-y-4">
              {/* Botón flotante superior de bloqueo */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setIsDevAuthenticated(false)
                    setDevPinInput('')
                  }}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Lock size={12} /> Bloquear Sección
                </button>
              </div>

            {/* Banner de bienvenida */}
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-surface to-teal-500/5 p-5">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/5 -translate-y-8 translate-x-8" />
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Receipt size={24} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-app mb-1">Módulo de Facturación</p>
                  <p className="text-xs text-muted leading-relaxed">
                    Inicialmente ya hiciste tu pago para iniciar el proyecto. Gracias por contribuir a mejorar tu negocio.
                  </p>
                </div>
              </div>
            </div>

            {/* Cards de métricas */}
            {billingLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-surface-2 border border-app rounded-2xl p-4 animate-pulse">
                    <div className="h-3 bg-app/20 rounded-full w-16 mb-3" />
                    <div className="h-7 bg-app/20 rounded-full w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Ventas del mes */}
                <div className="bg-surface-2 border border-app rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <ShoppingBag size={14} className="text-blue-500" />
                    </div>
                    <p className="text-xs text-muted font-medium">Ventas del mes</p>
                  </div>
                  <p className="text-xl font-black text-app">{fmt(billingMetrics?.totalMes)}</p>
                </div>

                {/* Comisión del mes */}
                <div className="bg-surface-2 border border-emerald-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Wallet size={14} className="text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted font-medium">Mi comisión del mes</p>
                  </div>
                  <p className="text-xl font-black text-emerald-500">{fmt(billingMetrics?.comisionMes)}</p>
                </div>

                {/* Pedidos completados */}
                <div className="bg-surface-2 border border-app rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <TrendingUp size={14} className="text-purple-500" />
                    </div>
                    <p className="text-xs text-muted font-medium">Pedidos completados</p>
                  </div>
                  <p className="text-xl font-black text-app">{billingMetrics?.pedidosMes ?? 0}</p>
                  <p className="text-xs text-muted mt-0.5">este mes</p>
                </div>

                {/* Comisión histórica */}
                <div className="bg-surface-2 border border-app rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <BarChart3 size={14} className="text-amber-500" />
                    </div>
                    <p className="text-xs text-muted font-medium">Comisión acumulada</p>
                  </div>
                  <p className="text-xl font-black text-app">{fmt(billingMetrics?.comisionHistorica)}</p>
                  <p className="text-xs text-muted mt-0.5">histórico total</p>
                </div>
              </div>
            )}

            {/* Configuración del porcentaje */}
            <div className="bg-surface rounded-2xl border border-app overflow-hidden">
              <div className="px-5 pt-5 pb-4">
                <p className="text-sm font-bold text-app mb-1">Porcentaje de comisión</p>
                <p className="text-xs text-muted mb-4">Se aplica sobre el total de cada pedido completado.</p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-app mb-1.5 block">Comisión por venta (%)</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={inputVal}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '')
                          const parts = raw.split('.')
                          const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw
                          setCommissionInput(cleaned)
                        }}
                        onBlur={(e) => {
                          if (e.target.value.trim() === '') {
                            setCommissionInput(String(currentPercent))
                          } else {
                            const num = parseFloat(e.target.value)
                            setCommissionInput(isNaN(num) ? String(currentPercent) : String(num))
                          }
                        }}
                        className="w-full h-11 pl-3 pr-8 rounded-xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">%</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const num = parseFloat(inputVal)
                      if (!isNaN(num) && num >= 0) {
                        try {
                          await savePercent(num)
                          setCommissionInput(null)
                          setSaveMessage({ type: 'success', text: `Comisión actualizada al ${num}%` })
                          setTimeout(() => setSaveMessage(null), 3000)
                        } catch (error) {
                          setSaveMessage({ type: 'error', text: 'Error al actualizar la comisión.' })
                          setTimeout(() => setSaveMessage(null), 3000)
                        }
                      }
                    }}
                    disabled={billingIsSaving}
                    className="h-11 px-5 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2 shrink-0 disabled:opacity-60"
                    style={{ background: 'var(--color-primary)', color: 'white' }}
                  >
                    <Save size={16} className={billingIsSaving ? 'animate-spin opacity-40' : ''} />
                    {billingIsSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Resumen compacto del historial */}
            {!billingLoading && billingMetrics && (<>
              <div className="bg-surface rounded-2xl border border-app overflow-hidden">
                <div className="px-5 py-4 border-b border-app">
                  <p className="text-sm font-bold text-app">Resumen de comisiones</p>
                  <p className="text-xs text-muted">Totales calculados sobre pedidos completados</p>
                </div>
                <div className="divide-y divide-app">
                  {[
                    { label: 'Ventas del mes', value: fmt(billingMetrics.totalMes), sub: `${billingMetrics.pedidosMes} pedidos completados` },
                    { label: 'Comisión del mes', value: fmt(billingMetrics.comisionMes), highlight: true },
                    { label: 'Total ventas histórico', value: fmt(billingMetrics.totalHistorico), sub: 'Todos los tiempos' },
                    { label: 'Comisión histórica acumulada', value: fmt(billingMetrics.comisionHistorica), highlight: true },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-xs font-semibold text-app">{row.label}</p>
                        {row.sub && <p className="text-[10px] text-muted mt-0.5">{row.sub}</p>}
                      </div>
                      <p className={`text-sm font-black ${row.highlight ? 'text-emerald-500' : 'text-app'}`}>{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generar Recibo de Cobro y Firma */}
              <div className="bg-surface rounded-2xl shadow-sm p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-app mb-1">Generar Recibo y Firma de Conformidad</p>
                  <p className="text-xs text-muted leading-relaxed">
                    Genera el recibo detallado de comisiones mensuales para que el cliente lo firme y lo exporte en PDF.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setIsSignatureModalOpen(true)
                      setTimeout(() => clearCanvas(), 50)
                    }}
                    className="h-11 px-5 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-sm"
                  >
                    <Receipt size={16} />
                    Firmar y Exportar Recibo del Mes
                  </button>
                </div>
              </div>

              {/* Modal de Firma Digital Canvas */}
              <AnimatePresence>
                {isSignatureModalOpen && (
                  <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsSignatureModalOpen(false)}
                      style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
                    />
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-surface rounded-3xl p-6 shadow-2xl relative max-w-sm w-full mx-4 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-primary/5 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-app">Firma de Conformidad</h3>
                          <p className="text-[10px] text-muted">Dibuja la firma táctil del cliente en el recuadro</p>
                        </div>
                        <button
                          onClick={() => setIsSignatureModalOpen(false)}
                          className="w-8 h-8 rounded-xl bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="bg-surface-2 rounded-2xl overflow-hidden flex flex-col items-center p-2 shadow-inner">
                        <canvas
                          ref={canvasRef}
                          width={300}
                          height={150}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="bg-white rounded-xl cursor-crosshair max-w-full"
                          style={{ display: 'block', touchAction: 'none' }}
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={clearCanvas}
                          className="flex-1 h-11 rounded-xl font-bold text-xs bg-surface-2 hover:bg-surface-3 text-app active:scale-95 transition-all cursor-pointer"
                        >
                          Limpiar Firma
                        </button>
                        <button
                          onClick={handleExportDeveloperReceiptPDF}
                          className="flex-1 h-11 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 transition-all cursor-pointer"
                        >
                          Generar PDF
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </>)}

            </div>
          )
        })()
      )}


      {/* ─── MODAL DE CONFIRMACIÓN CRÍTICA (Fase 5) ─────────────────────────────── */}
      <AnimatePresence>
        {criticalConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) { setCriticalConfirmModal(null); setCriticalConfirmText('') } }}
          >
            <motion.div
              initial={{ scale: 0.88, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 24 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--color-surface)', border: '2px solid rgba(245,158,11,0.4)' }}
            >
              {/* Cabecera */}
              <div className="p-5 bg-amber-500/10 border-b border-amber-500/20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={28} className="text-amber-500" />
                </div>
                <h3 className="text-base font-black text-app">{criticalConfirmModal.title}</h3>
              </div>
              {/* Cuerpo */}
              <div className="p-5 space-y-4">
                {criticalConfirmModal.desc.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-muted leading-relaxed">{line}</p>
                ))}
                <div>
                  <label className="text-xs font-bold text-app mb-2 block tracking-wide uppercase">Confirmación de seguridad</label>
                  <input
                    type="text"
                    value={criticalConfirmText}
                    onChange={e => setCriticalConfirmText(e.target.value)}
                    placeholder="Escribe CONFIRMAR"
                    className="w-full h-12 px-4 rounded-xl bg-surface-2 border text-app text-sm font-bold tracking-widest focus:outline-none transition-colors"
                    style={{ borderColor: criticalConfirmText.trim().toUpperCase() === 'CONFIRMAR' ? '#10b981' : 'var(--color-border)' }}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter' && criticalConfirmText.trim().toUpperCase() === 'CONFIRMAR') {
                        criticalConfirmModal.onConfirm()
                        setCriticalConfirmModal(null)
                        setCriticalConfirmText('')
                      }
                    }}
                  />
                  {criticalConfirmText.length > 0 && criticalConfirmText.trim().toUpperCase() !== 'CONFIRMAR' && (
                    <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                      <X size={12} /> Debes escribir exactamente <strong>CONFIRMAR</strong>
                    </p>
                  )}
                  {criticalConfirmText.trim().toUpperCase() === 'CONFIRMAR' && (
                    <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
                      <CheckCircle size={12} /> ¡Listo! Puedes continuar.
                    </p>
                  )}
                </div>
              </div>
              {/* Botones */}
              <div className="p-5 border-t border-app flex gap-3">
                <button
                  onClick={() => { setCriticalConfirmModal(null); setCriticalConfirmText('') }}
                  className="flex-1 h-11 rounded-xl bg-surface-2 text-app text-sm font-bold transition-all active:scale-95 hover:bg-app hover:text-surface border border-app"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (criticalConfirmText.trim().toUpperCase() !== 'CONFIRMAR') return
                    criticalConfirmModal.onConfirm()
                    setCriticalConfirmModal(null)
                    setCriticalConfirmText('')
                  }}
                  disabled={criticalConfirmText.trim().toUpperCase() !== 'CONFIRMAR'}
                  className="flex-1 h-11 rounded-xl text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: criticalConfirmText.trim().toUpperCase() === 'CONFIRMAR' ? '#10b981' : '#9ca3af' }}
                >
                  <CheckCircle size={16} />
                  Guardar Ahora
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL DEL SELECTOR DE TEMAS ──────────────────────────────────────── */}
      <AnimatePresence>
        {isThemeModalOpen && (
          <ThemeModalLock>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-surface w-full max-w-4xl max-h-[90vh] rounded-3xl border border-app shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-5 border-b border-app bg-surface flex justify-between items-center shrink-0">
                  <h3 className="text-lg font-bold text-app flex items-center gap-2">
                    <Paintbrush size={20} className="text-primary" />
                    Selector de Tema Inteligente
                  </h3>
                  <button
                    onClick={() => setIsThemeModalOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-app transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-y-contain">
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm text-muted">Selecciona una paleta predefinida o crea tu propia combinación exacta.</p>
                    <button 
                      onClick={toggleCustomMode}
                      className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors shrink-0 ${typeof formData.theme === 'object' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-2 border-app text-app hover:bg-app hover:text-surface'}`}
                    >
                      {typeof formData.theme === 'object' ? 'Volver a Predefinidas' : 'Crear Personalizado'}
                    </button>
                  </div>

                  {typeof formData.theme === 'object' ? (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-surface-2 rounded-2xl border border-app shadow-inner">
                       <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-surface border border-app">
                         {config.isDarkMode ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-warning" />}
                         <p className="text-sm font-medium text-app">
                           Estás editando la paleta para el modo <strong className="text-primary">{config.isDarkMode ? 'Oscuro' : 'Claro'}</strong>.
                         </p>
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                       {Object.entries(config.isDarkMode ? formData.theme.dark : formData.theme.light).map(([key, val]) => (
                          <div key={key} className="flex flex-col">
                            <label className="block text-xs font-bold text-app mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                            <div className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-app shadow-sm">
                              <input 
                                type="color" 
                                value={val} 
                                onChange={(e) => handleCustomColorChange(key, e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 shadow-inner"
                              />
                              <span className="text-sm font-mono font-medium text-muted uppercase">{val}</span>
                            </div>
                          </div>
                       ))}
                       </div>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.values(ADVANCED_PALETTES).map((palette) => {
                        const isSelected = formData.theme === palette.id;
                        const colors = config.isDarkMode ? palette.dark : palette.light;
                        
                        return (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={palette.id}
                            onClick={() => setFormData({ ...formData, theme: palette.id })}
                            className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between h-32 ${
                              isSelected 
                                ? 'border-primary shadow-[0_0_20px_rgba(var(--color-primary),0.15)] ring-2 ring-primary/20' 
                                : 'border-app hover:border-primary/50'
                            }`}
                            style={{ backgroundColor: colors.surface }}
                          >
                            {isSelected && (
                              <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
                            )}
                            <span className="block text-base font-bold" style={{ color: colors.text }}>{palette.name}</span>
                            <div className="flex gap-2.5 mt-auto">
                              <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: colors.primary }} />
                              <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: colors.secondary }} />
                              <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: colors.accent }} />
                              <div className="w-8 h-8 rounded-full shadow-sm border-2" style={{ backgroundColor: colors.bg, borderColor: colors.border }} />
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  )}
                </div>
                
                <div className="p-5 border-t border-app bg-surface flex justify-end shrink-0">
                  <button
                    onClick={() => setIsThemeModalOpen(false)}
                    className="px-8 py-3 bg-app text-surface rounded-xl font-bold transition-all hover:opacity-90 active:scale-95 shadow-md flex items-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Confirmar y Cerrar
                  </button>
                </div>
              </motion.div>
            </div>
          </ThemeModalLock>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
