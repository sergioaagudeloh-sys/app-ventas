# Flujos de la Aplicación — App Web de Gestión Comercial
> **Versión:** 1.0 — Fase 0 Scaffolding  
> **Última actualización:** 2026-05-22  
> **Regla crítica:** Actualizar este archivo cada vez que se modifique una función, colección, flujo o rol.

---

## FLUJO 1 — Autenticación del Administrador

| Campo | Detalle |
|---|---|
| **Objetivo** | Permitir al administrador acceder al panel de control de forma segura. |
| **Roles** | Admin |
| **Pantallas** | LoginPage → AdminLayout (Inicio) |
| **Colecciones** | `/config/settings` (validación de dominio autorizado — futuro) |

### Secuencia Operativa
1. Admin selecciona pestaña "Administrador" en LoginPage.
2. Presiona "Continuar con Google".
3. Firebase Authentication abre popup de Google OAuth.
4. Al autenticar, `signInWithPopup` retorna el usuario.
5. Se llama a `authStore.setAdmin()` con datos del usuario Firebase.
6. React Router redirige a `/admin/inicio`.

### Validaciones
- Solo usuarios con Google Auth válida pueden acceder.
- (Futuro Fase 2) Whitelist de emails autorizados en Firestore.

### Estados Posibles
- `isLoading: true` → Spinner visible, botón deshabilitado.
- Error de popup → Mensaje de error visible en UI.
- Login exitoso → Redirección inmediata.

---

## FLUJO 2 — Autenticación del Cliente

| Campo | Detalle |
|---|---|
| **Objetivo** | Permitir al cliente acceder rápidamente con nombre y celular, sin contraseña. |
| **Roles** | Cliente |
| **Pantallas** | LoginPage → ClientLayout (Catálogo) |
| **Colecciones** | `/users/{phone}` |

### Secuencia Operativa
1. Cliente ingresa nombre y número de celular en LoginPage.
2. Se valida que ambos campos estén completos y el celular tenga formato válido.
3. Se busca el documento en `/users/{cleanPhone}`.
4. Si NO existe → se crea con `setDoc` (nuevo cliente).
5. Si existe → se recuperan los datos (nombre, celular).
6. Se llama a `authStore.setClient()` con los datos.
7. Sesión persiste en localStorage via `zustand/middleware persist`.
8. React Router redirige a `/tienda/catalogo`.

### Validaciones
- Nombre: obligatorio, no vacío.
- Celular: mínimo 7 dígitos numéricos.
- El número NO es editable después del registro (es la clave primaria).
- Mensaje de confianza: *"Utilizaremos tu número únicamente para comunicarnos contigo sobre tus pedidos."*

### Estados Posibles
- `isLoading: true` → Spinner, botón deshabilitado.
- Error de Firestore → Mensaje de error en UI.
- Login exitoso → Redirección inmediata.

---

## FLUJO 3 — Creación de Pedido al Detal

| Campo | Detalle |
|---|---|
| **Objetivo** | Permitir al cliente seleccionar productos, elegir método de pago y enviar el pedido al admin via WhatsApp. |
| **Roles** | Cliente |
| **Pantallas** | Catálogo → CartDrawer → Checkout (método de pago) → WhatsApp |
| **Colecciones** | `/orders`, `/products/{id}/variants/{id}` |

### Secuencia Operativa
1. Cliente agrega productos al carrito desde el Catálogo (botones + y -).
2. Abre el CartDrawer (esquina superior derecha en mobile, sidebar en desktop).
3. Presiona "Hacer pedido".
4. Aparece selector de método de pago (tarjetas grandes):
   - **Efectivo:** *"El pago se realizará directamente al momento de la entrega."*
   - **Transferencia:** Muestra datos bancarios configurados por el admin.
   - **Crédito:** *"La tienda confirmará tu pedido y el crédito quedará registrado en tu perfil."*
