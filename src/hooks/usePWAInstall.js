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

  const handleInstall = () => {
    if (!installPrompt) {
      const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
      if (isIOS) {
        alert('📱 Para instalar esta aplicación en tu iPhone o iPad:\n\n1. Pulsa el botón "Compartir" (el ícono de la caja con la flecha hacia arriba ↑ en la barra inferior de Safari).\n2. Desliza hacia abajo y selecciona "Agregar a la pantalla de inicio" (Add to Home Screen).\n3. Confirma pulsando "Agregar" en la esquina superior derecha.')
      } else {
        alert('💻 Para instalar la aplicación en tu pantalla de inicio:\n\n1. Haz clic en el botón de menú de tu navegador (los tres puntos "⋮" o barras "≡" en la esquina superior derecha).\n2. Selecciona la opción "Instalar aplicación", "Instalar Tienda" o "Agregar a la pantalla de inicio".')
      }
      return
    }
    
    try {
      // Invocar prompt() de forma 100% síncrona dentro del click handler para cumplir reglas de seguridad
      installPrompt.prompt()
      
      installPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') {
          setInstallPrompt(null)
          setIsInstallable(false)
        }
      }).catch(err => {
        console.warn('[PWA Install] Error en userChoice:', err)
      })
    } catch (err) {
      console.warn('[PWA Install] El prompt nativo falló, mostrando instrucciones manuales:', err)
      alert('💻 Para instalar la aplicación en tu pantalla de inicio:\n\n1. Haz clic en el botón de menú de tu navegador (los tres puntos "⋮" o barras "≡" en la esquina superior derecha).\n2. Selecciona la opción "Instalar aplicación", "Instalar Tienda" o "Agregar a la pantalla de inicio".')
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
