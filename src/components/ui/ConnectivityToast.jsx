import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'

export default function ConnectivityToast() {
  const [status, setStatus] = useState(null) // null, 'online', 'offline'

  useEffect(() => {
    const handleOnline = () => {
      setStatus('online')
      const timer = setTimeout(() => {
        setStatus(null)
      }, 3000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!status) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
      >
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg border backdrop-blur-md bg-opacity-90 font-bold text-xs select-none transition-all ${
          status === 'online'
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
        }`}>
          {status === 'online' ? (
            <>
              <Wifi size={14} className="animate-pulse" />
              <span>Conexión restablecida</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="animate-bounce" />
              <span>Sin conexión a Internet</span>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