5. Pantalla de confirmación: resumen del pedido, total, método de pago, nombre cliente.
6. Cliente presiona botón final "Confirmar pedido".
7. Se guarda el pedido en `/orders` con estado `pendiente`.
8. Se construye mensaje WhatsApp con todos los detalles.
9. Se abre `wa.me/{whatsappAdmin}?text={mensaje}`.
10. Feedback: *"Tu pedido fue enviado correctamente. La tienda se comunicará contigo pronto."*
11. Se vacía el carrito (`cartStore.clearCart()`).

### Validaciones
- Carrito no puede estar vacío.
- Cada producto requiere variante seleccionada (talla y/o color si aplica).
- Método de pago debe estar seleccionado.
- **IMPORTANTE:** El stock NO se descuenta en este momento.

### Estados Posibles del Pedido
- `pendiente` → Pedido recién creado.
- `en_proceso` → Admin está preparando el pedido.
- `completado` → Stock se descuenta, crédito se genera si aplica.
- `cancelado` → No afecta stock.

---

## FLUJO 4 — Descuento de Stock (Inventario)

| Campo | Detalle |
|---|---|
| **Objetivo** | Garantizar que el inventario solo se descuenta cuando el pedido es real y confirmado. |
| **Roles** | Admin |
| **Pantallas** | AdminOrders |
| **Colecciones** | `/orders/{orderId}`, `/products/{id}/variants/{id}` |

### Secuencia Operativa
1. Admin ve pedido con estado `pendiente` o `en_proceso`.
2. Admin cambia el estado a `completado`.
3. El sistema recorre los productos del pedido.
4. Para cada producto+variante, descuenta la cantidad del campo `stock`.
5. Si `stock <= umbralAlerta`, se genera alerta visual en AdminHome e AdminInventory.

### Validaciones
- Solo la acción "completado" descuenta stock.
- El estado "cancelado" NO descuenta stock.
- El sistema verifica que hay stock suficiente antes de completar (alerta si no alcanza).

### Estados Posibles
- Stock > umbralAlerta → Normal.
- Stock <= umbralAlerta → Alerta visual (color naranja/rojo).
- Stock = 0 → Producto agotado, oculto del catálogo.

---

## FLUJO 5 — Generación Automática de Crédito (Fiado)

| Campo | Detalle |
|---|---|
| **Objetivo** | Crear automáticamente una deuda cuando un pedido a crédito es completado. |
| **Roles** | Admin (acción) / Cliente (vista) |
| **Pantallas** | AdminOrders → AdminCredits / ClientCredits |
| **Colecciones** | `/orders/{orderId}`, `/credits/{creditId}`, `/credits/{id}/payments` |

### Secuencia Operativa
1. Cliente eligió método de pago "Crédito" al hacer el pedido.
2. Admin marca el pedido como `completado`.
3. El sistema detecta `metodoPago === 'credito'`.
4. Se crea automáticamente un documento en `/credits`:
   - `clienteId`, `clienteNombre`, `celular`
   - `totalDeuda` = total del pedido
   - `totalAbonado` = 0
   - `saldoPendiente` = totalDeuda
   - `estado` = `pendiente`
5. La deuda aparece en tiempo real en `AdminCredits` y `ClientCredits` via `onSnapshot`.

### Validaciones
- Solo pedidos con `metodoPago === 'credito'` generan crédito.
- Solo la acción "completado" dispara la generación.
- Un pedido no puede generar dos créditos (verificar existencia previa).

### Estados Posibles del Crédito
- `pendiente` → Sin abonos registrados.
- `parcial` → Con abonos parciales.
- `pagado` → Deuda saldada completamente.

---

## FLUJO 6 — Solicitud al Por Mayor

| Campo | Detalle |
|---|---|
| **Objetivo** | Permitir al cliente solicitar grandes cantidades sin afectar el flujo normal de compra. |
| **Roles** | Cliente (solicitud) / Admin (validación) |
| **Pantallas** | Catálogo (botón por producto) → Modal → AdminOrders (sección mayorista) |
| **Colecciones** | `/wholesaleOrders/{orderId}` |

