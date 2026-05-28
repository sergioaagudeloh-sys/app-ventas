import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ExternalLink,
  Calendar,
  ChevronDown,
  User,
  Phone,
  Check,
  AlertTriangle,
  Clock,
  ChevronUp,
  FileText
} from 'lucide-react'
import { subscribeToClaims, updateClaimStatus } from '../../services/claimsService'
import { formatCurrency } from '../../utils/formatters'

export default function AdminClaims() {
  const [claims, setClaims] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('PENDING') // PENDING | APPROVED | REJECTED | ALL
  const [expandedId, setExpandedId] = useState(null)
  
  // Estados para notas y operaciones por cada reclamo
  const [adminNotesText, setAdminNotesText] = useState({})
  const [actionLoading, setActionLoading] = useState({})
  const [toastMessage, setToastMessage] = useState(null)

  // Suscribirse a los reclamos en tiempo real
  useEffect(() => {
    setIsLoading(true)
    const unsubscribe = subscribeToClaims((data) => {
      setClaims(data)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Mostrar toast temporal
  const triggerToast = (text, type = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Filtrar reclamos
  const filteredClaims = claims.filter((claim) => {
    // Filtrar por pestaña
    if (activeTab !== 'ALL' && claim.status !== activeTab) return false

    // Filtrar por término de búsqueda
    const matchesSearch =
      claim.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.clientPhone?.includes(searchTerm) ||
      claim.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.products?.some((p) => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesSearch
  })

  // Manejar cambio de estado del reclamo (Aprobar / Rechazar)
  const handleUpdateStatus = async (claimId, newStatus) => {
    const notes = adminNotesText[claimId] || ''
    setActionLoading((prev) => ({ ...prev, [claimId]: true }))
    try {
      await updateClaimStatus(claimId, newStatus, notes)
      triggerToast(
        `Reclamo ${newStatus === 'APPROVED' ? 'aprobado' : 'rechazado'} correctamente.`,
        newStatus === 'APPROVED' ? 'success' : 'info'
      )
    } catch (err) {
      console.error('Error al actualizar reclamo:', err)
      triggerToast('Hubo un error al procesar la solicitud.', 'error')
    } finally {
      setActionLoading((prev) => ({ ...prev, [claimId]: false }))
    }
  }

  // Generar y abrir enlace de WhatsApp
  const handleWhatsAppContact = (claim) => {
    const phone = claim.clientPhone.replace(/\D/g, '') // Limpiar caracteres no numéricos
    
    // Traducción de motivos a español
    const reasonLabels = {
      defectuoso: 'Producto Defectuoso / Roto',
      no_esperado: 'No era lo que esperaba',
      talla_incorrecta: 'Talla o Color incorrecto',
      otro: 'Otro motivo'
    }

    const statusLabels = {
      PENDING: 'En revisión',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado'
    }

    const claimReason = reasonLabels[claim.reason] || claim.reason
    const claimStatus = statusLabels[claim.status] || claim.status
    const adminNotes = claim.adminNotes ? `\n\n*Respuesta de la tienda:* ${claim.adminNotes}` : ''

    const message = `Hola ${claim.clientName}, te escribimos de *${window.location.host.split('.')[0] || 'la tienda'}* con relación a tu solicitud de garantía/cambio del pedido *#${claim.orderNumber}*.\n\n*Motivo:* ${claimReason}\n*Detalles del reclamo:* ${claim.description}\n\n*Estado de la solicitud:* *${claimStatus}*${adminNotes}\n\nQuedamos atentos para ayudarte.`
    
    const encodedMessage = encodeURIComponent(message)
    const url = `https://wa.me/${phone}?text=${encodedMessage}`
    window.open(url, '_blank')
  }

  // Formatear fechas de Firestore
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Reciente'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Inicializar notas locales cuando se expande un reclamo
  const handleToggleExpand = (claim) => {
    if (expandedId === claim.id) {
      setExpandedId(null)
    } else {
      setExpandedId(claim.id)
      if (adminNotesText[claim.id] === undefined) {
        setAdminNotesText((prev) => ({ ...prev, [claim.id]: claim.adminNotes || '' }))
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-6xl mx-auto space-y-6"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : toastMessage.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-500'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 size={16} />}
            {toastMessage.type === 'error' && <AlertTriangle size={16} />}
            {toastMessage.type === 'info' && <Clock size={16} />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-app">Garantías y Reclamos</h1>
            <p className="text-xs text-muted">Gestión de reclamos, devoluciones e inconformidades de clientes</p>
          </div>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Buscador */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar por cliente, pedido o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        {/* Pestañas de Filtros */}
        <div className="flex p-1 gap-1 bg-surface-2 rounded-2xl md:w-auto overflow-x-auto shrink-0">
          {[
            { id: 'PENDING', label: 'Pendientes' },
            { id: 'APPROVED', label: 'Aprobados' },
            { id: 'REJECTED', label: 'Rechazados' },
            { id: 'ALL', label: 'Todos' }
          ].map((tab) => {
            const count = claims.filter((c) => tab.id === 'ALL' || c.status === tab.id).length
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-muted hover:text-app'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-surface-3 text-muted'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista de Reclamos */}
      {isLoading ? (
        <div className="text-center py-20 bg-surface rounded-3xl border border-app space-y-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted font-medium">Cargando solicitudes de reclamo...</p>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-surface rounded-3xl border border-app">
          <ShieldAlert size={48} className="text-muted mb-4 opacity-30" />
          <h3 className="text-base font-bold text-app mb-1">No hay solicitudes</h3>
          <p className="text-muted text-xs max-w-xs mx-auto">
            {searchTerm
              ? 'No encontramos ningún reclamo que coincida con tu búsqueda.'
              : '¡Buen trabajo! No tienes reclamos pendientes en esta sección.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {filteredClaims.map((claim) => {
              const isExpanded = expandedId === claim.id
              const notes = adminNotesText[claim.id] || ''
              const isLoadingAction = actionLoading[claim.id] || false

              // Color y texto de estados
              const statusConfig = {
                PENDING: { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500', label: 'Pendiente', icon: Clock },
                APPROVED: { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500', label: 'Aprobado', icon: CheckCircle2 },
                REJECTED: { bg: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-500', label: 'Rechazado', icon: XCircle }
              }
              const currentStatus = statusConfig[claim.status] || statusConfig.PENDING
              const StatusIcon = currentStatus.icon

              // Motivos traducidos
              const reasonLabels = {
                defectuoso: 'Defectuoso / Dañado',
                no_esperado: 'No esperado',
                talla_incorrecta: 'Talla/Color Incorrecto',
                otro: 'Otro motivo'
              }

              return (
                <motion.div
                  key={claim.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-surface rounded-3xl border border-app overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  {/* Vista Resumen (Click para expandir) */}
                  <div
                    onClick={() => handleToggleExpand(claim)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-surface-2/30 transition-colors"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${currentStatus.bg}`}>
                        <StatusIcon size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-app text-sm truncate">{claim.clientName}</span>
                          <span className="text-[10px] text-muted font-medium bg-surface-2 border border-app px-2 py-0.5 rounded-full">
                            Ref: {claim.orderNumber}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-1 font-medium flex items-center gap-1.5">
                          <Phone size={12} className="text-muted" /> {claim.clientPhone}
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <Calendar size={12} className="text-muted" /> {formatDate(claim.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-app pt-3 md:pt-0">
                      <div className="text-left md:text-right shrink-0">
                        <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Motivo</p>
                        <p className="text-xs font-bold text-app mt-0.5">{reasonLabels[claim.reason] || claim.reason}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp size={18} className="text-muted" />
                        ) : (
                          <ChevronDown size={18} className="text-muted" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vista Expandida */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-t border-app bg-surface-2/20"
                      >
                        <div className="p-5 md:p-6 space-y-6">
                          {/* Productos en el reclamo */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-app uppercase tracking-wider flex items-center gap-2">
                              <FileText size={14} className="text-primary" /> Productos reclamados
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {claim.products?.map((prod, idx) => (
                                <div
                                  key={idx}
                                  className="p-3.5 rounded-2xl bg-surface border border-app flex items-center justify-between gap-3 text-xs"
                                >
                                  <div>
                                    <p className="font-bold text-app leading-tight">{prod.name}</p>
                                    <p className="text-[10px] text-muted mt-1 font-medium">
                                      {prod.color && `Color: ${prod.color}`} {prod.talla && ` | Talla: ${prod.talla}`}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-app">{formatCurrency(prod.price)}</p>
                                    <p className="text-[10px] text-muted mt-0.5">Cant: {prod.quantity}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Justificación del cliente */}
                          <div className="p-4 rounded-2xl bg-surface-2 border border-app space-y-2">
                            <p className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                              <MessageSquare size={12} className="text-muted" /> Descripción del Cliente
                            </p>
                            <p className="text-xs text-app leading-relaxed font-medium">
                              "{claim.description}"
                            </p>
                          </div>

                          {/* Sección del Administrador */}
                          <div className="border-t border-app pt-6 space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-app uppercase tracking-wider mb-2">
                                Notas de Gestión del Administrador
                              </label>
                              <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) =>
                                  setAdminNotesText((prev) => ({
                                    ...prev,
                                    [claim.id]: e.target.value
                                  }))
                                }
                                placeholder="Escribe instrucciones de reembolso, cambio de producto o comentarios sobre la decisión..."
                                className="w-full p-4.5 rounded-2xl bg-surface border border-app text-xs text-app focus:outline-none focus:border-primary transition-colors resize-none leading-relaxed"
                              />
                            </div>

                            {/* Acciones */}
                            <div className="flex flex-col sm:flex-row gap-3">
                              {/* Contactar WhatsApp */}
                              <button
                                onClick={() => handleWhatsAppContact(claim)}
                                className="h-11 px-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/20 active:scale-95 transition-all"
                              >
                                <ExternalLink size={14} /> Contactar por WhatsApp
                              </button>

                              <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
                                <button
                                  onClick={() => handleUpdateStatus(claim.id, 'REJECTED')}
                                  disabled={isLoadingAction}
                                  className={`flex-1 sm:flex-none h-11 px-6 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                                    claim.status === 'REJECTED'
                                      ? 'bg-red-500 text-white shadow-sm hover:opacity-90 active:scale-95'
                                      : 'border border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 active:scale-95'
                                  }`}
                                >
                                  <XCircle size={14} />
                                  {claim.status === 'REJECTED' ? 'Guardar Rechazado' : 'Rechazar'}
                                </button>

                                <button
                                  onClick={() => handleUpdateStatus(claim.id, 'APPROVED')}
                                  disabled={isLoadingAction}
                                  className={`flex-1 sm:flex-none h-11 px-6 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                                    claim.status === 'APPROVED'
                                      ? 'bg-emerald-500 text-white shadow-sm hover:opacity-90 active:scale-95'
                                      : 'border border-emerald-500/20 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 active:scale-95'
                                  }`}
                                >
                                  {isLoadingAction ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 size={14} />
                                      {claim.status === 'APPROVED' ? 'Guardar Aprobado' : 'Aprobar'}
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
