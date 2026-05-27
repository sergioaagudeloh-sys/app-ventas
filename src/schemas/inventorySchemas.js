import { z } from 'zod'
import { PRODUCT_GENDERS } from '../constants'

/**
 * Esquema de validación para una Categoría.
 */
export const categorySchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z.string().optional(),
  iconName: z.string().optional().default('Tag'),
  activa: z.boolean().default(true),
})

/**
 * Esquema de validación para una Variante de Producto.
 * Ejemplo: Talla M, Color Rojo, Stock 10.
 */
export const variantSchema = z.object({
  id: z.string(), // ID local generado con crypto.randomUUID()
  talla: z.string().optional().or(z.literal('')),
  color: z.string().optional().or(z.literal('')),
  stock: z.number().int().min(0, 'El stock no puede ser negativo').default(0),
})

/**
 * Esquema de validación principal para un Producto.
 */
export const productSchema = z.object({
  id: z.string().optional(),
  nombre: z.string({
    required_error: 'El nombre es obligatorio',
    invalid_type_error: 'El nombre debe ser texto',
  }).min(3, 'El nombre debe tener al menos 3 caracteres'),
  descripcion: z.string().optional(),
  precioBase: z.number({
    required_error: 'El precio al detal es obligatorio',
    invalid_type_error: 'El precio debe ser un número',
  }).min(0, 'El precio no puede ser negativo'),
  precioMayorista: z.number({
    invalid_type_error: 'El precio mayorista debe ser un número',
  }).min(0, 'El precio mayorista no puede ser negativo').optional(),
  categoriaId: z.string({
    required_error: 'Debe seleccionar una categoría',
    invalid_type_error: 'Debe seleccionar una categoría válida',
  }).min(1, 'Debe seleccionar una categoría'),
  // Nombre de texto de la categoría (derivado de categoriaId al guardar)
  categoria: z.string().optional().default(''),
  
  // Atributos dinámicos del producto (Reemplaza marca, genero, material, etc)
  atributos: z.record(z.string()).optional().default({}),
  
  // Regla estricta del informe: SOLO URL, no subida de archivos
  imageUrl: z.string({
    invalid_type_error: 'La URL de la imagen debe ser texto',
  }).url('Debe ser una URL válida de imagen que comience con http:// o https://').optional().or(z.literal('')),
  
  // Inventario
  umbralAlerta: z.number({
    invalid_type_error: 'La alerta de stock debe ser un número',
  }).int().min(0, 'La alerta no puede ser negativa').default(5),
  variantes: z.array(variantSchema).min(1, 'El producto debe tener al menos una variante'),
  
  // Descuento directo en Inventario
  discountActive: z.boolean().optional().default(false),
  discountType: z.enum(['percentage', 'amount']).optional().default('percentage'),
  discountValue: z.number().min(0, 'El valor del descuento no puede ser negativo').optional().default(0),

  // Metadatos
  activo: z.boolean().default(true),
  createdAt: z.any().optional(), // Timestamp Firebase
  updatedAt: z.any().optional(), // Timestamp Firebase
})
