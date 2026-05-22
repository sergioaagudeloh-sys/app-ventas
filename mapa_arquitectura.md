# Mapa de Arquitectura — App Web de Gestión Comercial
> **Versión:** 1.0 — Fase 0 Scaffolding  
> **Última actualización:** 2026-05-22  
> **Regla crítica:** Leer este archivo ANTES de crear o modificar cualquier página, hook, componente, servicio o layout.

---

## Árbol Completo del Proyecto

```
d:/Aplicaciones/App Ventas/
├── instrucciones/
│   ├── guia_de_aplicaciones_definitiva.md   ← Guía Maestra Unificada 2026 (estándar técnico)
│   └── informe_aplicacion_reusable.md       ← Informe funcional completo de la aplicación
│
├── public/                                  ← Archivos estáticos públicos
│
├── src/
│   ├── components/                          ← Componentes UI reutilizables
│   │   ├── admin/
│   │   │   ├── inventory/
│   │   │   │   ├── CategoryManager.jsx     ← Gestión de categorías
│   │   │   │   └── ProductFormModal.jsx    ← Modal creación/edición con manejo de variantes y validación Zod
│   │   │   ├── AdminOrders.jsx             ← Panel Kanban/Lista para gestionar pedidos y estados
│   │   │   └── AdminCredits.jsx            ← Gestión de fiados, lista de deudores y registro de abonos
│   │   ├── client/
│   │   │   ├── catalog/
│   │   │   │   ├── ProductCard.jsx         ← Tarjeta de producto para el catálogo
│   │   │   │   ├── ProductDetailModal.jsx  ← Modal de detalle con selección estricta de variantes y stock
│   │   │   │   └── WholesaleRequestModal.jsx ← Modal especial para solicitudes al por mayor (Sección 15)
│   │   │   ├── cart/
│   │   │   │   └── CartDrawer.jsx          ← Drawer lateral del carrito
│   │   │   └── checkout/
│   │   │       └── CheckoutModal.jsx       ← Modal multi-pasos para finalizar compra (Datos, Pago, Éxito)
│   │   ├── ui/
│   │   │   ├── AppLoader.jsx               ← Loader global animado con nombre de la tienda
│   │   │   └── GuidedToast.jsx             ← Componente flotante de asistencia guiada paso a paso (Fase 8)
│   │   └── cart/
│   │       └── CartDrawer.jsx              ← Drawer del carrito (Framer Motion, Zustand)
│   │
│   ├── pages/                             ← Vistas completas que enlazan con AppRoutes
│   │   ├── LoginPage.jsx                  ← Login dual: Cliente (celular+nombre) / Admin (Google)
│   │   ├── admin/
│   │   │   ├── AdminHome.jsx              ← Dashboard/Dashboard con métricas y alertas
│   │   │   ├── AdminInventory.jsx         ← Contenedor maestro de productos y categorías
│   │   │   ├── AdminOrders.jsx            ← Contenedor de gestión de pedidos
│   │   │   ├── AdminCredits.jsx           ← Vista de créditos/fiados de la tienda
│   │   │   └── AdminSettings.jsx          ← Configuración general: Modo oscuro, Info banco, WhatsApp, Nombre app
│   │   └── client/
│   │       ├── ClientCatalog.jsx          ← Catálogo principal con grilla de ProductCard
│   │       ├── ClientFavorites.jsx        ← Lista de deseados (Favoritos) persistida
│   │       ├── ClientOrders.jsx           ← Historial personal de pedidos del cliente
│   │       ├── ClientCredits.jsx          ← Estado de cuenta y abonos del cliente (transparencia total)
│   │       └── ClientProfile.jsx          ← Perfil cliente, modo asistencia (Fase 8)
│   │
│   ├── hooks/                             ← Lógica reutilizable con hooks personalizados
│   │   ├── useAppConfigSync.js            ← Hook global que sincroniza Firestore <-> Zustand en tiempo real
│   │   ├── useInventory.js                ← Hooks TanStack Query para CRUD de productos y categorías
│   │   ├── useOrders.js                   ← Hooks TanStack Query para pedidos (Cliente y Admin)
│   │   └── useCredits.js                  ← Hooks TanStack Query para créditos y registro de abonos
│   │
│   ├── services/                          ← Capa de Firebase (Guía Maestra §1.3)
│   │   ├── appConfigService.js            ← Lee/escribe configuración general y filtros en Firestore
│   │   ├── inventoryService.js            ← Funciones CRUD puras para Firestore (productos y categorías)
│   │   ├── orderService.js                ← Funciones CRUD para pedidos (incluye transacción crítica de stock y créditos)
│   │   └── creditService.js               ← Funciones para gestión de deudas y abonos (Transaccional)
│   │
│   ├── store/                             ← Estados globales con Zustand
│   │   ├── authStore.js                  ← Auth: admin (Google) + cliente (celular). Persiste cliente en localStorage
│   │   ├── appConfigStore.js             ← Config global: tema, dark mode, nombre app, banco, WhatsApp
│   │   ├── cartStore.js                  ← Carrito: items por variante (productId+variantId), total, contador
│   │   ├── favoritesStore.js             ← Favoritos del cliente, persistidos solo en localStorage local
│   │   └── guidedStore.js               ← Compra guiada: pasos completados, modo asistencia, conteo pedidos
│   │
│   ├── utils/                            ← Funciones puras
│   │   └── formatters.js                ← formatCurrency (COP), formatDate, formatTime, truncate
│   │
│   ├── layouts/                          ← Layouts con navegación dual
│   │   ├── AdminLayout.jsx              ← Sidebar desktop + NavBottom mobile (5 opciones admin)
│   │   └── ClientLayout.jsx             ← Sidebar desktop + NavBottom mobile + header mobile con carrito
│   │
│   ├── routes/
│   │   └── AppRoutes.jsx               ← Rutas lazy-loaded protegidas por rol (RequireAuth)
│   │
│   ├── assets/                          ← Imágenes y recursos estáticos
│   ├── config/
│   │   └── firebaseConfig.js           ← Inicialización Firebase: db, auth (desde .env.local)
│   ├── constants/
│   │   └── index.js                    ← Constantes: roles, estados, métodos de pago, mensajes guiados
│   ├── schemas/                         ← Esquemas Zod (se crearán en Fase 3)
│   │   ├── inventorySchemas.js         ← Reglas de validación estrictas para productos, variantes y categorías
│   │   ├── orderSchemas.js             ← Validación de datos de envío y pago para checkout
│   │   └── creditSchemas.js            ← Validación de créditos y lógica estricta de abonos positivos
│   ├── types/                           ← Tipos JSDoc (se crearán en Fase 3)
│   └── providers/                       ← Providers globales (QueryProvider incluido en App.jsx)
│
├── .env.local                           ← Variables de entorno Firebase (NUNCA en git)
├── .gitignore
├── firebase.json                        ← Config Firebase Hosting (Fase 10)
├── firestore.rules                      ← Reglas de seguridad Firestore (Fase 9)
├── flujos_aplicacion.md                 ← Memoria operativa de flujos (actualización continua)
├── mapa_arquitectura.md                 ← ESTE ARCHIVO (actualización continua)
├── package.json
└── vite.config.js                       ← Vite + @vitejs/plugin-react + @tailwindcss/vite
```

