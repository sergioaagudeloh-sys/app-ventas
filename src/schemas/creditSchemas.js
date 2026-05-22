import { z } from 'zod'

/**
 * Esquema para validar un abono (pago parcial) a una deuda
 */
export const paymentSchema = z.object({
  monto: z.number().min(1000, 'El abono mínimo es de $1.000'),
  fecha: z.any().optional(), // Firebase Timestamp
  nota: z.string().optional(),
})

/**
 * Esquema representativo de una Deuda (Crédito)
 */
export const creditSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  clienteNombre: z.string(),
  clienteCelular: z.string(),
  
  montoTotal: z.number().min(0),
  saldoPendiente: z.number().min(0),
  
  abonos: z.array(paymentSchema).default([]),
  
  estado: z.enum(['activo', 'pagado']).default('activo'),
  
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
})
