import { z } from 'zod'
import { PAYMENT_METHODS } from '../constants'

export const checkoutSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  celular: z.string().min(7, 'Ingresa un número de celular válido'),
  direccion: z.string().min(5, 'La dirección debe ser más descriptiva'),
  barrio: z.string().min(2, 'Ingresa tu barrio o sector'),
  ciudad: z.string().min(2, 'Ingresa tu ciudad'),
  
  // El método de pago debe ser uno de los definidos en las constantes (efectivo, transferencia, credito)
  metodoPago: z.enum([PAYMENT_METHODS.CASH, PAYMENT_METHODS.TRANSFER, PAYMENT_METHODS.CREDIT], {
    required_error: 'Debes seleccionar un método de pago',
  }),

  // Notas opcionales
  notas: z.string().optional(),
})
