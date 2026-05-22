import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as orderService from '../services/orderService'

const KEYS = {
  orders: ['orders'],
  clientOrders: (celular) => ['orders', 'client', celular],
}

// ─── ADMIN HOOKS ─────────────────────────────────────────────────────────────

export function useOrders() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = orderService.subscribeToOrders((orders) => {
      queryClient.setQueryData(KEYS.orders, orders)
    })
    return () => unsubscribe()
  }, [queryClient])

  return useQuery({
    queryKey: KEYS.orders,
    queryFn: orderService.getOrders,
    staleTime: Infinity, // El caché lo maneja onSnapshot
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newStatus, currentOrder }) => 
      orderService.updateOrderStatus(id, newStatus, currentOrder),
    onSuccess: () => {
      // Al actualizar un estado (especialmente si es Completado), invalidamos
      // tanto los pedidos como el inventario, porque el stock pudo haber cambiado.
      queryClient.invalidateQueries({ queryKey: KEYS.orders })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// ─── CLIENT HOOKS ────────────────────────────────────────────────────────────

export function useClientOrders(celular) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!celular) return
    const unsubscribe = orderService.subscribeToClientOrders(celular, (orders) => {
      queryClient.setQueryData(KEYS.clientOrders(celular), orders)
    })
    return () => unsubscribe()
  }, [celular, queryClient])

  return useQuery({
    queryKey: KEYS.clientOrders(celular),
    queryFn: () => orderService.getClientOrders(celular),
    enabled: !!celular,
    staleTime: Infinity, // El caché lo maneja onSnapshot
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: orderService.createOrder,
    onSuccess: (_, variables) => {
      // Invalidar los pedidos de ese cliente específico para que vea su nuevo pedido
      if (variables.cliente?.celular) {
        queryClient.invalidateQueries({ queryKey: KEYS.clientOrders(variables.cliente.celular) })
      }
      queryClient.invalidateQueries({ queryKey: KEYS.orders })
    },
  })
}
