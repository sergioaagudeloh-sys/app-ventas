import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../../config/firebaseConfig'
import { Bell, Smartphone, ShieldCheck, Mail, Send, Eye } from 'lucide-react'

export default function AdminNotificationAnalytics() {
  const [stats, setStats] = useState({
    total: 0,
    read: 0,
    unread: 0,
    fcmTokens: 0
  })
  const [recentNotifications, setRecentNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const notifSnap = await getDocs(collection(db, 'notifications'))
        const tokenSnap = await getDocs(collection(db, 'fcmTokens'))

        let read = 0
        let unread = 0
        notifSnap.docs.forEach(doc => {
          const data = doc.data()
          if (data.status === 'read') read++
          if (data.status === 'unread') unread++
        })

        setStats({
          total: notifSnap.size,
          read,
          unread,
          fcmTokens: tokenSnap.size
        })

        // Obtener recientes
        const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(10))
        const qSnap = await getDocs(q)
        setRecentNotifications(qSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error('[Analytics] Error cargando estadísticas:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-32 bg-surface-2 rounded-2xl animate-pulse" />
        <div className="h-64 bg-surface-2 rounded-2xl animate-pulse" />
      </div>
    )
  }

  const readRate = stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto text-app">
      <div>
        <h2 className="text-xl font-bold">Métricas del Centro de Notificaciones</h2>
        <p className="text-xs text-muted">Auditoría del canal de mensajería y efectividad de lectura.</p>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Notificaciones Emitidas', val: stats.total, icon: Bell, col: 'text-primary' },
          { label: 'Leídas', val: stats.read, icon: Eye, col: 'text-emerald-500' },
          { label: 'Tasa de Lectura', val: `${readRate}%`, icon: ShieldCheck, col: 'text-indigo-500' },
          { label: 'Tokens FCM Activos', val: stats.fcmTokens, icon: Smartphone, col: 'text-amber-500' }
        ].map((card, idx) => (
          <div key={idx} className="p-4 bg-surface border border-app rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted leading-tight">{card.label}</span>
              <card.icon size={16} className={card.col} />
            </div>
            <p className="text-xl font-bold mt-1">{card.val}</p>
          </div>
        ))}
      </div>

      {/* Tabla Recientes */}
      <div className="bg-surface border border-app rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-app bg-surface-2">
          <h3 className="font-bold text-xs">Historial Reciente de Envíos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-app text-muted bg-surface-2">
                <th className="p-3">Destinatario</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Título / Mensaje</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Categoría de Sonido</th>
              </tr>
            </thead>
            <tbody>
              {recentNotifications.map(n => (
                <tr key={n.id} className="border-b border-app hover:bg-surface-2 transition-colors">
                  <td className="p-3 font-medium">{n.recipientId}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-surface-3 text-[10px]">{n.recipientRole}</span></td>
                  <td className="p-3">
                    <p className="font-bold text-[11px]">{n.title}</p>
                    <p className="text-[10px] text-muted truncate max-w-xs">{n.body}</p>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      n.status === 'read' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {n.status === 'read' ? 'Leído' : 'No leído'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-muted text-[10px] capitalize">{n.soundCategory || 'Normal'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
