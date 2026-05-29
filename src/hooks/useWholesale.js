import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as wholesaleService from '../services/wholesaleService'

const KEYS = {
  wholesale: ['wholesaleRequests'],
}

export function useWholesaleRequests() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = wholesaleService.subscribeToWholesaleRequests((requests) => {
      queryClient.setQueryData(KEYS.wholesale, requests)
    })
    return () => unsubscribe()
  }, [queryClient])

  return useQuery({
    queryKey: KEYS.wholesale,
    queryFn: () => queryClient.getQueryData(KEYS.wholesale) || [], // Evita devolver [] si se invalida
    staleTime: Infinity,
  })
}

export function useClientWholesaleRequests(celular) {
  const queryClient = useQueryClient()
  const queryKey = ['clientWholesaleRequests', celular]

  useEffect(() => {
    if (!celular) return
    const unsubscribe = wholesaleService.subscribeToClientWholesaleRequests(celular, (requests) => {
      queryClient.setQueryData(queryKey, requests)
    })
    return () => unsubscribe()
  }, [celular, queryClient])

  return useQuery({
    queryKey,
    queryFn: () => queryClient.getQueryData(queryKey) || [],
    enabled: !!celular,
    staleTime: Infinity,
  })
}

export function useUpdateWholesaleStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newStatus }) => 
      wholesaleService.updateWholesaleRequestStatus(id, newStatus),
    onSuccess: (data, variables) => {
      // No invalidamos la lista completa de forma destructiva porque se gestiona por onSnapshot en tiempo real
    },
  })
}
