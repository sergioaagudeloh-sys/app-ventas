/**
 * Constantes globales del sistema.
 * Centraliza todos los valores fijos de la aplicación.
 */

// ─── Roles del sistema ────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
  VENDEDOR: 'vendedor',
  COCINERO: 'cocinero',
  BODEGUERO: 'bodeguero',
  MESERO: 'mesero',
  MENSAJERO: 'mensajero',
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
  EMPLOYEES: 'employees',
  TABLES: 'tables',
  PRODUCTION: 'production',
  DELIVERIES: 'deliveries',
  STOCK_MOVEMENTS: 'stockMovements',
  ACCESS_LOGS: 'accessLogs',
  DELIVERY_ANALYTICS: 'deliveryAnalytics',
}

// ─── Estados logísticos de entrega (mensajero propio) ─────────────────────────
export const DELIVERY_STATES = {
  PENDING:     'pendiente',
  ASSIGNED:    'asignado',
  READY:       'listo',
  ON_ROUTE:    'en_camino',
  DELIVERED:   'entregado',
  FAILED:      'fallido',
  RESCHEDULED: 'reprogramado',
}

// ─── Etiquetas UI de estados de entrega ──────────────────────────────────────
export const DELIVERY_STATE_LABELS = {
  pendiente:    'Pendiente',
  asignado:     'Domiciliario Asignado',
  listo:        'Listo para Despacho',
  en_camino:    'En Ruta',
  entregado:    'Entregado',
  fallido:      'Entrega Fallida',
  reprogramado: 'Reprogramado',
}

// ─── Estados del mensajero externo ───────────────────────────────────────────
export const MESSENGER_STATUS = {
  AVAILABLE:    'disponible',
  BUSY:         'ocupado',
  OUT_OF_SERVICE: 'fuera_servicio',
}

export const MESSENGER_STATUS_LABELS = {
  disponible:      'Disponible',
  ocupado:         'Ocupado',
  fuera_servicio:  'Fuera de Servicio',
}

// ─── Plantilla de mensaje por defecto para el mensajero ──────────────────────
export const DEFAULT_MESSENGER_TEMPLATE =
  '🛵 *Nuevo Pedido para Entrega*\n\n' +
  '📦 Pedido: *{pedido}*\n' +
  '👤 Cliente: {cliente}\n' +
  '📍 Dirección: {direccion}\n' +
  '📞 Teléfono: {telefono}\n' +
  '💰 Total: {total}\n' +
  '💳 Pago: {metodo_pago}\n' +
  '📝 Observaciones: {notas}\n\n' +
  'Por favor confirma la recepción de esta orden.'

/**
 * PORTAL_CONFIG — fuente de verdad dinámica de todos los portales operativos.
 * Añadir un nuevo rol aquí lo propaga automáticamente al sistema QR,
 * al selector de auth, al panel admin y al historial.
 */
