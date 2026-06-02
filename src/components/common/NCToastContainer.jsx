import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'

export default function NCToastContainer({ toasts = [], onCloseToast, onToastClick }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            onClick={() => onToastClick(t)}
            className="pointer-events-auto bg-surface border border-app shadow-2xl rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden cursor-pointer hover:border-primary/50 transition-colors bg-opacity-95 backdrop-blur-sm"
          >
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Bell size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-app truncate">{t.title || 'Notificación'}</p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">{t.body}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCloseToast(t.id)
              }}
              className="text-muted hover:text-app transition-colors p-1"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
