import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as adService from '../services/adService'

const KEYS = {
  ads: ['ads'],
}

/**
 * Hook para obtener todos los anuncios (activos e inactivos) con suscripción en tiempo real
 */
export function useAds() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = adService.subscribeToAds((ads) => {
      queryClient.setQueryData(KEYS.ads, ads)
    })
    return () => unsubscribe()
  }, [queryClient])

  return useQuery({
    queryKey: KEYS.ads,
    queryFn: adService.getAds,
    staleTime: Infinity,
  })
}

/**
 * Hook para crear un anuncio
 */
export function useCreateAd() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adService.createAd,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.ads })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/**
 * Hook para actualizar un anuncio
 */
export function useUpdateAd() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => adService.updateAd(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.ads })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/**
 * Hook para eliminar un anuncio
 */
export function useDeleteAd() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adService.deleteAd,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.ads })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