---

## Responsabilidades por Capa

### `src/components/`
- Componentes **puramente visuales** (sin lógica de negocio, sin llamadas a Firebase directas).
- Reciben datos via **props**.
- Subcarpetas por dominio: `ui/`, `cart/`, `products/`, `orders/`, `credits/`, `forms/`.

### `src/pages/`
- Vistas completas que **ensamblan componentes** y conectan con hooks.
- Cada página es un **lazy import** desde `AppRoutes.jsx`.
- Estructura: `admin/` y `client/` separados.

### `src/hooks/`
- Toda la **lógica de negocio reutilizable**.
- Usan TanStack Query para datos de Firebase.
- Ejemplos futuros: `useProducts`, `useOrders`, `useCredits`, `useAppConfig`.

### `src/services/`
- **ÚNICA** capa que habla con Firebase.
- Funciones puras que reciben parámetros y retornan datos/promesas.
- Ejemplos futuros: `productService.js`, `orderService.js`, `creditService.js`.

### `src/store/`
- Estados globales con **Zustand** (no Redux, no Context excesivo).
- Cada store tiene responsabilidad única.
- Persisten en localStorage solo lo necesario.

### `src/layouts/`
- Navegación dual: sidebar desktop (`hidden md:flex`) + NavBottom mobile (`flex md:hidden`).
- **Exclusión mutua garantizada** (Guía Maestra §3.6).
- Los layouts contienen el `<Outlet />` de React Router.

### `src/constants/`
- **Fuente única de verdad** para todos los valores fijos.
- Textos exactos de la UI (mensajes guiados, textos de confianza).
- Nombres de colecciones Firestore.

---

## Dependencias Instaladas

| Paquete | Versión | Rol |
|---|---|---|
| react | 19.x | Framework UI |
| vite | 6.x | Bundler |
| firebase | 11.x | Auth + Firestore |
| @tanstack/react-query | 5.x | Peticiones con caché |
| zustand | 5.x | Estado global |
| framer-motion | 12.x | Animaciones |
| lucide-react | latest | Íconos |
| zod | 3.x | Validación |
| react-error-boundary | 5.x | Error handling |
| react-router-dom | 7.x | Enrutamiento |
| tailwindcss | 4.x | Estilos (CERO CSS externo) |
| @tailwindcss/vite | 4.x | Plugin Tailwind para Vite |

---

## Reglas del Mapa Vivo

1. **ANTES de crear un nuevo archivo:** verificar que no exista ya en el árbol.
2. **ANTES de modificar un archivo:** leer su descripción de responsabilidades aquí.
3. **DESPUÉS de crear un nuevo archivo:** agregarlo INMEDIATAMENTE a este mapa con su descripción.
4. **NUNCA** duplicar lógica que ya existe en otro archivo.
5. **NUNCA** crear archivos CSS externos (solo Tailwind en JSX).
