import { useEffect } from 'react'
import { subscribeToAppConfig, subscribeToCatalogFilters } from '../services/appConfigService'
import useAppConfigStore from '../store/appConfigStore'

/**
 * Hook global que sincroniza la configuración de Firestore con Zustand.
 * Debe ser llamado una sola vez en la raíz de la aplicación (App.jsx).
 */
export default function useAppConfigSync() {
  const { setConfig } = useAppConfigStore()

  useEffect(() => {
    // Suscripción a los ajustes generales (nombre, tema, banco, whatsapp, etc.)
    const unsubscribeSettings = subscribeToAppConfig((settings) => {
      setConfig(settings)
    })

    // Suscripción a los filtros del catálogo activos
    const unsubscribeFilters = subscribeToCatalogFilters((filters) => {
      setConfig({ catalogFilters: filters })
    })

    // Cleanup: desuscribirse cuando se desmonta (idealmente nunca en la raíz)
    return () => {
      unsubscribeSettings()
      unsubscribeFilters()
    }
  }, [setConfig])
}
