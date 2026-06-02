import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { collection, query, where, onSnapshot, getDocs, limit } from 'firebase/firestore'
import { db } from '../../config/firebaseConfig'
import useAppConfigStore from '../../store/appConfigStore'
import useAuthStore from '../../store/authStore'
import { formatCurrency } from '../../utils/formatters'
import AppLoader from '../../components/ui/AppLoader'
import { ORDER_STATE_META, ROLES } from '../../constants'
import { getEmployeesByRole } from '../../services/employeeService'
import { trackTrackingEvent } from '../../services/trackingAnalyticsService'
import {
  Package,
  CheckCircle2,
  CheckCircle,
  Check,
  Clock,
  AlertTriangle,
  ShoppingBag,
  User,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  MapPin,
  Truck,
  ChefHat,
  Sparkles,
  Download,
} from 'lucide-react'
import usePWAInstall from '../../hooks/usePWAInstall'
import SoftPushPrompt from '../../components/client/SoftPushPrompt'


// ─── Mapa de íconos de Lucide por nombre (string → componente) ────────────────
// Cuando agregues un estado con un ícono nuevo, añádelo aquí.
const ICON_MAP = {
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Package,
  Truck,
  ChefHat,
  ShoppingBag,
  MapPin,
}

// ─── Mapa de clases de color por clave ────────────────────────────────────────
const COLOR_MAP = {
  amber:   { badge: 'text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-300/50',   step: 'bg-amber-500'  },
  indigo:  { badge: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-300/50', step: 'bg-indigo-500' },
  emerald: { badge: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300/50', step: 'bg-emerald-500' },
  rose:    { badge: 'text-rose-700 bg-rose-50 dark:bg-rose-950/20 border-rose-300/50',       step: 'bg-rose-500'   },
  orange:  { badge: 'text-orange-700 bg-orange-50 dark:bg-orange-950/20 border-orange-300/50', step: 'bg-orange-500' },
  blue:    { badge: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-300/50',       step: 'bg-blue-500'   },
}

export default function OrderTracking() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t')
  const { orderTrackingEnabled, whatsappAdmin, appName, appPromo, deliverySettings } = useAppConfigStore()
  const { rawInstallable, handleInstall } = usePWAInstall()

  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  const isStandalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [hasCocinero, setHasCocinero] = useState(false)
  const [hasMensajero, setHasMensajero] = useState(false)

  useEffect(() => {
    if (orderTrackingEnabled === false) {
      setError('El módulo de seguimiento de pedidos está actualmente desactivado.')
      setLoading(false)
      return
    }

    if (!token) {
      setError('Token de seguimiento no proporcionado o inválido.')
      setLoading(false)
      return
    }

    // ── Suscripción en tiempo real al pedido ────────────────────────────────────
    const q = query(
      collection(db, 'orders'),
      where('trackingToken', '==', token),
      limit(1)
    )

    // Prevenir telemetría duplicada en la misma carga
    let tracked = false

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setError('No se encontró ningún pedido con este código de seguimiento.')
        } else {
          const ordData = { id: snap.docs[0].id, ...snap.docs[0].data() }
          setOrder(ordData)
          setError(null)

          // Registrar telemetría al cargar exitosamente por primera vez
          if (!tracked) {
            tracked = true
            const referrer = searchParams.get('ref')
            const eventType = referrer === 'qr' ? 'scan' : 'link_open'
            trackTrackingEvent(ordData.id, ordData.orderNumber, eventType)
          }
        }
        setLoading(false)
      },
      (err) => {
        console.error('[OrderTracking] Error en suscripción:', err)
        setError('Ocurrió un error al consultar el pedido. Intenta nuevamente.')
        setLoading(false)
      }
    )

    // Consultar de forma dinámica si hay cocineros o mensajeros configurados en la tienda a través de la configuración global
    const storeEmployees = useAppConfigStore.getState().employees || []
    const isMultipleEnabled = useAppConfigStore.getState().hasMultipleEmployees ?? false

    // Solo se asumen cocineros/mensajeros si el módulo de múltiples empleados está activo
    if (isMultipleEnabled) {
      const activeCocineros = storeEmployees.filter(emp => emp.rol === ROLES.COCINERO || emp.role === ROLES.COCINERO)
      const activeMensajeros = storeEmployees.filter(emp => emp.rol === ROLES.MENSAJERO || emp.role === ROLES.MENSAJERO)
      setHasCocinero(activeCocineros.length > 0)
      setHasMensajero(activeMensajeros.length > 0)
    } else {
      // Si no hay múltiples empleados, no hay roles operativos
      setHasCocinero(false)
      setHasMensajero(false)
    }

    // Limpiar la suscripción al desmontar el componente
    return () => unsubscribe()
  }, [token, orderTrackingEnabled])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface text-app">
        <AppLoader />
        <p className="mt-4 text-sm text-muted animate-pulse">Cargando estado de tu pedido...</p>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
        <div className="w-full max-w-md bg-surface border border-app rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-app mb-3">Atención</h2>
          <p className="text-muted mb-6 text-sm leading-relaxed">{error}</p>
          <div className="space-y-3">
            <Link to="/" className="w-full inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-primary hover:opacity-90 text-white font-bold transition-all shadow-lg">
              Ir a la Tienda
            </Link>
            {whatsappAdmin && (
              <a
                href={`https://wa.me/${whatsappAdmin.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-app text-app hover:bg-surface-2 font-bold transition-all gap-2 text-sm"
              >
                Contactar por WhatsApp <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Lógica dinámica de estado ──────────────────────────────────────────────
  const isDomicilio = order.tipoEntrega === 'domicilio'
  const esCreditoPago = order.metodoPago === 'credito'

  /**
   * Construye la secuencia exacta de pasos del stepper en función de:
   * - Tipo de entrega (domicilio vs retiro)
   * - Método de pago (solo agregar credito_aprobado si pagó con crédito)
   * - Roles activos en el negocio (cocinero, mensajero)
   */
  const buildStepKeys = () => {
    const steps = ['pendiente']

    // Paso de crédito: SOLO si el pedido fue pagado con crédito/fiado
    if (esCreditoPago) steps.push('credito_aprobado')

    // Paso de preparación: SOLO si el negocio tiene cocinero activo
    if (hasCocinero) steps.push('alistamiento')

    if (isDomicilio) {
      // Listo para despacho + En camino: SOLO si hay mensajero activo (empleado O externo propio activo)
      if (hasMensajero || deliverySettings?.customDelivery?.enabled) {
        steps.push('listo')
        steps.push('en_camino')
      }
    } else {
      // Retiro en tienda: "listo" significa "listo para recoger", sin mensajero
      // Solo se incluye si tiene cocinero (ya está en preparación) o como estado final previo
      if (hasCocinero) steps.push('listo')
    }

    steps.push('completado')
    return steps
  }

  const stepKeys = buildStepKeys()

  // Obtener metadatos del estado actual desde constants (fallback genérico si no está definido)
  const currentMeta = ORDER_STATE_META[order.estado] ?? {
    label: order.estado ?? 'Desconocido',
    desc: 'Estado actualizado',
    icon: 'Clock',
    color: 'amber',
    terminal: false,
    isError: false,
  }

  // Resolver ícono del estado actual
  const StatusIcon = ICON_MAP[currentMeta.icon] ?? Clock
  const colorClass = COLOR_MAP[currentMeta.color]?.badge ?? COLOR_MAP.amber.badge

  // Calcular el índice activo en el stepper dinámicamente
  const activeStepIdx = stepKeys.indexOf(order.estado)

  // Resumen financiero
  const subtotal = order.subtotal ?? ((order.total || 0) - (order.costoEnvio || 0))

  return (
    <div className="min-h-screen bg-surface text-app px-4 py-8 md:py-14 transition-colors duration-300">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Barra superior de navegación */}
        <div className="flex items-center justify-between px-2 shrink-0">
          <Link to="/" className="flex items-center gap-1 text-xs text-muted hover:text-primary font-bold transition-colors">
            <ChevronLeft className="w-4 h-4" /> Volver a la tienda
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-1 mb-2">
          <div className="p-3">
            <Package className="w-14 h-14" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-lg font-bold text-app">Seguimiento de Pedido</h1>
          <p className="text-xs text-muted">{appName || 'Tu tienda'} · Estado en tiempo real</p>
        </div>

        {/* Card principal */}
        <div className="bg-surface border border-app rounded-3xl p-6 shadow-sm">

          {/* Número y fecha */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-app">
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Número de Pedido</p>
              <h2 className="text-xl font-black font-mono text-primary mt-0.5">
                {order.orderNumber || `#${order.id?.substring(0, 8).toUpperCase()}`}
              </h2>
              <p className="text-xs text-muted mt-1">
                {order.createdAt
                  ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : 'Fecha no disponible'}
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold self-start sm:self-center ${colorClass}`}>
              <StatusIcon className="w-4 h-4" />
              {currentMeta.label}
            </div>
          </div>

          {/* ── Stepper dinámico ─────────────────────────────────────────────── */}
          {currentMeta.isError ? (
            // Estado terminal negativo (cancelado, etc.)
            <div className="pb-5 mb-5 border-b border-app text-center">
              <div className="inline-flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 rounded-xl border border-rose-300/50 text-sm font-medium">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {currentMeta.desc}. Contáctanos si crees que es un error.
              </div>
            </div>
          ) : (
            <div className="pb-5 mb-5 border-b border-app">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-6">
                Progreso · {isDomicilio ? '🛵 Domicilio' : '🏪 Retiro en Tienda'}
              </p>
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-start gap-7 md:gap-4">
                {/* Línea de fondo */}
                <div className="absolute left-4 top-4 bottom-4 w-[2px] md:left-0 md:top-4 md:w-full md:h-[2px] md:bottom-auto bg-app -z-10" />
                {/* Línea de progreso activa */}
                {activeStepIdx >= 0 && (
                  <div
                    className="absolute left-4 top-4 w-[2px] md:left-0 md:top-4 md:w-auto md:h-[2px] md:bottom-auto -z-10 transition-all duration-500"
                    style={{
                      height: window.innerWidth < 768
                        ? `${(activeStepIdx / Math.max(stepKeys.length - 1, 1)) * 100}%`
                        : '2px',
                      width: window.innerWidth >= 768
                        ? `${(activeStepIdx / Math.max(stepKeys.length - 1, 1)) * 100}%`
                        : '2px',
                      backgroundColor: 'var(--color-primary)',
                    }}
                  />
                )}

                {/* Pasos dinámicos */}
                {stepKeys.map((stateKey, idx) => {
                  const meta = ORDER_STATE_META[stateKey] ?? { label: stateKey, icon: 'Clock', color: 'amber' }
                  const StepIcon = ICON_MAP[meta.icon] ?? Clock
                  const isCompleted = activeStepIdx >= 0 && idx <= activeStepIdx
                  const isActive = idx === activeStepIdx

                  return (
                    <div key={stateKey} className="flex md:flex-col items-center gap-4 md:gap-2 w-full md:text-center relative">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 shrink-0 ${
                          isCompleted
                            ? 'text-white shadow-md shadow-primary/20'
                            : 'bg-surface border-app text-muted'
                        }`}
                        style={isCompleted ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
                      >
                        {isCompleted
                          ? <Check className="w-4 h-4 text-white" />
                          : <span className="text-xs font-bold text-muted">{idx + 1}</span>
                        }
                      </div>
                      <div className="flex flex-col md:items-center">
                        <span className={`text-sm font-bold ${isActive ? 'text-primary' : isCompleted ? 'text-app' : 'text-muted'}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-muted hidden md:block mt-0.5 max-w-[140px] leading-tight">
                          {meta.desc}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Solicitud Inteligente y No Intrusiva de Permisos Push del Cliente */}
          {order.cliente?.celular && (
            <SoftPushPrompt userId={order.cliente.celular} role="client" />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="bg-surface-2/40 border border-app p-4 rounded-2xl space-y-1.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-muted flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5 text-primary" /> Destinatario
              </h4>
              <p className="font-bold text-app text-sm">{order.cliente?.nombre || 'Cliente'}</p>
              <p className="text-xs text-muted">
                Celular: {order.cliente?.celular ? `*******${order.cliente.celular.slice(-4)}` : 'N/A'}
              </p>
              <p className="text-xs text-muted">
                Entrega:{' '}
                <span className="font-semibold text-app">
                  {isDomicilio ? '🛵 Domicilio' : order.tipoEntrega === 'digital' ? '📱 Digital' : '🏪 Retiro en tienda'}
                </span>
              </p>
            </div>

            <div className="bg-surface-2/40 border border-app p-4 rounded-2xl space-y-1.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-muted flex items-center gap-1.5 mb-2">
                <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Resumen Financiero
              </h4>
              <div className="space-y-1 text-xs text-muted">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-app">{formatCurrency(subtotal)}</span>
                </div>
                {isDomicilio && (
                  <div className="flex justify-between">
                    <span>🛵 Domicilio:</span>
                    {order.costoEnvio > 0
                      ? <span className="font-semibold text-primary">+{formatCurrency(order.costoEnvio)}</span>
                      : <span className="italic">Por acordar</span>
                    }
                  </div>
                )}
                {order.descuento > 0 && (
                  <div className="flex justify-between">
                    <span>🏷️ Descuento:</span>
                    <span className="font-semibold text-green-500">-{formatCurrency(order.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-app pt-2 border-t border-app/50 mt-1">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(order.total || 0)}</span>
                </div>
                <div className="flex justify-between text-xs mt-0.5">
                  <span>Método de Pago:</span>
                  <span className="font-semibold text-app capitalize">{order.metodoPago || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle de domicilio */}
          {isDomicilio && (
            <div className="bg-surface-2/40 border border-app p-4 rounded-2xl mb-5 space-y-1.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-muted flex items-center gap-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Dirección de Entrega
              </h4>
              {order.cliente?.direccion ? (
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-app">{order.cliente.direccion}</p>
                  {order.cliente?.barrio && (
                    <p className="text-xs text-muted">
                      {order.cliente.barrio}{order.cliente?.ciudad ? `, ${order.cliente.ciudad}` : ''}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted italic">Dirección no registrada.</p>
              )}
              {order.costoEnvio > 0
                ? <p className="text-xs font-bold text-primary pt-0.5">Costo de envío: {formatCurrency(order.costoEnvio)}</p>
                : <p className="text-xs text-muted italic">El costo de envío será acordado con el negocio.</p>
              }
            </div>
          )}

          {/* Notas */}
          {order.notas && (
            <div className="bg-surface-2/40 border border-app p-4 rounded-2xl mb-5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">📋 Notas del Pedido</h4>
              <p className="text-xs text-app italic">{order.notas}</p>
            </div>
          )}

          {/* Productos */}
          <div className="mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Productos del Pedido
            </h3>
            <div className="divide-y divide-app border border-app rounded-2xl overflow-hidden">
              {(order.items || order.productos || []).map((prod, idx) => {
                const variant = prod.atributos
                  ? Object.values(prod.atributos).filter(Boolean).join(' · ')
                  : [prod.talla, prod.color].filter(Boolean).join(' · ')
                const subtotalProd = (prod.precio || 0) * (prod.cantidad || 1)
                const imgSrc = prod.imagen || prod.imageUrl
                return (
                  <div key={idx} className="flex items-center gap-3 p-3.5 hover:bg-surface-2/30 transition-colors">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-app shrink-0 bg-surface-2 flex items-center justify-center">
                      {imgSrc
                        ? <img src={imgSrc} alt={prod.nombre} className="w-full h-full object-cover" />
                        : <Package className="w-5 h-5 text-muted" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-app text-sm truncate">{prod.nombre}</p>
                      {variant && <p className="text-xs text-muted">{variant}</p>}
                      <p className="text-xs text-muted">x{prod.cantidad} · {formatCurrency(prod.precio)}</p>
                    </div>
                    <span className="font-mono font-bold text-app text-sm shrink-0">{formatCurrency(subtotalProd)}</span>
                  </div>
                )
              })}
              {!(order.items?.length || order.productos?.length) && (
                <p className="text-center text-xs text-muted py-6">No hay productos registrados en este pedido.</p>
              )}
            </div>
          </div>

          {/* Bloques de Conversión y Fidelización (Priorizados visualmente si el pedido ya finalizó / se canceló) */}
          {(order.estado === 'completado' || order.estado === 'cancelado') && (
            <div className="pt-2 border-t border-app space-y-4">
              {/* Bloque: Recompra / Explorar Catálogo */}
              <div className="bg-primary/5 border rounded-3xl p-5 text-center space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}>
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-app uppercase tracking-wider">¿Te gusta comprar con nosotros?</h4>
                  <p className="text-xs text-muted">Sigue explorando y descubre productos recomendados especialmente para ti.</p>
                </div>
                <Link
                  to="/"
                  onClick={() => trackTrackingEvent(order.id, order.orderNumber, 'catalog_click')}
                  className="inline-flex w-full items-center justify-center h-12 bg-primary text-white font-black text-xs uppercase tracking-wider rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/15"
                >
                  Volver a la Tienda (Comprar Más)
                </Link>
              </div>

              {/* Bloque: Promover Instalación de App PWA */}
              {appPromo?.enabled && (
                isStandalone ? (
                  <div className="bg-surface-2 border border-app rounded-3xl p-4 shadow-sm flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={16} />
                    </div>
                    <span className="text-xs font-bold text-app">Aplicación instalada y lista en tu dispositivo</span>
                  </div>
                ) : (
                  <div className="bg-surface-2 border border-app rounded-3xl p-5 space-y-4 shadow-sm">
                    <div className="flex gap-4">
                      {appPromo.promoImageUrl ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-app bg-surface-3">
                          <img src={appPromo.promoImageUrl} alt="App Icon" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Download size={20} />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-app uppercase tracking-wider">
                          {appPromo.title || 'Instalar Aplicación'}
                        </h4>
                        <p className="text-xs text-muted mt-1 leading-snug">
                          {appPromo.message || 'Descarga la app en tu pantalla de inicio para un acceso rápido y realizar el seguimiento de tus pedidos en tiempo real.'}
                        </p>
                      </div>
                    </div>
                    {rawInstallable ? (
                      <button
                        onClick={handleInstall}
                        className="w-full h-11 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                        style={{ borderRadius: 'var(--radius-base)' }}
                      >
                        <Download size={16} />
                        Instalar Aplicación
                      </button>
                    ) : isIOS ? (
                      <div className="text-xs text-muted bg-surface p-3.5 rounded-2xl border border-app leading-relaxed">
                        📱 En tu iPhone/iPad: pulsa el botón de <strong>Compartir</strong> <span className="text-primary font-bold">↑</span> en la barra inferior de Safari y luego selecciona <strong>"Agregar a la pantalla de inicio"</strong>.
                      </div>
                    ) : null}
                  </div>
                )
              )}
            </div>
          )}

        </div>

        {/* Bloque Comercial Estándar para Pedidos en Curso (Aparece abajo si no está en estado terminal) */}
        {order.estado !== 'completado' && order.estado !== 'cancelado' && (
          <div className="space-y-4">
            {/* Bloque: Catálogo General */}
            <div className="bg-surface border border-app rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-app uppercase tracking-wider">Descubre más productos</h4>
                <p className="text-xs text-muted leading-snug">Puedes seguir explorando nuestra tienda y añadir más favoritos.</p>
              </div>
              <Link
                to="/"
                onClick={() => trackTrackingEvent(order.id, order.orderNumber, 'catalog_click')}
                className="h-11 px-6 bg-primary/10 text-primary border rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center transition-all hover:bg-primary hover:text-white cursor-pointer active:scale-95 shrink-0"
                style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
              >
                Explorar Tienda
              </Link>
            </div>

            {/* Bloque: Promover Instalación de App PWA */}
            {appPromo?.enabled && (
              isStandalone ? (
                <div className="bg-surface border border-app rounded-3xl p-4 shadow-sm flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={16} />
                  </div>
                  <span className="text-xs font-bold text-app">Aplicación instalada y lista en tu dispositivo</span>
                </div>
              ) : (
                <div className="bg-surface border border-app rounded-3xl p-5 space-y-4 shadow-sm">
                  <div className="flex gap-4">
                    {appPromo.promoImageUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-app bg-surface-2">
                        <img src={appPromo.promoImageUrl} alt="App Icon" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Download size={20} />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-app uppercase tracking-wider">
                        {appPromo.title || 'Instalar Aplicación'}
                      </h4>
                      <p className="text-xs text-muted mt-1 leading-snug">
                        {appPromo.message || 'Descarga la app en tu pantalla de inicio para un acceso rápido y realizar el seguimiento de tus pedidos en tiempo real.'}
                      </p>
                    </div>
                  </div>
                  {rawInstallable ? (
                    <button
                      onClick={handleInstall}
                      className="w-full h-11 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                      style={{ borderRadius: 'var(--radius-base)' }}
                    >
                      <Download size={16} />
                      Instalar Aplicación
                    </button>
                  ) : isIOS ? (
                    <div className="text-xs text-muted bg-surface-2 p-3.5 rounded-2xl border border-app leading-relaxed">
                      📱 En tu iPhone/iPad: pulsa el botón de <strong>Compartir</strong> <span className="text-primary font-bold">↑</span> en la barra inferior de Safari y luego selecciona <strong>"Agregar a la pantalla de inicio"</strong>.
                    </div>
                  ) : null}
                </div>
              )
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-center text-center gap-4 text-xs text-muted px-2 pb-8">
          <span>© {new Date().getFullYear()} {appName || 'App Ventas'}. Todos los derechos reservados.</span>
        </div>

      </div>
    </div>
  )
}
