import { useState, useEffect } from 'react'

export default function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isDismissed, setIsDismissed] = useState(() => {
    // 1. Verificar si está descartado permanentemente
    const permanentDismiss = localStorage.getItem('pwa-install-dismissed') === 'true'
    if (permanentDismiss) return true

    // 2. Verificar si se pospuso temporalmente (Recordar más tarde)
    const remindLaterTime = localStorage.getItem('pwa-install-remind-later')
    if (remindLaterTime) {
      const hoursPassed = (Date.now() - Number(remindLaterTime)) / (1000 * 60 * 60)
      if (hoursPassed < 24) {
        return true // Aún en periodo de gracia de 24h
      }
    }
    return false
  })

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    
    installPrompt.prompt()
    
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setIsInstallable(false)
    }
  }

  const dismissPrompt = (remindLater = false) => {
    if (remindLater) {
      // Recordar más tarde: guardar fecha actual
      localStorage.setItem('pwa-install-remind-later', Date.now().toString())
    } else {
      // Cerrar permanentemente
      localStorage.setItem('pwa-install-dismissed', 'true')
    }
    setIsDismissed(true)
  }

  return { 
    isInstallable: isInstallable && !isDismissed, 
    rawInstallable: isInstallable,
    handleInstall, 
    dismissPrompt 
  }
}
