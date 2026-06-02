import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  CheckCircle2,
  Trash2,
  X,
  Volume2,
  VolumeX,
  ChevronRight,
  Clock,
  Inbox,
  Filter
} from 'lucide-react'
import { NC_TYPE_META } from '../../services/notificationCenterService'

export default function NotificationHistoryTray({
  notifications = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onClose,
  soundEnabled = true,
  onToggleSound,
  onNavigate
}) {
  const [filter, setFilter] = useState('all') // 'all' | 'unread' | 'order' | 'system'

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.status === 'unread'
    if (filter === 'order') return n.type.startsWith('pedido') || n.type.startsWith('entrega')
    if (filter === 'system') return !n.type.startsWith('pedido') && !n.type.startsWith('entrega')
    return true
  })

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full w-full bg-surface text-app shadow-2xl relative border-l border-app">
      {/* Header */}
      <div className="px-5 py-3.5 border-b-2 border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative p-2 bg-primary/10 rounded-xl text-primary">
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Notificaciones</h3>
            <p className="text-xs text-muted">Historial en tiempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Toggle Sonido */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-lg hover:bg-surface-3 transition-colors text-muted-foreground hover:text-gray-900"
            title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Marcar Todo Leído */}
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="p-2 rounded-lg hover:bg-surface-3 transition-colors text-muted-foreground hover:text-primary"
              title="Marcar todo leído"
            >
              <CheckCircle2 size={18} />
            </button>
          )}

          {/* Limpiar Historial */}
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="p-2 rounded-lg hover:bg-surface-3 transition-colors text-muted-foreground hover:text-red-500"
              title="Archivar todas"
            >
              <Trash2 size={18} />
            </button>
          )}

          {/* Cerrar */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 py-4 border-b border-app flex flex-wrap gap-x-2 gap-y-3 justify-start bg-surface">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'unread', label: `No leídas (${unreadCount})` },
          { id: 'order', label: 'Pedidos' },
          { id: 'system', label: 'Sistema' }
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === btn.id
                ? 'bg-primary text-white shadow-md scale-[1.02]'
                : 'bg-surface-2 text-gray-600 hover:bg-surface-3 hover:text-gray-900'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <AnimatePresence initial={false}>
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted">
              <Inbox size={40} className="opacity-40 mb-3" />
              <p className="text-sm font-semibold">No tienes notificaciones</p>
              <p className="text-xs opacity-60 mt-1">Los avisos importantes aparecerán aquí</p>
            </div>
          ) : (
            filteredNotifications.map(n => {
              const meta = NC_TYPE_META[n.type] || {}
              const isUnread = n.status === 'unread'

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group flex items-start gap-3.5 ${
                    isUnread
                      ? 'bg-primary/5 border-primary/20 shadow-sm'
                      : 'bg-surface-2 border-app hover:bg-surface-3'
                  }`}
                  onClick={() => {
                    if (isUnread && onMarkRead) onMarkRead(n.id)
                    if (onNavigate && n.clickAction) onNavigate(n.clickAction)
                  }}
                >
                  {/* Punto de No Leído */}
                  {isUnread && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />
                  )}

                  {/* Icono de Tipo */}
                  <div className="p-2.5 rounded-lg bg-surface flex items-center justify-center shadow-sm">
                    <span className="text-xl">🔔</span>
                  </div>

                  {/* Detalles */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-app truncate">
                        {n.title || meta.label || 'Notificación'}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      {n.body}
                    </p>
                    <div className="flex items-center gap-2 mt-2.5 text-[11px] text-muted">
                      <span className="flex items-center gap-0.5">
                        <Clock size={12} />
                        {formatTime(n.createdAt)}
                      </span>
                      {n.orderNumber && (
                        <span className="bg-surface-3 px-1.5 py-0.5 rounded font-mono font-semibold">
                          #{n.orderNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acción rápida de navegación */}
                  {n.clickAction && (
                    <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={16} className="text-primary" />
                    </div>
                  )}
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
