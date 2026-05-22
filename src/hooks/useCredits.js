import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as creditService from '../services/creditService'

const KEYS = {
  credits: ['credits'],
  clientCredits: (celular) => ['credits', 'client', celular],
}

// ─── ADMIN HOOKS ─────────────────────────────────────────────────────────────

export function useCredits(estado = 'activo') {
  return useQuery({
    queryKey: [...KEYS.credits, { estado }],
    queryFn: () => creditService.getCredits(estado),
  })
}

export function useAddPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paymentData }) => creditService.addPaymentToCredit(id, paymentData),
    onSuccess: () => {
      // Al hacer un abono, invalidamos la lista de créditos en general
      // y también los del cliente para que vea su nuevo saldo si está en la app
      queryClient.invalidateQueries({ queryKey: KEYS.credits })
    },
  })
}

// ─── CLIENT HOOKS ────────────────────────────────────────────────────────────

export function useClientCredits(celular) {
  return useQuery({
    queryKey: KEYS.clientCredits(celular),
    queryFn: () => creditService.getClientCredits(celular),
    enabled: !!celular,
  })
}
