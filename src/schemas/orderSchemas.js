import { z } from 'zod'
import { PAYMENT_METHODS } from '../constants'

export const checkoutSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  celular: z.string().min(7, 'Ingresa un número de celular válido'),

  // Tipo de entrega: domicilio o retiro en tienda
  tipoEntrega: z.enum(['domicilio', 'retiro'], {
    required_error: 'Selecciona un método de entrega',
  }),

  // Campos de dirección — solo requeridos si es domicilio
  direccion: z.string().optional(),
  barrio: z.string().optional(),
  ciudad: z.string().optional(),

  // El método de pago debe ser uno de los definidos en las constantes (efectivo, transferencia, credito)
  metodoPago: z.enum([PAYMENT_METHODS.CASH, PAYMENT_METHODS.TRANSFER, PAYMENT_METHODS.CREDIT], {
    required_error: 'Debes seleccionar un método de pago',
  }),

  // Notas opcionales
  notas: z.string().optional(),
}).superRefine((data, ctx) => {
  // Si es domicilio, los campos de dirección son obligatorios
  if (data.tipoEntrega === 'domicilio') {
    if (!data.direccion || data.direccion.length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La dirección debe ser más descriptiva', path: ['direccion'] })
    }
    if (!data.barrio || data.barrio.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa tu barrio o sector', path: ['barrio'] })
    }
    if (!data.ciudad || data.ciudad.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa tu ciudad', path: ['ciudad'] })
    }
  }
})

