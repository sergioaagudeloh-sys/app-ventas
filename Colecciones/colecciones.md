# Esquema y Propósito de Colecciones de la Base de Datos (Cloud Firestore)

Este documento detalla la estructura lógica, el propósito y la justificación técnica de las colecciones de Firestore necesarias para la operación y contabilidad del sistema **App Ventas**.

---

## 📂 Listado de Colecciones Requeridas

### 1. `config`
* **Propósito**: Configuración general del negocio y feature flags de personalización de instancias.
* **Función**: 
  * Almacena datos generales (título del negocio, nombre del vendedor, contacto, slogan, términos de garantía).
  * Guarda datos de conciliación bancaria y pasarelas de pago (bancos, titulares, códigos QR).
  * Controla de forma reactiva las banderas de módulos activos (`creditsEnabled`, `couponsEnabled`, `claimsEnabled`, `wholesaleSettings`, `tablesEnabled`).
  * Persiste el tema visual de marca en HSL y los eventos de temporada activos (`activeSeasonalEvent`).
  * Contiene la tasa de comisión configurada del desarrollador (`developerCommissionPercent`).

### 2. `products`
* **Propósito**: Inventario consolidado del catálogo de ventas.
* **Función**:
  * Detalla los atributos principales de los productos (nombre, género, categoría, miniatura, descripción extendida, tags).
  * Aloja el esquema de variantes de cada producto (tamaño, color, precio de venta, precio de costo, SKU, stock físico e imagen particular).
  * Establece la configuración de alertas críticas (`umbralAlerta`) para la compra de reabastecimiento.

### 3. `categories`
* **Propósito**: Estructuración del árbol de navegación del cliente.
* **Función**: Mapea los identificadores, nombres, y el icono SVG asignado a las categorías y subcategorías que ordenan el catálogo público.

### 4. `orders`
* **Propósito**: Historial consolidado de ventas y pedidos liquidados.
* **Función**:
  * Centraliza la información del pedido (número de orden correlativo, fecha de creación `createdAt`, tipo de entrega, método de pago, subtotal, descuento, costo de envío y total).
  * Detalla los artículos del carrito adquiridos con especificación exacta de la variante comprada.
  * Mapea el estado logístico del pedido (`pendiente`, `alistamiento`, `listo`, `en_camino`, `completado`, `cancelado`).
  * Mapea las coordenadas GPS de la dirección recogidas por el componente Leaflet en pedidos de domicilio.

### 5. `users`
* **Propósito**: Expediente de clientes registrados y fidelización.
* **Función**:
  * Almacena metadatos del cliente (nombre, teléfono de contacto y fecha de registro).
  * Vincula el historial de compras realizadas y los artículos marcados como favoritos.

### 6. `employees`
* **Propósito**: Gestión de personal operativo y controles de acceso táctil.
* **Función**:
  * Contiene perfiles con nombres, PINs encriptados de seguridad, y rol asignado (`vendedor`, `cocinero`, `bodeguero`, `mensajero`).
  * Gestiona los estados de disponibilidad operativa en tiempo real (`Disponible` / `Ocupado`).
  * Mapea la contabilidad de nómina (salario base, frecuencia de pago y fecha límite programada).

### 7. `accessLogs`
* **Propósito**: Auditoría de sesiones y control de tiempos.
* **Función**: Registra la hora exacta de entrada (`sessionStart`) y de salida (`sessionEnd`), el dispositivo/User-Agent, el rol del empleado y el portal operativo utilizado.

### 8. `ads`
* **Propósito**: Campañas de marketing e impulsadores de conversión.
* **Función**: Controla banners de catálogo, modales emergentes interactivos, vigencia temporal, y efectos especiales de brillo de neón (`glowEffect`).

### 9. `coupons`
* **Propósito**: Cupones de fidelización y descuentos por checkout.
* **Función**: Valida códigos en caliente, montos mínimos de compra, expiraciones cronológicas y límites de canje por cliente.

### 10. `deliveries`
* **Propósito**: Enrutamiento logístico y asignación a mensajeros.
* **Función**: Vincula pedidos a domiciliarios asignados o mensajeros externos, documenta notas o incidencias y guarda los tiempos estimados de despacho.

### 11. `stockMovements`
* **Propósito**: Auditoría física y kardex del almacén.
* **Función**: Loguea las entradas/salidas de inventario con variantes, cantidades, el ID del bodeguero responsable, tipo de movimiento, y justificación.

### 12. `wholesaleOrders`
* **Propósito**: Ventas mayoristas B2B.
* **Función**: Aloja las solicitudes formales de compra por volumen realizadas por clientes con estado de revisión administrativa.

### 13. `notifications`
* **Propósito**: Historial y control del Notification Center.
* **Función**: Almacena las alertas del sistema generadas por pedidos, faltas de stock y nóminas, con soporte de sonido por categoría.

### 14. `clientNotifications`
* **Propósito**: Centro de notificaciones para el comprador.
* **Función**: Permite desplegar y notificar al cliente en tiempo real sobre cambios de estados en su orden y cupones obsequiados.

### 15. `fcmTokens`
* **Propósito**: Infraestructura de alertas push móviles.
* **Función**: Agrupa los tokens de registro de dispositivos para el envío de notificaciones en background mediante Firebase Cloud Messaging.

### 16. `qrAnalytics`
* **Propósito**: Análisis y efectividad de marketing QR.
* **Función**: Cuenta los accesos a productos públicos o portales derivados del escaneo directo de los adhesivos y códigos de barras.

### 17. `trackingAnalytics`
* **Propósito**: Embudo de conversión y retornos del cliente.
* **Función**: Mapea los clicks hacia el catálogo, descargas de PWA e interacciones dentro de la pantalla de seguimiento del pedido.
