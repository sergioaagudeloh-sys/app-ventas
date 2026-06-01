import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '../../config/firebaseConfig'
import useAppConfigStore from '../../store/appConfigStore'
import AppLoader from '../../components/ui/AppLoader'
import { 
  Package, 
  CheckCircle2, 
  Check,
  Clock, 
  AlertTriangle, 
  Truck, 
  ShoppingBag,
  CreditCard,
  Phone,
  User,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react'

export default function OrderTracking() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t')
  const { orderTrackingEnabled, whatsappAdmin } = useAppConfigStore()
  
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!token) {
        setError('Token de seguimiento no proporcionado o inválido.')
        setLoading(false)
        return
      }

      try {
        const ordersRef = collection(db, 'orders')
        const q = query(ordersRef, where('trackingToken', '==', token), limit(1))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          setError('No se encontró ningún pedido con el código de seguimiento proporcionado.')
        } else {
          const docData = querySnapshot.docs[0].data()
          setOrder({
            id: querySnapshot.docs[0].id,
            ...docData
          })
        }
      } catch (err) {
        console.error('Error fetching order by token:', err)
        setError('Ocurrió un error al consultar el estado del pedido. Intente nuevamente.')
      } finally {
        setLoading(false)
      }
    }

    if (orderTrackingEnabled === false) {
      setError('El módulo de seguimiento de pedidos públicos está actualmente desactivado.')
      setLoading(false)
    } else {
      fetchOrder()
    }
  }, [token, orderTrackingEnabled])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <AppLoader />
        <p className="mt-4 text-sm text-[var(--text-secondary)] animate-pulse">Cargando estado de tu pedido...</p>
      </div>
    )
  }

  // Helper para traducir estados y obtener colores
  const getStatusDetails = (status) => {
    switch (status) {
      case 'pendiente':
        return {
          label: 'Pendiente de Aprobación',
          color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30',
          icon: Clock,
          stepIndex: 0
        }
      case 'credito_aprobado':
        return {
          label: 'Crédito Aprobado',
          color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/30',
          icon: ShieldCheck,
          stepIndex: 1
        }
      case 'completado':
        return {
          label: 'Completado y Entregado',
          color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30',
          icon: CheckCircle2,
          stepIndex: 2
        }
      case 'cancelado':
        return {
          label: 'Cancelado',
          color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/30',
          icon: AlertTriangle,
          stepIndex: -1
        }
      default:
        return {
          label: 'Pendiente',
          color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30',
          icon: Clock,
          stepIndex: 0
        }
    }
  }

  const steps = [
    { label: 'Recibido', desc: 'Tu pedido está en espera de revisión' },
    { label: 'Procesado', desc: 'Tu crédito o pago ha sido validado' },
    { label: 'Entregado', desc: 'Tu pedido ha sido entregado exitosamente' }
  ]

  const statusInfo = order ? getStatusDetails(order.status) : null

  // Formatear moneda
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val)
  }

  // Si hay error (Módulo desactivado o Token inválido)
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 py-12">
        <div className="w-full max-w-md bg-[var(--card-bg)] border border-slate-100 dark:border-slate-800/80 rounded-3xl p-8 shadow-xl text-center backdrop-blur-md">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
            Atención
          </h2>
          <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
            {error}
          </p>
          <div className="space-y-3">
            <Link 
              to="/" 
              className="w-full inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-primary hover:opacity-90 text-white font-bold transition-all duration-300 shadow-lg shadow-primary/20"
            >
              Ir a la Tienda Principal
            </Link>
            {whatsappAdmin && (
              <a 
                href={`https://wa.me/${whatsappAdmin.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] font-bold transition-all duration-300 gap-2 text-sm"
              >
                Contactar Soporte por WhatsApp
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  const StatusIcon = statusInfo?.icon || Clock

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-8 md:py-16 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <div className="animate-float p-3 text-primary">
            <Package className="w-16 h-16" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
            Portal de Seguimiento Público
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Consulta en tiempo real el estado de tu compra sin iniciar sesión
          </p>
        </div>

        {/* Card Principal: Estado del Pedido */}
        <div className="bg-[var(--card-bg)] border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-b-slate-800/40 pb-6 mb-6">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                ID del Pedido
              </p>
              <h2 className="text-lg md:text-xl font-bold font-mono text-primary mt-0.5">
                #{order.id?.substring(0, 10).toUpperCase()}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Realizado el: {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A'}
              </p>
            </div>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold ${statusInfo?.color} transition-all duration-300`}>
              <StatusIcon className="w-4 h-4" />
              {statusInfo?.label}
            </div>
          </div>

          {/* Stepper Timeline */}
          {statusInfo?.stepIndex !== -1 ? (
            <div className="py-6 border-b border-slate-100 dark:border-b-slate-800/40 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-8">
                Progreso de tu Pedido
              </h3>
              
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4">
                {/* Línea de fondo en pantallas grandes */}
                <div className="absolute left-4 top-8 bottom-8 md:left-0 md:top-4 md:bottom-auto md:w-full md:h-[3px] bg-slate-100 dark:bg-slate-800/50 -z-10" />
                
                {/* Línea de progreso activa */}
                <div 
                  className="absolute left-4 top-8 bottom-8 md:left-0 md:top-4 md:bottom-auto md:h-[3px] transition-all duration-500 -z-10"
                  style={{
                    width: window.innerWidth >= 768 ? `${(statusInfo.stepIndex / (steps.length - 1)) * 100}%` : '3px',
                    height: window.innerWidth < 768 ? `${(statusInfo.stepIndex / (steps.length - 1)) * 100}%` : '3px',
                    backgroundColor: 'var(--color-primary)'
                  }}
                />

                {steps.map((step, idx) => {
                  const isCompleted = idx <= statusInfo.stepIndex
                  const isActive = idx === statusInfo.stepIndex
                  
                  return (
                    <div key={idx} className="flex md:flex-col items-center md:items-center gap-4 md:gap-2 w-full md:text-center relative">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 z-10 ${
                          isCompleted 
                            ? 'text-white shadow-md shadow-primary/20' 
                            : 'bg-[var(--card-bg)] border-slate-200 dark:border-slate-800 text-[var(--text-secondary)]'
                        }`}
                        style={isCompleted ? {
                          backgroundColor: 'var(--color-primary)',
                          borderColor: 'var(--color-primary)'
                        } : {}}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 text-white font-extrabold" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      
                      <div className="flex flex-col md:items-center">
                        <span className={`text-sm font-bold ${isCompleted ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'} ${isActive ? 'text-primary' : ''}`}>
                          {step.label}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] max-w-[200px] mt-0.5 md:block hidden">
                          {step.desc}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="py-6 border-b border-slate-100 dark:border-b-slate-800/40 mb-6 text-center">
              <div className="inline-flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 rounded-xl border border-rose-200/50 text-sm font-medium">
                <AlertTriangle className="w-5 h-5" />
                Este pedido ha sido Cancelado. Si consideras que es un error, por favor ponte en contacto con soporte.
              </div>
            </div>
          )}

          {/* Información y Datos Limitados del Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100/80 dark:border-slate-800/30 p-5 rounded-2xl space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                Información del Destinatario
              </h4>
              <div className="text-sm">
                <p className="font-bold text-[var(--text-primary)]">
                  {order.cliente?.nombre || 'Cliente'}
                </p>
                <p className="text-[var(--text-secondary)] text-xs mt-1">
                  Celular: {order.cliente?.celular ? `*******${order.cliente.celular.slice(-4)}` : 'N/A'}
                </p>
                <p className="text-[var(--text-secondary)] text-xs mt-0.5">
                  Método de Entrega: <span className="font-semibold text-[var(--text-primary)]">{order.tipoEntrega === 'domicilio' ? 'Envío a Domicilio' : order.tipoEntrega === 'digital' ? 'Digital / Servicio' : 'Retiro en Tienda'}</span>
                </p>
              </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100/80 dark:border-slate-800/30 p-5 rounded-2xl space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                Resumen Financiero
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                  <span>Método de Pago:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{order.metodoPago || 'N/A'}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[var(--text-primary)] pt-2.5 border-t border-slate-100 dark:border-slate-800/40 mt-2">
                  <span>Total Pagado/Por Pagar:</span>
                  <span className="text-primary font-extrabold">{formatCurrency(order.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Listado de Productos */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-primary" />
              Detalle de Productos
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/40 border border-slate-100 dark:border-slate-800/40 rounded-2xl overflow-hidden bg-slate-50/10">
              {(order.items || order.productos || []).map((prod, idx) => {
                const variant = [prod.talla, prod.color].filter(Boolean).join(' · ')
                const subtotal = (prod.precio || 0) * (prod.cantidad || 1)
                return (
                  <div key={idx} className="flex items-center gap-3 p-3.5 text-sm hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors duration-200">
                    {prod.imageUrl && (
                      <img
                        src={prod.imageUrl}
                        alt={prod.nombre}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 dark:border-slate-800/40 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-[var(--text-primary)] block truncate">{prod.nombre}</span>
                      {variant && (
                        <span className="text-xs text-[var(--text-secondary)]">{variant}</span>
                      )}
                      <span className="text-xs text-[var(--text-secondary)] block">x{prod.cantidad} · {formatCurrency(prod.precio)}</span>
                    </div>
                    <span className="font-mono font-bold text-[var(--text-primary)] text-sm shrink-0">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                )
              })}
              {!(order.items?.length || order.productos?.length) && (
                <p className="text-center text-xs text-[var(--text-secondary)] py-6">No hay productos registrados en este pedido.</p>
              )}
            </div>
          </div>

        </div>

        {/* Footer / Copyright / Volver */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-secondary)] px-2">
          <span>&copy; {new Date().getFullYear()} Ventas App. Todos los derechos reservados.</span>
          <Link 
            to="/" 
            className="flex items-center gap-1 hover:text-primary font-bold transition-colors duration-200"
          >
            Volver a la tienda
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

      </div>
    </div>
  )
}
