import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { couponService } from '../services/couponService'

export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: () => couponService.getCoupons(),
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  })
}

export function useCreateCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => couponService.createCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
    }
  })
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => couponService.updateCoupon(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
    }
  })
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => couponService.deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
    }
  })
}
