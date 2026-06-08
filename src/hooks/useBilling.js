import { useState, useEffect, useCallback } from 'react'
import { subscribeToBillingData, updateCommissionPercent } from '../services/billingService'

/**
 * Hook para el módulo de Facturación del Desarrollador.
 * Se suscribe en tiempo real a métricas de comisión calculadas
 * sobre los pedidos completados y el porcentaje configurado.
 *
 * @returns {{
 *   metrics: object|null,
 *   isLoading: boolean,
 *   savePercent: (percent: number) => Promise<void>,
 *   isSaving: boolean,
 * }}
 */
import useAuthStore from '../store/authStore'

export function useBilling() {
  const [metrics, setMetrics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (!user) {
      setMetrics(null)
      setIsLoading(false)
      return
    }

    const unsubscribe = subscribeToBillingData((data) => {
      setMetrics(data)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  const savePercent = useCallback(async (percent) => {
    setIsSaving(true)
    try {
      await updateCommissionPercent(Number(percent))
    } finally {
      setIsSaving(false)
    }
  }, [])

  return { metrics, isLoading, savePercent, isSaving }
}
