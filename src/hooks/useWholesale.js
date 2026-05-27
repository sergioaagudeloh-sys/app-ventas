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
    queryFn: () => [], // El caché y el feed los maneja onSnapshot
    staleTime: Infinity,
  })
}

export function useUpdateWholesaleStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newStatus }) => 
      wholesaleService.updateWholesaleRequestStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.wholesale })
    },
  })
}
