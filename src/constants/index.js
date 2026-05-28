/**
 * Constantes globales del sistema.
 * Centraliza todos los valores fijos de la aplicación.
 */

// ─── Roles del sistema ────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
}

// ─── Estados de pedidos ───────────────────────────────────────────────────────
export const ORDER_STATES = {
  PENDING: 'pendiente',
  COMPLETED: 'completado',
  CANCELLED: 'cancelado',
  CREDIT_APPROVED: 'credito_aprobado',
}

// ─── Etiquetas UI de estados de pedidos ──────────────────────────────────────
export const ORDER_STATE_LABELS = {
  pendiente: 'Pendiente',
  completado: 'Completado',
  cancelado: 'Cancelado',
  credito_aprobado: 'Crédito Aprobado',
}

// ─── Tipos de pedido ──────────────────────────────────────────────────────────
export const ORDER_TYPES = {
  RETAIL: 'detal',
  WHOLESALE: 'mayorista',
}

// ─── Métodos de pago ──────────────────────────────────────────────────────────
export const PAYMENT_METHODS = {
  CASH: 'efectivo',
  TRANSFER: 'transferencia',
  CREDIT: 'credito',
}

export const PAYMENT_METHOD_LABELS = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  credito: 'Crédito (Fiado)',
}

// ─── Mensajes contextuales exactos del método de pago (Informe §16.1) ────────
export const PAYMENT_METHOD_MESSAGES = {
  efectivo: 'El pago se realizará directamente al momento de la entrega.',
  transferencia: 'Realiza la transferencia usando la información bancaria mostrada.',
  credito: 'La tienda confirmará tu pedido y el crédito quedará registrado en tu perfil.',
}

// ─── Estados de créditos ──────────────────────────────────────────────────────
export const CREDIT_STATES = {
  PENDING: 'pendiente',
  PARTIAL: 'parcial',
  PAID: 'pagado',
}

export const CREDIT_STATE_LABELS = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagado: 'Pagado',
}

// ─── Estados de solicitudes al por mayor ─────────────────────────────────────
export const WHOLESALE_STATES = {
  PENDING: 'pendiente',
  REVIEWING: 'revisando',
  APPROVED: 'aprobado',
  REJECTED: 'rechazado',
}

// ─── Géneros de productos ─────────────────────────────────────────────────────
export const PRODUCT_GENDERS = [
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'infantil', label: 'Infantil' },
]

// ─── Colecciones de Firestore ─────────────────────────────────────────────────
export const COLLECTIONS = {
  CONFIG: 'config',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  USERS: 'users',
  ORDERS: 'orders',
  WHOLESALE_ORDERS: 'wholesaleOrders',
  CREDITS: 'credits',
  ADS: 'ads',
  CLAIMS: 'claims',
  COUPONS: 'coupons',
}

// ─── Soporte técnico (hardcoded según informe §12) ───────────────────────────
export const SUPPORT_WHATSAPP = '+573242882751'
export const SUPPORT_MESSAGE = 'Hola, necesito soporte técnico con la aplicación.'

// ─── Mensajes de la Compra Guiada (Informe §22) ──────────────────────────────
export const GUIDED_MESSAGES = {
  CATALOG_ENTRY: 'Selecciona los productos que deseas comprar.',
  PRODUCT_ADDED: 'Muy bien, ahora revisa tu carrito.',
  CART_EMPTY: 'Agrega productos para comenzar tu pedido.',
  CART_REVIEW: 'Verifica que toda la información esté correcta antes de continuar.',
  INVALID_QUANTITIES: 'Verifica las cantidades seleccionadas.',
  SELECT_VARIANT: 'Selecciona las opciones del producto antes de continuar.',
  PAYMENT_READY: 'Cuando estés listo, presiona "Hacer pedido".',
  ORDER_SENT: 'Tu pedido fue enviado correctamente. La tienda se comunicará contigo pronto.',
  NO_ORDERS: 'Aquí aparecerán los pedidos que realices.',
  NO_CREDITS: 'No tienes créditos pendientes.',
  SUGGEST_ASSISTANCE: '¿Deseas activar la ayuda guiada?',
  LOGIN_IDLE: 'Ingresa tus datos para continuar.',
  PRODUCT_DETAIL: 'Aquí puedes ver más detalles del producto.',
  CREDITS_ACTIVE: 'Aquí puedes consultar el estado de tus pagos.',
}

// ─── Texto de confianza en login cliente (Informe §4) ────────────────────────
export const CLIENT_LOGIN_TRUST_MESSAGE =
  'Utilizaremos tu número únicamente para comunicarnos contigo sobre tus pedidos.'

// ─── Contraseña del desarrollador para Facturación y Pruebas ──────────────────
export const DEV_PASSWORD = '1q2w3e4r5t6y7u8i9o0p..'
