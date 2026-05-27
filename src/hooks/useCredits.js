import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as creditService from '../services/creditService'

const KEYS = {
  credits: (estado) => ['credits', { estado }],
  clientCredits: (celular) => ['credits', 'client', celular],
}

// ─── ADMIN HOOKS ─────────────────────────────────────────────────────────────

export function useCredits(estado = 'activo') {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = creditService.subscribeToCredits(estado, (credits) => {
      queryClient.setQueryData(KEYS.credits(estado), credits)
    })
    return () => unsubscribe()
  }, [estado, queryClient])

  return useQuery({
    queryKey: KEYS.credits(estado),
    queryFn: () => creditService.getCredits(estado),
    staleTime: Infinity,
  })
}

export function useAddPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paymentData }) => creditService.addPaymentToCredit(id, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

// ─── CLIENT HOOKS ────────────────────────────────────────────────────────────

export function useClientCredits(celular) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!celular) return
    const unsubscribe = creditService.subscribeToClientCredits(celular, (credits) => {
      queryClient.setQueryData(KEYS.clientCredits(celular), credits)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    })
    return () => unsubscribe()
  }, [celular, queryClient])

  return useQuery({
    queryKey: KEYS.clientCredits(celular),
    queryFn: () => creditService.getClientCredits(celular),
    enabled: !!celular,
    staleTime: Infinity,
  })
}
