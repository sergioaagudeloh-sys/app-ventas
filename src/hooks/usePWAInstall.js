import { useState, useEffect } from 'react'

export default function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('pwa-install-dismissed') === 'true'
  })

  useEffect(() => {
    const handler = (e) => {
      // Prevenir el comportamiento por defecto de Chrome
      e.preventDefault()
      // Guardar el evento para dispararlo después
      setInstallPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Si ya se abrió en modo autónomo (standalone), no mostrar invitación
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

  const dismissPrompt = () => {
    sessionStorage.setItem('pwa-install-dismissed', 'true')
    setIsDismissed(true)
  }

  return { 
    isInstallable: isInstallable && !isDismissed, 
    handleInstall, 
    dismissPrompt 
  }
}