export const PORTAL_CONFIG = {
  [ROLES.VENDEDOR]: {
    label: 'Portal POS',
    labelCorto: 'Ventas',
    icon: 'ShoppingCart',
    color: '#a78bfa',
    colorBg: 'rgba(167,139,250,0.15)',
    colorBorder: 'rgba(167,139,250,0.3)',
    route: '/portal/vendedor',
    authRoute: '/portal/auth?rol=vendedor',
    emoji: '🛒',
  },
  [ROLES.COCINERO]: {
    label: 'Portal Cocina',
    labelCorto: 'Cocina',
    icon: 'ChefHat',
    color: '#fb923c',
    colorBg: 'rgba(251,146,60,0.15)',
    colorBorder: 'rgba(251,146,60,0.3)',
    route: '/portal/cocina',
    authRoute: '/portal/auth?rol=cocinero',
    emoji: '🍳',
  },
  [ROLES.BODEGUERO]: {
    label: 'Portal Bodega',
    labelCorto: 'Bodega',
    icon: 'Package',
    color: '#38bdf8',
    colorBg: 'rgba(56,189,248,0.15)',
    colorBorder: 'rgba(56,189,248,0.3)',
    route: '/portal/bodega',
    authRoute: '/portal/auth?rol=bodeguero',
    emoji: '📦',
  },
  [ROLES.MESERO]: {
    label: 'Portal Mesero',
    labelCorto: 'Salón',
    icon: 'Utensils',
    color: '#34d399',
    colorBg: 'rgba(52,211,153,0.15)',
    colorBorder: 'rgba(52,211,153,0.3)',
    route: '/portal/mesero',
    authRoute: '/portal/auth?rol=mesero',
    emoji: '🍽️',
  },
  [ROLES.MENSAJERO]: {
    label: 'Portal Mensajero',
    labelCorto: 'Domicilios',
    icon: 'Truck',
    color: '#fb7185',
    colorBg: 'rgba(248,113,130,0.15)',
    colorBorder: 'rgba(248,113,130,0.3)',
    route: '/portal/mensajero',
    authRoute: '/portal/auth?rol=mensajero',
    emoji: '🛵',
  },
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

// ─── PIN del desarrollador para Facturación y Pruebas ──────────────────
export const DEV_PIN = '1609'

// ─── Metadatos ricos de estados para el tracking público ─────────────────────
// Añadir aquí cualquier estado nuevo. OrderTracking.jsx lo mostrará automáticamente.
// icon: nombre exacto del ícono de Lucide React.
// color: clave del mapa de colores en OrderTracking (amber|indigo|emerald|rose|orange|blue).
// terminal: true si es estado de fin de flujo (el stepper no avanza más).
// isError: true si es un estado terminal negativo (cancelado, etc.).
export const ORDER_STATE_META = {
  pendiente: {
    label: 'Recibido',
    desc: 'Tu pedido está en espera de revisión',
    icon: 'Clock',
    color: 'amber',
    terminal: false,
    isError: false,
  },
  credito_aprobado: {
    label: 'Crédito Aprobado',
    desc: 'Tu pago o crédito ha sido validado',
    icon: 'ShieldCheck',
    color: 'indigo',
    terminal: false,
    isError: false,
  },
  completado: {
    label: 'Entregado',
    desc: 'Tu pedido fue entregado exitosamente',
    icon: 'CheckCircle2',
    color: 'emerald',
    terminal: true,
    isError: false,
  },
  cancelado: {
    label: 'Cancelado',
    desc: 'Este pedido fue cancelado',
    icon: 'AlertTriangle',
    color: 'rose',
    terminal: true,
    isError: true,
  },
  alistamiento: {
    label: 'En Preparación',
    desc: 'Tu pedido está siendo preparado en cocina',
    icon: 'ChefHat',
    color: 'orange',
    terminal: false,
    isError: false,
  },
  listo: {
    label: 'Listo para Despacho',
    desc: 'Tu pedido ya está listo para ser despachado',
    icon: 'ShoppingBag',
    color: 'blue',
    terminal: false,
    isError: false,
  },
  en_camino: {
    label: 'En Camino',
    desc: 'El repartidor lleva tu pedido en camino',
    icon: 'Truck',
    color: 'indigo',
    terminal: false,
    isError: false,
  },
  fallido: {
    label: 'Entrega Fallida',
    desc: 'No fue posible realizar la entrega. Te contactaremos pronto.',
    icon: 'AlertTriangle',
    color: 'rose',
    terminal: false,
    isError: true,
  },
  reprogramado: {
    label: 'Reprogramado',
    desc: 'La entrega fue reprogramada. Tu pedido sigue en camino.',
    icon: 'Clock',
    color: 'amber',
    terminal: false,
    isError: false,
  },
}

// ─── Secuencia del stepper para pedidos de DOMICILIO ─────────────────────────
// Añade estados intermedios aquí cuando implementes cocina, en_camino, etc.
export const ORDER_TRACKING_STEPS_DOMICILIO = [
  'pendiente',
  'credito_aprobado',
  'alistamiento',
  'listo',
  'en_camino',
  'completado',
]

// ─── Secuencia del stepper para pedidos de RETIRO EN TIENDA ──────────────────
// Flujo independiente. Puede tener pasos como listo_para_recoger.
export const ORDER_TRACKING_STEPS_RETIRO = [
  'pendiente',
  'credito_aprobado',
  'alistamiento',
  'listo',
  'completado',
]