### Secuencia Operativa
1. Cliente presiona "Solicitar al por mayor" en un producto del catálogo.
2. Se abre un modal/formulario rápido con: cantidad deseada + observaciones (opcional).
3. Un mensaje informa: *"Esta solicitud es especial, puede requerir validación y tiempos diferentes."*
4. Cliente confirma la solicitud.
5. Se guarda en `/wholesaleOrders` con estado `pendiente`.
6. En AdminOrders, la solicitud aparece visualmente diferenciada de los pedidos normales.
7. Admin puede cambiar el estado a: `revisando`, `aprobado`, `rechazado`.

### Validaciones
- La solicitud NO descuenta inventario automáticamente.
- Requiere validación manual del admin.
- No usa el mismo flujo de WhatsApp que los pedidos normales.

### Estados Posibles
- `pendiente` → Solicitud enviada.
- `revisando` → Admin está evaluando.
- `aprobado` → Admin aprobó la cantidad.
- `rechazado` → No fue posible atender la solicitud.

---

## FLUJO 7 — Personalización Visual (Admin)

| Campo | Detalle |
|---|---|
| **Objetivo** | Permitir que cada negocio personalice la identidad visual de la app sin tocar código. |
| **Roles** | Admin |
| **Pantallas** | AdminSettings |
| **Colecciones** | `/config/settings` |

### Secuencia Operativa
1. Admin accede a AdminSettings.
2. Modifica: nombre de la app, URL del ícono, paleta de colores, datos WhatsApp, datos bancarios.
3. Los cambios se guardan en `/config/settings` en Firestore.
4. `appConfigStore` escucha el documento en tiempo real via `onSnapshot`.
5. El cambio se refleja inmediatamente en TODA la app sin recargar.
6. La clase `data-theme` en `<html>` cambia automáticamente.

### Validaciones
- URL de ícono debe ser una URL válida.
- Nombre de la app: máximo 50 caracteres.
- WhatsApp: solo dígitos, con código de país.
- Datos bancarios: todos los campos obligatorios si se configuran.

---

## FLUJO 8 — Compra Guiada (Sistema de Asistencia)

| Campo | Detalle |
|---|---|
| **Objetivo** | Acompañar a usuarios con poca experiencia tecnológica en el proceso de compra, sin ser invasivo. |
| **Roles** | Cliente |
| **Pantallas** | Todas las del cliente (Catálogo, CarritoDrawer, Pedidos, Créditos) |
| **Colecciones** | Ninguna (solo localStorage via guidedStore) |

### Secuencia Operativa
1. Al ingresar al Catálogo por primera vez: *"Selecciona los productos que deseas comprar."*
2. Al agregar un producto: *"Muy bien, ahora revisa tu carrito."* (pulso suave en ícono del carrito).
3. Al abrir el carrito con productos: *"Verifica que toda la información esté correcta antes de continuar."*
4. Al seleccionar método de pago: mensaje contextual según el método elegido.
5. Post-pedido: *"Tu pedido fue enviado correctamente. La tienda se comunicará contigo pronto."*
6. Si el carrito está vacío al abrirlo: *"Agrega productos para comenzar tu pedido."*
7. Si usuario está mucho tiempo inactivo o abandona el carrito: *"¿Deseas activar la ayuda guiada?"*

### Lógica de No-Repetición
- `guidedStore.completedSteps` registra qué pasos ya aprendió el usuario.
- Si `guidedStore.orderCount >= 3` → usuario experimentado, se reducen las ayudas.
- El Modo Asistencia es un toggle en el perfil del cliente.

### Activación Inteligente
- Idle time > 10 segundos sin interacción en pantalla de login → ayuda sutil.
- Más de 2 aperturas del carrito sin confirmar pedido → sugerir activar asistencia.
- Primera vez en la app → ayudas activas automáticamente.

---

*Este archivo se actualizará con cada nueva función, flujo, colección o cambio de rol implementado en el proyecto.*
